import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import {
  RegistrationRequest,
  RegistrationRequestSchema,
} from './schemas/registration-request.schema'
import { RegistrationRequestsController } from './registration-requests.controller'
import { RegistrationRequestsService } from './registration-requests.service'
import { UsersModule } from '../users/users.module'
import { MailModule } from '../mail/mail.module'
import { AuthModule } from '../auth/auth.module'
import { AdminOnlyGuard } from '../admin/guards/admin-only.guard'

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: RegistrationRequest.name,
        schema: RegistrationRequestSchema,
      },
    ]),
    UsersModule,
    MailModule,
    AuthModule,
  ],
  controllers: [RegistrationRequestsController],
  providers: [RegistrationRequestsService, AdminOnlyGuard],
  exports: [RegistrationRequestsService],
})
export class RegistrationRequestsModule {}
