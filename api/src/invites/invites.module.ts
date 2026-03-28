import { forwardRef, Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Invite, InviteSchema } from './schemas/invite.schema'
import { InvitesController } from './invites.controller'
import { InvitesService } from './invites.service'
import { AuthModule } from '../auth/auth.module'
import { UsersModule } from '../users/users.module'
import { MailModule } from '../mail/mail.module'

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Invite.name,
        schema: InviteSchema,
      },
    ]),
    forwardRef(() => AuthModule),
    UsersModule,
    MailModule,
  ],
  controllers: [InvitesController],
  providers: [InvitesService],
  exports: [InvitesService],
})
export class InvitesModule {}
