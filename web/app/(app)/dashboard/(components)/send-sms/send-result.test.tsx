import { expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/render'
import { server } from '@/test/msw/server'
import { API_BASE_URL } from '@/test/fixtures'
import SendSms from './index'

it('keeps an uncertain request visible and blocks sending it again', async () => {
  let requests = 0
  server.use(http.post(`${API_BASE_URL}/gateway/send-sms`, () => {
    requests++
    return HttpResponse.json({ data: { success: false, unknownCount: 1, smsBatchId: 'batch-test' } })
  }))
  renderWithProviders(<SendSms />)
  const button = screen.getByRole('button', { name: 'Send message' })
  await waitFor(() => expect(button).toBeEnabled())
  await userEvent.type(screen.getByLabelText('To'), '+12025550100{Enter}')
  await userEvent.type(screen.getByLabelText('Message'), 'Keep this evidence')
  await userEvent.click(button)
  expect(await screen.findByText(/SMS request unknown/)).toHaveTextContent('Batch: batch-test')
  expect(button).toBeDisabled()
  expect(screen.getByLabelText('Message')).toHaveValue('Keep this evidence')
  expect(screen.queryByText('Message accepted')).not.toBeInTheDocument()
  await userEvent.click(button)
  expect(requests).toBe(1)
  await userEvent.click(screen.getByRole('button', { name: 'Start new message' }))
  expect(screen.getByLabelText('Message')).toHaveValue('')
  expect(button).toBeEnabled()
})
