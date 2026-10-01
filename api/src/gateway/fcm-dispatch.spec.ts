import { claimFcmMessages } from './fcm-dispatch'

describe('shared FCM claim', () => {
  it('hands a message off only once across overlapping push claims', async () => {
    let waiting = true
    const model: any = { findOneAndUpdate: jest.fn(async (filter, update) => {
      expect(filter.dispatchedAt).toEqual({ $exists: false })
      expect(filter.status).toBe('pending')
      expect(update.$inc).toEqual({ dispatchAttempts: 1 })
      if (!waiting) return null
      waiting = false
      return { _id: 'sms' }
    }) }
    const message: any = { data: { smsData: JSON.stringify({ smsId: 'sms' }) } }
    const results = await Promise.all([claimFcmMessages(model, [message]), claimFcmMessages(model, [message])])
    expect(results.flat()).toEqual([message])
  })

  it('does not turn an old UNKNOWN row without a stamp into a new push', async () => {
    const historical = { _id: 'old', status: 'unknown' }
    const model: any = { findOneAndUpdate: jest.fn(async (filter) => historical.status === filter.status ? historical : null) }
    const message: any = { data: { smsData: JSON.stringify({ smsId: 'old' }) } }
    expect(await claimFcmMessages(model, [message])).toEqual([])
    expect(historical).toEqual({ _id: 'old', status: 'unknown' })
  })
})
