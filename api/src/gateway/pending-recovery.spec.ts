import { Types } from 'mongoose'
import { createRequire } from 'module'
import {
  MAX_DISPATCH_ATTEMPTS,
  pendingRecoveryFilter,
  toRecoveryPayload,
  selfhostedPendingFilter,
} from './pending-recovery'

describe('pending recovery filter', () => {
  const now = new Date('2026-09-20T12:00:00Z')
  const deviceId = new Types.ObjectId().toHexString()
  const filter = pendingRecoveryFilter(deviceId, now) as any

  it('only looks at outbound messages that are still waiting', () => {
    expect(filter.type).toBe('SENT')
    expect(filter.status).toEqual({ $in: ['pending', 'dispatched', 'unknown'] })
    expect(filter.device).toEqual(new Types.ObjectId(deviceId))
  })

  it('keeps messages requested in the last 72 hours', () => {
    expect(filter.requestedAt.$gte).toEqual(new Date('2026-09-17T12:00:00Z'))
  })

  it('waits 30 minutes after a dispatch before offering it again', () => {
    const [dispatched] = filter.$and
    expect(dispatched.$or[0].dispatchedAt.$lt).toEqual(new Date('2026-09-20T11:30:00Z'))
    expect(dispatched.$or[1].requestedAt.$lt).toEqual(new Date('2026-09-20T11:30:00Z'))
  })

  it('never offers a message scheduled for the future', () => {
    const [, due] = filter.$and
    expect(due.$or[1].dispatchDueAt.$lte).toEqual(now)
  })

  it('caps the number of dispatch attempts', () => {
    const [, , attempts] = filter.$and
    expect(attempts.$or[1].dispatchAttempts.$lt).toBe(MAX_DISPATCH_ATTEMPTS)
  })
})

describe('owner polling compatibility', () => {
  const sift = createRequire(require.resolve('mongoose/package.json'))('sift').default

  it('never exposes pre-upgrade ambiguous unknown history, even after code21 and recovery opt-in', () => {
    const now = new Date('2026-10-01T10:00:00Z')
    const device = new Types.ObjectId()
    const historical = [1, 24, 168, 240].map((hours) => ({
      device, type: 'SENT', status: 'unknown',
      requestedAt: new Date(now.getTime() - hours * 3600000),
      // No dispatch stamp or recovery provenance, matching old ambiguous rows.
    }))
    for (const enabled of [false, true]) {
      expect(historical.filter(sift(selfhostedPendingFilter(String(device), 21, now, enabled)))).toEqual([])
    }
    expect(historical.filter(sift(pendingRecoveryFilter(String(device), now)))).toEqual([])
    const safelyQueued = { ...historical[0], recoverySafeAtQueue: true }
    expect([safelyQueued].filter(sift(selfhostedPendingFilter(String(device), 21, now, false)))).toEqual([])
    expect([safelyQueued].filter(sift(selfhostedPendingFilter(String(device), 21, now, true)))).toEqual([safelyQueued])
  })
  it('never replays a claim to a legacy phone and preserves due scheduling', () => {
    const now = new Date('2026-10-01T10:00:00Z')
    const filter = selfhostedPendingFilter('device', 20, now) as any
    expect(filter.$and[0].$or[1]).toEqual({ dispatchDueAt: { $lte: now } })
    expect(filter.$and[1].$or).toEqual([
      { status: 'pending', dispatchedAt: { $exists: false } },
    ])
  })

  it('allows bounded replay only for the owner build with durable dedupe', () => {
    const now = new Date('2026-10-01T10:00:00Z')
    const filter = selfhostedPendingFilter('device', 21, now, true) as any
    expect(filter.$and[1].$or[1]).toEqual(pendingRecoveryFilter('device', now))
    expect(filter.$and[1].$or[1].recoverySafeAtQueue).toBe(true)
  })

  it('preserves pending-only polling after an upgrade while recovery is disabled', () => {
    const filter = selfhostedPendingFilter('device', 21) as any
    expect(filter.$and[1].$or).toEqual([{ status: 'pending', dispatchedAt: { $exists: false } }])
    const recovery = pendingRecoveryFilter('device') as any
    // Missing or false provenance from old ambiguous history can never match.
    expect(recovery.recoverySafeAtQueue).toBe(true)
  })
})

describe('recovery payload', () => {
  it('matches the push payload shape', () => {
    const id = new Types.ObjectId()
    const batch = new Types.ObjectId()
    expect(
      toRecoveryPayload({ _id: id, smsBatch: batch, message: 'hi', recipient: '+15550100', simSubscriptionId: 2 }),
    ).toEqual({
      smsId: id.toHexString(),
      smsBatchId: batch.toHexString(),
      message: 'hi',
      recipients: ['+15550100'],
      simSubscriptionId: 2,
    })
  })

  it('omits the SIM when the message has none', () => {
    const payload = toRecoveryPayload({ _id: new Types.ObjectId(), message: 'hi', recipient: '+15550100' })
    expect(payload).not.toHaveProperty('simSubscriptionId')
    expect(payload.smsBatchId).toBeUndefined()
  })
})
