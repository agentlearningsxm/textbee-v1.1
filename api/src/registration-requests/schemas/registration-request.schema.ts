import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'
import { User } from '../../users/schemas/user.schema'

export type RegistrationRequestDocument = RegistrationRequest & Document

export enum RegistrationRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true })
export class RegistrationRequest {
  _id?: Types.ObjectId

  @Prop({ type: String, required: true })
  name: string

  @Prop({ type: String, required: true, lowercase: true })
  email: string

  @Prop({ type: String, required: true })
  password: string

  @Prop({ type: String })
  phone?: string

  @Prop({ type: String, default: RegistrationRequestStatus.PENDING, index: true })
  status: string

  @Prop({ type: Types.ObjectId, ref: User.name })
  reviewedBy?: User | Types.ObjectId

  @Prop({ type: Date })
  reviewedAt?: Date

  @Prop({ type: String })
  rejectionReason?: string
}

export const RegistrationRequestSchema = SchemaFactory.createForClass(RegistrationRequest)
