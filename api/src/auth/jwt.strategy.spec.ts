import { AuthService } from './auth.service'
import { JwtStrategy } from './jwt.strategy'

describe('JWT-only account gate', () => {
  const gate = { assertApproved: AuthService.prototype.assertApproved }
  const validate = (user: any) => JwtStrategy.prototype.validate.call({
    usersService: { findOne: jest.fn().mockResolvedValue(user) },
    authService: gate,
  }, { sub: 'user' })

  it.each([{ isApproved: false }, { isApproved: true, isBanned: true }])(
    'refuses banned or de-approved accounts (%j)', async (user) => {
      await expect(validate(user)).rejects.toMatchObject({ status: 403 })
    },
  )
  it('preserves approved owner and grandfathered access', async () => {
    const owner = { role: 'ADMIN', isApproved: false }
    const approved = { role: 'REGULAR', isApproved: true }
    await expect(validate(owner)).resolves.toBe(owner)
    await expect(validate(approved)).resolves.toBe(approved)
  })
})
