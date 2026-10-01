import { describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { QueryClient } from '@tanstack/react-query'
import { server } from '@/test/msw/server'
import { TestProviders } from '@/test/render'
import { API_BASE_URL } from '@/test/fixtures'
import { useSendSms } from './hooks'
import { queryKeys } from './query-keys'
import { useBulkSend } from '@/app/(app)/dashboard/(components)/bulk-send/use-bulk-send'

describe('SMS mutations do not convert HTTP success into send success', () => {
  it.each(['single', 'bulk'] as const)('retains the %s result and refreshes history after uncertainty', async (kind) => {
    let requests = 0
    const endpoint = kind === 'single' ? 'send-sms' : 'send-bulk-sms'
    server.use(http.post(`${API_BASE_URL}/gateway/${endpoint}`, () => {
      requests++
      return HttpResponse.json({ data: { success: false, smsBatchId: 'batch-test', unknownCount: 1 } })
    }))
    // Explicit hook retry:false overrides even an application retry default.
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: 2, retryDelay: 0 } } })
    client.setQueryData(queryKeys.deviceMessages('all', { type: 'all', page: 1, limit: 20 }), { data: [] })
    const wrapper = ({ children }: { children: React.ReactNode }) => <TestProviders queryClient={client}>{children}</TestProviders>
    const { result } = renderHook(() => kind === 'single' ? useSendSms() : useBulkSend(), { wrapper })
    act(() => {
      if ('mutate' in result.current) result.current.mutate({ deviceId: 'device-1', recipients: ['+12025550100'], message: 'test' })
      else result.current.sendBulk()
    })
    await waitFor(() => {
      const error = 'error' in result.current ? result.current.error : result.current.sendError
      expect(error).toMatchObject({ result: { outcome: 'unknown', smsBatchId: 'batch-test', unknownCount: 1 } })
    })
    expect(result.current.isSuccess).toBe(false)
    expect(requests).toBe(1)
    expect(client.getQueryState(queryKeys.deviceMessages('all', { type: 'all', page: 1, limit: 20 }))?.isInvalidated).toBe(true)
    client.clear()
  })
})
