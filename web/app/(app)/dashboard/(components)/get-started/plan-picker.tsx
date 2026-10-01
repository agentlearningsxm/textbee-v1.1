'use client'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

type PlanPickerProps = {
  isLoading: boolean
  isSaving: boolean
  isDone?: boolean
  onSkip: () => void
}

export default function PlanPicker({ isLoading, isSaving, isDone = false, onSkip }: PlanPickerProps) {
  if (isLoading) return <Skeleton className='h-24 w-full rounded-lg' />

  return (
    <div className='space-y-3'>
      <p className='text-sm text-muted-foreground'>
        This instance is self-hosted. Your administrator manages usage limits.
      </p>
      {!isDone && (
        <Button disabled={isSaving} onClick={onSkip}>Continue</Button>
      )}
    </div>
  )
}
