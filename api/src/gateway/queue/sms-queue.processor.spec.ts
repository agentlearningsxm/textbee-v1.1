import { SmsQueueProcessor, resolveBatchStatus } from './sms-queue.processor'
import * as firebaseAdmin from 'firebase-admin'

jest.mock('firebase-admin', () => ({
  messaging: jest.fn().mockReturnValue({
    sendEach: jest.fn(),
  }),
}))

describe('resolveBatchStatus', () => {
  it('preserves uncertainty when later paced waves finish', () => {
    expect(resolveBatchStatus({ recipientCount: 2, successCount: 1, failureCount: 0, status: 'unknown' })).toBe('unknown')
  })
  it('keeps a paced batch in processing while waves are still queued', () => {
    expect(
      resolveBatchStatus({ recipientCount: 2000, successCount: 50, failureCount: 0 }),
    ).toBe('processing')
  })

  it('stays in processing while draining even if some pushes failed', () => {
    expect(
      resolveBatchStatus({ recipientCount: 2000, successCount: 45, failureCount: 5 }),
    ).toBe('processing')
  })

  it('completes once every recipient was pushed without failures', () => {
    expect(
      resolveBatchStatus({ recipientCount: 100, successCount: 100, failureCount: 0 }),
    ).toBe('completed')
  })

  it('fails when every push failed', () => {
    expect(
      resolveBatchStatus({ recipientCount: 100, successCount: 0, failureCount: 100 }),
    ).toBe('failed')
  })

  it('is partial_success when finished with mixed results', () => {
    expect(
      resolveBatchStatus({ recipientCount: 100, successCount: 90, failureCount: 10 }),
    ).toBe('partial_success')
  })
})

