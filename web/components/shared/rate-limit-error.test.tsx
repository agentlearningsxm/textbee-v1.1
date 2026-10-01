import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RateLimitError, formatRateLimitMessageForToast } from './rate-limit-error'

describe('self-hosted quota guidance', () => {
  for (const variant of ['alert', 'inline'] as const) {
    it(`keeps ${variant} errors without a purchase link`, () => {
      render(<RateLimitError variant={variant} />)
      expect(screen.getByText('You have reached your usage limit.')).toBeInTheDocument()
      expect(screen.getByText(/Contact your administrator/)).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /upgrade/i })).not.toBeInTheDocument()
    })
  }
  it('does not recommend purchasing in toast messages', () => {
    expect(formatRateLimitMessageForToast()).toContain('Contact your administrator')
    expect(formatRateLimitMessageForToast()).not.toMatch(/upgrade/i)
  })
})
