import { Model } from 'mongoose'
import { Message } from 'firebase-admin/messaging'
import { SMS } from './schemas/sms.schema'

// One atomic claim shared by push and polling, before either side effect.
// ponytail: one DB claim per SMS; use a bulk claim token if measured throughput requires it.
export async function claimFcmMessages(smsModel: Model<SMS>, messages: Message[]): Promise<Message[]> {
  const claimed: Message[] = []
  for (const message of messages) {
    const smsId = String(JSON.parse(message.data.smsData).smsId)
    const sms = await smsModel.findOneAndUpdate(
      { _id: smsId, status: 'pending', dispatchedAt: { $exists: false } } as any,
      { $set: { status: 'dispatched', dispatchedAt: new Date() }, $inc: { dispatchAttempts: 1 } },
      { new: true },
    )
    if (sms) claimed.push(message)
  }
  return claimed
}