describe('SmsQueueProcessor.handleSendSms', () => {
  const deviceId = 'device123'
  const userId = 'user123'
  const smsBatchId = 'batch123'
  const originalEnv = { ...process.env }

  const fcmMessages = [
    {
      token: 'fcm-token',
      data: { smsData: JSON.stringify({ smsId: 'sms-1' }) },
    },
  ]

  const mockDeviceModel = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  }
  const mockSmsModel = {
    findOneAndUpdate: jest.fn(),
    updateMany: jest.fn(),
    bulkWrite: jest.fn(),
    find: jest.fn(),
  }
  const mockSmsBatchModel = {
    findByIdAndUpdate: jest.fn(),
  }
  const mockWebhookService = { deliverNotification: jest.fn() }
  const mockUsersService = { markMilestone: jest.fn() }

  let processor: SmsQueueProcessor

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }

    mockDeviceModel.findById.mockReturnValue({
      populate: () => ({
        exec: jest.fn().mockResolvedValue({ _id: deviceId, user: { _id: userId } }),
      }),
    })
    mockDeviceModel.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(true),
    })
    mockSmsBatchModel.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(true),
      recipientCount: 1,
      successCount: 1,
      failureCount: 0,
    })
    mockSmsModel.updateMany.mockResolvedValue({ modifiedCount: 1 })
    mockSmsModel.findOneAndUpdate.mockResolvedValue({ _id: 'sms-1' })
    mockSmsModel.find.mockResolvedValue([])
    mockUsersService.markMilestone.mockResolvedValue(false)

    processor = new SmsQueueProcessor(
      mockDeviceModel as any,
      mockSmsModel as any,
      mockSmsBatchModel as any,
      mockWebhookService as any,
      mockUsersService as any,
    )
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  const job = { id: 1, data: { deviceId, fcmMessages, smsBatchId } } as any

  it('leaves old queued work for a phone that selected poll transport', async () => {
    mockDeviceModel.findById.mockReturnValue({ populate: () => ({ exec: jest.fn().mockResolvedValue({ _id: deviceId, user: { _id: userId }, smsTransport: 'poll', fcmToken: 'historical-token' }) }) })
    expect(await processor.handleSendSms(job)).toEqual({ polling: true })
    expect(firebaseAdmin.messaging().sendEach).not.toHaveBeenCalled()
    expect(mockSmsModel.findOneAndUpdate).not.toHaveBeenCalled()
  })

  it('does not push a message already claimed by polling or an earlier handoff', async () => {
    mockSmsModel.findOneAndUpdate.mockResolvedValue(null)
    expect(await processor.handleSendSms(job)).toEqual({ alreadyClaimed: true })
    expect(firebaseAdmin.messaging().sendEach).not.toHaveBeenCalled()
  })

  it('pushes normally when nothing is listed for skipping', async () => {
    const sendEach = jest
      .spyOn(firebaseAdmin.messaging(), 'sendEach')
      .mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true, messageId: 'fcm-1' }],
      } as any)

    await processor.handleSendSms(job)

    expect(sendEach).toHaveBeenCalledWith(fcmMessages)
    const [writes] = mockSmsModel.bulkWrite.mock.calls[0]
    expect(writes).toEqual([
      {
        updateOne: {
          filter: { _id: 'sms-1', status: 'dispatched' },
          update: {
            $set: {
              status: 'dispatched',
              dispatchedAt: expect.any(Date),
              'metadata.fcmMessageId': 'fcm-1',
            },
          },
        },
      },
    ])
  })

  it('records the failure and its history when the push is rejected', async () => {
    jest.spyOn(firebaseAdmin.messaging(), 'sendEach').mockResolvedValue({
      successCount: 0,
      failureCount: 1,
      responses: [
        {
          success: false,
          error: { code: 'messaging/registration-token-not-registered' },
        },
      ],
    } as any)
    mockSmsModel.find.mockResolvedValue([])

    await processor.handleSendSms(job)

    const [writes] = mockSmsModel.bulkWrite.mock.calls[0]
    expect(writes[0].updateOne.update.$set).toEqual(
      expect.objectContaining({
        status: 'failed',
        errorCode: 'FCM_TOKEN_NOT_REGISTERED',
      }),
    )
    expect(writes[0].updateOne.update).not.toHaveProperty('$inc')
    expect(mockSmsModel.findOneAndUpdate.mock.calls[0][1].$inc).toEqual({ dispatchAttempts: 1 })
    const history = writes[0].updateOne.update.$push['metadata.errorHistory']
    expect(history.$slice).toBe(-5)
    expect(history.$each[0]).toEqual(
      expect.objectContaining({
        code: 'FCM_TOKEN_NOT_REGISTERED',
        source: 'fcm',
      }),
    )
  })

  it('withholds the push for a listed user and marks the message', async () => {
    process.env.FCM_SEND_SKIP_USER_IDS = userId
    const sendEach = jest.spyOn(firebaseAdmin.messaging(), 'sendEach')

    const response = await processor.handleSendSms(job)

    expect(sendEach).not.toHaveBeenCalled()
    expect(response).toMatchObject({ successCount: 1 })
    const [writes] = mockSmsModel.bulkWrite.mock.calls[0]
    // The skip path fakes a message id, so it must not be stored as one
    expect(writes[0].updateOne.update.$set).toEqual({
      status: 'dispatched',
      dispatchedAt: expect.any(Date),
      errorCode: 'FCM_SEND_SKIPPED',
    })
    expect(mockSmsBatchModel.findByIdAndUpdate).toHaveBeenCalledWith(
      smsBatchId,
      { $set: { status: 'completed' } },
    )
  })

  it('does not re-mark messages when persistence fails after the push', async () => {
    jest.spyOn(firebaseAdmin.messaging(), 'sendEach').mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true, messageId: 'fcm-1' }],
    } as any)
    // once: clearAllMocks keeps implementations, so a persistent rejection
    // would leak into the next test
    mockSmsModel.bulkWrite.mockRejectedValueOnce(new Error('write concern'))

    await expect(processor.handleSendSms(job)).rejects.toThrow('write concern')

    // the blanket failure belongs to a failed handoff, not a failed write
    expect(mockSmsModel.updateMany).not.toHaveBeenCalled()
    expect(mockSmsModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.any(Object),
      { $set: { status: 'dispatched', dispatchedAt: expect.any(Date) }, $inc: { dispatchAttempts: 1 } },
      { new: true },
    )
  })

  it('records an uncertain handoff without counting failures, notifying failure, or replaying it', async () => {
    jest.spyOn(firebaseAdmin.messaging(), 'sendEach').mockRejectedValueOnce(new Error('connection lost'))
    await expect(processor.handleSendSms(job)).rejects.toThrow('connection lost')
    expect(mockSmsModel.updateMany).toHaveBeenCalledWith(
      { _id: { $in: ['sms-1'] }, status: 'dispatched' },
      { $set: { status: 'unknown', errorCode: 'FCM_OUTCOME_UNKNOWN' } },
    )
    expect(mockSmsBatchModel.findByIdAndUpdate).toHaveBeenCalledWith(smsBatchId, {
      $set: { status: 'unknown', error: expect.any(String) },
      $inc: { 'metadata.unknownCount': 1 },
    })
    expect(mockWebhookService.deliverNotification).not.toHaveBeenCalled()
    mockSmsModel.findOneAndUpdate.mockResolvedValueOnce(null)
    expect(await processor.handleSendSms(job)).toEqual({ alreadyClaimed: true })
    expect(firebaseAdmin.messaging().sendEach).toHaveBeenCalledTimes(1)
  })

  it('does not overwrite another transport when claims fail', async () => {
    mockSmsModel.findOneAndUpdate.mockRejectedValueOnce(new Error('claim interrupted'))
    await expect(processor.handleSendSms(job)).rejects.toThrow('claim interrupted')
    expect(firebaseAdmin.messaging().sendEach).not.toHaveBeenCalled()
    expect(mockSmsModel.updateMany).not.toHaveBeenCalled()
    expect(mockWebhookService.deliverNotification).not.toHaveBeenCalled()
  })

  it('withholds the push for a listed device', async () => {
    process.env.FCM_SEND_SKIP_DEVICE_IDS = 'other-device,' + deviceId
    const sendEach = jest.spyOn(firebaseAdmin.messaging(), 'sendEach')

    await processor.handleSendSms(job)

    expect(sendEach).not.toHaveBeenCalled()
  })
})
