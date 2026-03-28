import { ApiProperty } from '@nestjs/swagger'

export class CreateInviteDto {
  @ApiProperty({ type: Number, required: false, default: 1, description: 'Maximum number of times this invite can be used' })
  maxUses?: number

  @ApiProperty({ type: Number, required: false, default: 7, description: 'Number of days until the invite expires' })
  expiresInDays?: number

  @ApiProperty({ type: String, required: false, description: 'Optional note for admin reference' })
  note?: string

  @ApiProperty({ type: String, required: false, description: 'Email address to send the invite code to' })
  email?: string
}
