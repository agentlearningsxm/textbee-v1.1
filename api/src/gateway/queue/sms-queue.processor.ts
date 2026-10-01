import { Process, Processor } from '@nestjs/bull'
import { InjectModel } from '@nestjs/mongoose'
import { Job } from 'bull'
import { Model } from 'mongoose'
import * as firebaseAdmin from 'firebase-admin'
import { Device } from '../schemas/device.schema'
import { SMS } from '../schemas/sms.schema'
import { SMSBatch } from '../schemas/sms-batch.schema'
import { UsersService } from '../../users/users.service'
import { WebhookService } from 'src/webhook/webhook.service'
import { WebhookEvent } from 'src/webhook/webhook-event.enum'
import { Logger } from '@nestjs/common'
import {
  FCM_SEND_SKIPPED_ERROR_CODE,
  shouldSkipFcmSend,
  skippedBatchResponse,
} from '../fcm-send-skip'
import { errorHistoryPush } from '../error-history'
import { claimFcmMessages } from '../fcm-dispatch'

function getFcmErrorCode(error: { code?: string; message?: string } | null): string {
  if (!error?.code) return 'FCM_DELIVERY_FAILED'
  const code = String(error.code).toLowerCase().replace(/^messaging\//, '')
  if (
    code === 'registration-token-not-registered' ||
    code === 'unregistered'
  ) {
    return 'FCM_TOKEN_NOT_REGISTERED'
  }
  if (
    code === 'invalid-registration-token' ||
    code === 'invalid-argument'
  ) {
    return 'FCM_INVALID_REGISTRATION_TOKEN'
  }
  if (code === 'mismatched-credential') {
    return 'FCM_PROJECT_MISMATCH'
  }
  return `FCM_DELIVERY_FAILED_${error.code}`
}

const FCM_ACTIONABLE_MESSAGE =
  'The device token is invalid. Please open the textbee mobile app, click on the update button to resync and try again.'

function getFcmErrorMessage(error: { code?: string; message?: string } | null | undefined): string {
  const rawPart = `FCM_DELIVERY_FAILED: ${error?.message || 'FCM delivery failed'}`
  return `${rawPart}. ${FCM_ACTIONABLE_MESSAGE}`
}

// A paced batch is still 'processing' until every wave has been handed to FCM
export function resolveBatchStatus(batch: {
  recipientCount: number
  successCount: number
  failureCount: number
  status?: string
}): 'processing' | 'completed' | 'partial_success' | 'failed' | 'unknown' {
  if (batch.status === 'unknown') return 'unknown'
  const attempted = batch.successCount + batch.failureCount
  if (attempted < batch.recipientCount) {
    return 'processing'
  }
  if (batch.failureCount === 0) return 'completed'
  if (batch.successCount === 0) return 'failed'
  return 'partial_success'
}

@Processor('sms')
export class SmsQueueProcessor {
  private readonly logger = new Logger(SmsQueueProcessor.name)

  constructor(
    @InjectModel(Device.name) private deviceModel: Model<Device>,
    @InjectModel(SMS.name) private smsModel: Model<SMS>,
    @InjectModel(SMSBatch.name) private smsBatchModel: Model<SMSBatch>,
    private webhookService: WebhookService,
    private usersService: UsersService,
  ) {}

  @Process({
    name: 'send-sms',
    concurrency: 10,
  })
  async handleSendSms(job: Job<any>) {
    // this.logger.debug(`Processing send-sms job ${job.id}`)
    const { deviceId, smsBatchId } = job.data
    let fcmMessages = job.data.fcmMessages
    let pushHandedOff = false
    let pushAttempted = false

    const device = await this.deviceModel
      .findById(deviceId)
      .populate('user')
      .exec()
    if (!device?.user) {
      this.logger.warn(
        `Device or user not found for deviceId ${deviceId}, webhooks will be skipped`,
      )
    }
    // Work enqueued before a legacy phone selected polling stays available to
    // that phone. Its historical token must not reactivate a second transport.
    if (device?.smsTransport === 'poll') return { polling: true }

    try {
      const skipped = shouldSkipFcmSend(device?.user, deviceId)
      fcmMessages = await claimFcmMessages(this.smsModel, fcmMessages)
      if (!fcmMessages.length) return { alreadyClaimed: true }
      pushAttempted = true
      const response = skipped
        ? skippedBatchResponse(fcmMessages.length)
        : await firebaseAdmin.messaging().sendEach(fcmMessages)
      // The push is done. Anything that throws from here on is a persistence
      // problem, and must not mark handed-off messages as failed a second time.
      pushHandedOff = true

      // this.logger.debug(
      //   `SMS Job ${job.id}( smsBatchId: ${smsBatchId}) completed, success: ${response.successCount}, failures: ${response.failureCount}`,
      // )

      // Mark individual SMS records as failed when their FCM push failed
      const failedSmsIds: string[] = []
      const failedUpdates: Array<{
        smsId: string
        errorCode: string
        errorMessage: string
      }> = []
      for (let i = 0; i < response.responses.length; i++) {
        if (!response.responses[i].success) {
          try {
            const smsData = JSON.parse(fcmMessages[i].data.smsData)
            const fcmError = response.responses[i].error
            failedSmsIds.push(String(smsData.smsId))
            failedUpdates.push({
              smsId: String(smsData.smsId),
              errorCode: getFcmErrorCode(fcmError ?? undefined),
              errorMessage: getFcmErrorMessage(fcmError ?? undefined),
            })
          } catch (parseError) {
            this.logger.error(
              `Failed to mark SMS as failed for FCM message index ${i}`,
              parseError,
            )
          }
        }
      }

      // Mark individual SMS records as dispatched when FCM push succeeded
      const now = new Date()
      const dispatchedSmsIds: string[] = []
      const dispatchedUpdates: Array<{
        smsId: string
        fcmMessageId?: string
      }> = []
      for (let i = 0; i < response.responses.length; i++) {
        if (response.responses[i].success) {
          try {
            const smsData = JSON.parse(fcmMessages[i].data.smsData)
            const messageId = response.responses[i].messageId
            dispatchedSmsIds.push(String(smsData.smsId))
            dispatchedUpdates.push({
              smsId: String(smsData.smsId),
              // The skip path fakes a response, so its sentinel is not an id
              ...(messageId &&
                messageId !== FCM_SEND_SKIPPED_ERROR_CODE && {
                  fcmMessageId: messageId,
                }),
            })
          } catch (parseError) {
            this.logger.error(
              `Failed to mark SMS as dispatched for FCM message index ${i}`,
              parseError,
            )
          }
        }
      }

      // One write per message: each row carries its own FCM message id and
      // its own failure entry
      const failedAt = new Date()
      const writes = [
        ...failedUpdates.map((failedUpdate) => ({
          updateOne: {
            filter: { _id: failedUpdate.smsId as any, status: 'dispatched' },
            update: {
              $set: {
                status: 'failed',
                failedAt,
                errorCode: failedUpdate.errorCode,
                errorMessage: failedUpdate.errorMessage,
              },
              ...(errorHistoryPush(
                {
                  code: failedUpdate.errorCode,
                  message: failedUpdate.errorMessage,
                  source: 'fcm',
                },
                failedAt,
              ) ?? {}),
            },
          },
        })),
        ...dispatchedUpdates.map((dispatchedUpdate) => ({
          updateOne: {
            filter: { _id: dispatchedUpdate.smsId as any, status: 'dispatched' },
            update: {
              $set: {
                status: 'dispatched',
                dispatchedAt: now,
                ...(skipped && { errorCode: FCM_SEND_SKIPPED_ERROR_CODE }),
                ...(dispatchedUpdate.fcmMessageId && {
                  'metadata.fcmMessageId': dispatchedUpdate.fcmMessageId,
                }),
              },
            },
          },
        })),
      ]

      if (writes.length > 0) {
        await this.smsModel.bulkWrite(writes as any, { ordered: false })
      }

      if (device?.user && failedSmsIds.length > 0) {
        const failedSmsDocuments = await this.smsModel.find({
          _id: { $in: failedSmsIds },
        })
        for (const failedSms of failedSmsDocuments) {
          await this.webhookService
            .deliverNotification({
              sms: failedSms,
              user: device.user as any,
              event: WebhookEvent.MESSAGE_FAILED,
            })
            .catch((e) =>
              this.logger.warn(
                `Webhook delivery failed for SMS ${failedSms._id}`,
                e?.message,
              ),
            )
        }
      }

      // Update device SMS count
      await this.deviceModel
        .findByIdAndUpdate(deviceId, {
          $inc: { sentSMSCount: response.successCount },
        })
        .exec()

      // device was loaded before the increment, so zero means this job carried
      // the account's first message.
      if (device?.user && device.sentSMSCount === 0 && response.successCount > 0) {
        this.usersService
          .markMilestone((device.user as any)?._id ?? device.user, 'firstSmsAt')
          .catch(() => undefined)
      }

      // Update batch status
      const smsBatch = await this.smsBatchModel.findByIdAndUpdate(
        smsBatchId,
        {
          $inc: {
            successCount: response.successCount,
            failureCount: response.failureCount,
          },
        },
        { returnDocument: 'after' },
      )

      // The batch may have been deleted mid-flight
      if (smsBatch) {
        await this.smsBatchModel.findByIdAndUpdate(smsBatchId, {
          $set: { status: resolveBatchStatus(smsBatch) },
        })
      }

      return response
    } catch (error) {
      this.logger.error(`Failed to process SMS job ${job.id}`, error)

      // A sendEach exception cannot prove rejection. Only claimed messages
      // belong to this attempt; a claim failure must not touch another worker.
      if (pushHandedOff || !pushAttempted) throw error
      const ids = fcmMessages.map((message) => String(JSON.parse(message.data.smsData).smsId))
      await this.smsModel.updateMany(
        { _id: { $in: ids } as any, status: 'dispatched' },
        { $set: { status: 'unknown', errorCode: 'FCM_OUTCOME_UNKNOWN' } },
      )
      await this.smsBatchModel.findByIdAndUpdate(smsBatchId, {
        $set: { status: 'unknown', error: 'Push outcome unknown. Check message status before retrying.' },
        $inc: { 'metadata.unknownCount': ids.length },
      })
      throw error
    }
  }
}
