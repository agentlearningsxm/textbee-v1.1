import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import * as bcrypt from 'bcryptjs'
import { User } from '../users/schemas/user.schema'
import { UserRole } from '../users/user-roles.enum'

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name)

  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async onApplicationBootstrap() {
    const secret = process.env.SEED_ADMIN_SECRET
    if (!secret) return

    const email = process.env.ADMIN_EMAIL || 'setyworks.sxm@gmail.com'
    this.logger.log(`SEED_ADMIN_SECRET detected — seeding admin user: ${email}`)

    try {
      const existing = await this.userModel.findOne({ email })
      if (existing) {
        const hash = await bcrypt.hash(secret, 10)
        await this.userModel.updateOne({ email }, { $set: { role: UserRole.ADMIN, emailVerifiedAt: new Date(), password: hash } })
        this.logger.log(`Promoted existing user to ADMIN and reset password: ${email}`)
      } else {
        const hash = await bcrypt.hash(secret, 10)
        await this.userModel.create({
          name: 'Reynoso Admin',
          email,
          password: hash,
          role: UserRole.ADMIN,
          emailVerifiedAt: new Date(),
        })
        this.logger.log(`Created admin user: ${email}`)
      }
    } catch (err) {
      this.logger.error(`Seed failed: ${err.message}`)
    }
  }
}
