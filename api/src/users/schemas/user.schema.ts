import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'
import { UserRole } from '../user-roles.enum'

export type UserDocument = User & Document

@Schema({ timestamps: true })
export class User
{
  _id?: Types.ObjectId

  @Prop({ type: String })
  name: string

  @Prop({ type: String, required: true, unique: true, lowercase: true })
  email: string

  @Prop({ type: String, unique: true, sparse: true })
  googleId?: string

  @Prop({ type: String })
  avatar?: string

  @Prop({ type: String, trim: true })
  phone?: string

  @Prop({ type: String })
  password: string

  @Prop({ type: String, default: UserRole.REGULAR })
  role: string

  @Prop({ type: Date })
  lastLoginAt: Date

  @Prop({ type: Date })
  emailVerifiedAt: Date

  @Prop({ type: Boolean, default: false })
  isBanned: boolean

  // Admin-gated access: an account may sign in only once this is true.
  // Set by admin-create, admin-approval of a request, a valid invite, or the seeded owner.
  // Existing accounts are grandfathered to true on boot (see SeedService).
  @Prop({ type: Boolean, default: false })
  isApproved: boolean

  @Prop({ type: Date })
  accountDeletionRequestedAt: Date

  @Prop({ type: String })
  accountDeletionReason: string

  @Prop({ type: Object })
  meta: Object

  @Prop({
    type: {
      completedAt: { type: Date },
      currentStepId: { type: String, default: 'verify_email' },
      skippedStepIds: { type: [String], default: [] },
    },
    default: () => ({ currentStepId: 'verify_email', skippedStepIds: [] }),
  })
  onboarding?: {
    completedAt?: Date
    currentStepId?: string
    skippedStepIds?: string[]
  }
}

export const UserSchema = SchemaFactory.createForClass(User)
