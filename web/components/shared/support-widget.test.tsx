import { afterEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, userEvent } from '@/test/render'
import SupportWidget from './support-widget'

afterEach(() => vi.unstubAllGlobals())

it('shows both SMS outcomes without inviting a duplicate support request', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false, owner: { outcome: 'unknown' }, visitor: { outcome: 'accepted' } })))
  vi.stubGlobal('fetch', fetchMock)
  const { container } = render(<SupportWidget />)
  await userEvent.click(screen.getByRole('button', { name: 'Contact support' }))
  fireEvent.submit(container.querySelector('form')!)
  expect(await screen.findByText(/Support notification: unknown/)).toHaveTextContent('Confirmation text: accepted')
  expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Contact support' }))
  await userEvent.click(screen.getByRole('button', { name: 'Contact support' }))
  expect(screen.queryByRole('button', { name: 'Send message' })).not.toBeInTheDocument()
  expect(fetchMock).toHaveBeenCalledTimes(1)
})
