import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import PlanPicker from './plan-picker'

describe('self-hosted plan step', () => {
  it('continues without selling an upstream plan', () => {
    const onSkip = vi.fn()
    render(<PlanPicker isLoading={false} isSaving={false} onSkip={onSkip} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText(/administrator manages usage limits/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(onSkip).toHaveBeenCalledOnce()
  })

  it('prevents duplicate continuation while saving', () => {
    render(<PlanPicker isLoading={false} isSaving={true} onSkip={() => {}} />)
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
  })

  it('offers no action when the step is complete', () => {
    render(<PlanPicker isLoading={false} isSaving={false} isDone onSkip={() => {}} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
