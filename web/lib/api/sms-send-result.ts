export type SmsSendOutcome = 'accepted' | 'failed' | 'partial' | 'unknown'

export type SmsSendResult = {
  outcome: SmsSendOutcome
  successCount?: number
  failureCount?: number
  unknownCount?: number
  smsBatchId?: string
}

// Queue/poll responses use success; direct FCM responses only carry counts.
// Acceptance is not handset delivery. Missing recipients remain unknown.
export function readSmsSendResult(body: unknown, recipientCount: number): SmsSendResult {
  const envelope = body as { data?: unknown } | null
  const data = (envelope?.data ?? body) as Record<string, unknown> | null
  const count = (value: unknown) =>
    typeof value === 'number' && Number.isInteger(value) && value >= 0
      ? value
      : undefined
  const successCount = count(data?.successCount)
  const failureCount = count(data?.failureCount)
  const reportedUnknown = count(data?.unknownCount)
  const hasCounts = data != null && ['successCount', 'failureCount', 'unknownCount'].some((key) => key in Object(data))
  const unknownCount = hasCounts
    ? Math.max(reportedUnknown ?? 0, recipientCount - (successCount ?? 0) - (failureCount ?? 0))
    : undefined
  const validCounts = !hasCounts || ['successCount', 'failureCount', 'unknownCount'].every((key) => data?.[key] === undefined || count(data?.[key]) !== undefined)
  const validRecipientCount = data?.recipientCount === undefined || data.recipientCount === recipientCount
  const accepted = validCounts && validRecipientCount && data?.success !== false && (
    hasCounts
      ? successCount === recipientCount && !failureCount && !unknownCount
      : data?.success === true
  )
  const outcome: SmsSendOutcome = accepted
    ? 'accepted'
    : (successCount ?? 0) > 0
      ? 'partial'
      : validCounts && validRecipientCount && !unknownCount && (data?.success === false || failureCount === recipientCount)
        ? 'failed'
        : 'unknown'
  return {
    outcome,
    successCount,
    failureCount,
    unknownCount,
    ...(typeof data?.smsBatchId === 'string' && { smsBatchId: data.smsBatchId }),
  }
}

export class SmsSendError extends Error {
  constructor(public readonly result: SmsSendResult, public readonly evidence?: unknown) {
    const counts = result.successCount !== undefined || result.failureCount !== undefined || result.unknownCount !== undefined
      ? ` Accepted: ${result.successCount ?? 0}; failed: ${result.failureCount ?? 0}; unknown: ${result.unknownCount ?? 0}.`
      : ''
    const batch = result.smsBatchId ? ` Batch: ${result.smsBatchId}.` : ''
    super(`SMS request ${result.outcome}.${counts}${batch} Check message history before sending again to avoid duplicates.`)
    this.name = 'SmsSendError'
  }
}

export async function submitSmsRequest<T extends { data: unknown }>(
  request: () => Promise<T>,
  recipientCount: number
): Promise<T> {
  let response: T
  try {
    response = await request()
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status
    // A lost response or server error can follow persistence or dispatch.
    if (!status || status >= 500) {
      throw new SmsSendError({ outcome: 'unknown', unknownCount: recipientCount }, error)
    }
    throw error
  }
  const result = readSmsSendResult(response.data, recipientCount)
  if (result.outcome !== 'accepted') throw new SmsSendError(result, response.data)
  return response
}
