import { describe, expect, it, vi } from 'vitest'
import { readSmsSendResult, SmsSendError, submitSmsRequest } from './sms-send-result'

describe('SMS acceptance evidence', () => {
  it.each([
    [{ data: { success: true } }, 2, 'accepted'],
    [{ data: { success: true, recipientCount: 2 } }, 2, 'accepted'],
    [{ data: { successCount: 2, failureCount: 0 } }, 2, 'accepted'],
    [{ data: { success: false } }, 2, 'failed'],
    [{ data: { successCount: 0, failureCount: 2 } }, 2, 'failed'],
    [{ data: { success: true, successCount: 1, failureCount: 1 } }, 2, 'partial'],
    [{ data: { success: false, successCount: 1, unknownCount: 1 } }, 2, 'partial'],
    [{ data: { success: true, successCount: 1 } }, 2, 'partial'],
    [{ data: { success: false, unknownCount: 2 } }, 2, 'unknown'],
    [{ data: { success: true, recipientCount: 1 } }, 2, 'unknown'],
    [{ data: { success: true, successCount: '2' } }, 2, 'unknown'],
    [{ data: {} }, 2, 'unknown'],
    [null, 2, 'unknown'],
  ] as const)('interprets %j for %i recipients as %s', (body, count, outcome) => {
    expect(readSmsSendResult(body, count).outcome).toBe(outcome)
  })

  it('retains partial and unknown counts, batch identity and original evidence', async () => {
    const data = { data: { success: false, successCount: 1, failureCount: 1, unknownCount: 1, smsBatchId: 'batch-test', fcmResponses: [{ successCount: 1 }] } }
    const request = vi.fn().mockResolvedValue({ data })
    const error = await submitSmsRequest(request, 3).catch((error) => error)
    expect(error).toBeInstanceOf(SmsSendError)
    expect(error.result).toEqual({ outcome: 'partial', successCount: 1, failureCount: 1, unknownCount: 1, smsBatchId: 'batch-test' })
    expect(error.evidence).toBe(data)
    expect(error.message).toContain('Check message history')
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('treats a lost response as unknown and never retries it', async () => {
    const request = vi.fn().mockRejectedValue(new Error('connection lost'))
    await expect(submitSmsRequest(request, 2)).rejects.toMatchObject({ result: { outcome: 'unknown', unknownCount: 2 } })
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('preserves pre-send rate-limit errors', async () => {
    const error = { response: { status: 429, data: { message: 'Limit reached' } } }
    await expect(submitSmsRequest(() => Promise.reject(error), 2)).rejects.toBe(error)
  })
})
