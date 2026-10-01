import { expect, it, vi } from 'vitest'
import CheckoutPage from './page'

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect }))

it('returns self-hosted checkout routes to local limits', () => {
  CheckoutPage()
  expect(redirect).toHaveBeenCalledWith('/dashboard/account/billing')
})
