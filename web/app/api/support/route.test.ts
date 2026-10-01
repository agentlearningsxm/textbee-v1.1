import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

describe('support SMS outcomes (mocked requests)', () => {
  beforeEach(() => {
    vi.stubEnv('SUPPORT_TEXTBEE_API_KEY', 'test-only-key')
    vi.stubEnv('SUPPORT_TEXTBEE_DEVICE_ID', 'test-only-device')
    vi.stubEnv('SUPPORT_PHONE', '+12025550100')
    vi.stubEnv('API_BASE_URL', 'http://support.invalid/api/v1')
  })
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

  const request = () => new NextRequest('http://localhost/api/support', {
    method: 'POST', body: JSON.stringify({ name: 'Test', phone: '+12025550101', message: 'Help' }),
  })
  const response = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200 })

  it('retains both outcomes when the owner notification fails but confirmation succeeds', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ success: false, successCount: 0, failureCount: 1 }))
      .mockResolvedValueOnce(response({ success: true }))
    vi.stubGlobal('fetch', fetchMock)
    const result = await (await POST(request())).json()
    expect(result).toMatchObject({ ok: false, owner: { outcome: 'failed' }, visitor: { outcome: 'accepted' } })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    for (const [, options] of fetchMock.mock.calls) expect(JSON.parse(options.body).simSubscriptionId).toBe(3)
  })

  it('accepts the support request while accurately reporting an unknown confirmation', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response({ success: true, smsBatchId: 'private-batch' }))
      .mockRejectedValueOnce(new Error('connection lost')))
    const result = await (await POST(request())).json()
    expect(result).toMatchObject({ ok: true, owner: { outcome: 'accepted' }, visitor: { outcome: 'unknown', unknownCount: 1 } })
    expect(JSON.stringify(result)).not.toContain('private-batch')
  })

  it('treats HTTP success without result evidence as unknown', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({})))
    expect(await (await POST(request())).json()).toMatchObject({ ok: false, owner: { outcome: 'unknown' }, visitor: { outcome: 'unknown' } })
  })
})
