import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'
import { User } from '../../users/schemas/user.schema'

export type InviteDocument = Invite & Document

@Schema({ timestamps: true })
export class Invite {
  _id?: Types.ObjectId

  @Prop({ type: String, required: true, unique: true, index: true })
  code: string

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  createdBy: User | Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: User.name })
  usedBy?: User | Types.ObjectId

  @Prop({ type: Number, default: 1 })
  maxUses: number

  @Prop({ type: Number, default: 0 })
  currentUses: number

  @Prop({ type: Date, required: true })
  expiresAt: Date

  @Prop({ type: String })
  note?: string

  @Prop({ type: Boolean, default: false })
  isRevoked: boolean

  @Prop({ type: String })
  email?: string
}

export const InviteSchema = SchemaFactory.createForClass(Invite)
