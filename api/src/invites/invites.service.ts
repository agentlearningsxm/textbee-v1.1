import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import * as crypto from 'crypto'
import { Invite, InviteDocument } from './schemas/invite.schema'
import { CreateInviteDto } from './dto/create-invite.dto'
import { UserDocument } from '../users/schemas/user.schema'
import { MailService } from '../mail/mail.service'

@Injectable()
export class InvitesService {
  constructor(
    @InjectModel(Invite.name) private inviteModel: Model<InviteDocument>,
    private readonly mailService: MailService,
  ) {}

  /**
   * Generate a cryptographically secure invite code
   */
  private generateInviteCode(): string {
    return crypto.randomBytes(16).toString('hex').toUpperCase()
  }

  /**
   * Create a new invite code (admin only)
   */
  async createInvite(
    dto: CreateInviteDto,
    admin: UserDocument,
  ): Promise<Invite> {
    const { maxUses = 1, expiresInDays = 7, note, email } = dto
    const code = this.generateInviteCode()
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)

    const invite = new this.inviteModel({
      code,
      createdBy: admin._id,
      maxUses,
      expiresAt,
      note,
      email: email || undefined,
    })

    const savedInvite = await invite.save()

    // Send invite email (fire-and-forget — don't block response on SMTP timeout)
    if (email) {
      const frontendUrl = process.env.FRONTEND_URL || 'https://textbee.dev'
      const registerUrl = `${frontendUrl}/register?invite=${code}`

      setImmediate(() => {
        this.mailService
          .sendEmailFromTemplate({
            to: email,
            subject: "You're invited to join TextBee",
            template: 'invite-email',
            context: {
              inviteCode: code,
              registerUrl,
              note: note || '',
              expiresAt: expiresAt.toLocaleDateString(),
            },
          })
          .catch((e) => {
            console.log(`Failed to send invite email to ${email}:`, e?.message)
          })
      })
    }

    return savedInvite
  }

  /**
   * List all invites (admin only)
   */
  async listInvites(params?: {
    limit?: number
    offset?: number
  }): Promise<{ invites: Invite[]; total: number }> {
    const { limit = 50, offset = 0 } = params || {}

    const [invites, total] = await Promise.all([
      this.inviteModel
        .find()
        .populate('createdBy', 'name email')
        .populate('usedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit),
      this.inviteModel.countDocuments(),
    ])

    return { invites, total }
  }

  /**
   * Get invite by ID (admin only)
   */
  async getInviteById(inviteId: string): Promise<Invite> {
    const invite = await this.inviteModel
      .findById(inviteId)
      .populate('createdBy', 'name email')
      .populate('usedBy', 'name email')

    if (!invite) {
      throw new HttpException(
        { error: 'Invite not found' },
        HttpStatus.NOT_FOUND,
      )
    }

    return invite
  }

  /**
   * Revoke an invite code (admin only)
   */
  async revokeInvite(inviteId: string): Promise<void> {
    const invite = await this.inviteModel.findById(inviteId)
    if (!invite) {
      throw new HttpException(
        { error: 'Invite not found' },
        HttpStatus.NOT_FOUND,
      )
    }

    invite.isRevoked = true
    await invite.save()
  }

  /**
   * Delete an invite code (admin only)
   */
  async deleteInvite(inviteId: string): Promise<void> {
    const result = await this.inviteModel.deleteOne({ _id: inviteId })
    if (result.deletedCount === 0) {
      throw new HttpException(
        { error: 'Invite not found' },
        HttpStatus.NOT_FOUND,
      )
    }
  }

  /**
   * Validate and consume an invite code during registration
   * Returns true if valid and consumable
   */
  async validateAndConsumeInvite(
    code: string,
    userId: Types.ObjectId,
  ): Promise<boolean> {
    const invite = await this.inviteModel.findOne({ code: code.toUpperCase() })

    if (!invite) {
      throw new HttpException(
        { error: 'Invalid invite code' },
        HttpStatus.BAD_REQUEST,
      )
    }

    if (invite.isRevoked) {
      throw new HttpException(
        { error: 'This invite code has been revoked' },
        HttpStatus.BAD_REQUEST,
      )
    }

    if (invite.expiresAt < new Date()) {
      throw new HttpException(
        { error: 'This invite code has expired' },
        HttpStatus.BAD_REQUEST,
      )
    }

    if (invite.currentUses >= invite.maxUses) {
      throw new HttpException(
        { error: 'This invite code has reached its maximum uses' },
        HttpStatus.BAD_REQUEST,
      )
    }

    // Consume the invite
    invite.currentUses += 1
    invite.usedBy = userId
    await invite.save()

    return true
  }

  /**
   * Validate an invite code without consuming it (for pre-check)
   */
  async validateInviteCode(code: string): Promise<boolean> {
    const invite = await this.inviteModel.findOne({ code: code.toUpperCase() })

    if (!invite) {
      return false
    }

    if (invite.isRevoked) {
      return false
    }

    if (invite.expiresAt < new Date()) {
      return false
    }

    if (invite.currentUses >= invite.maxUses) {
      return false
    }

    return true
  }

  /**
   * Check if registration requires an invite code
   */
  isInviteOnlyMode(): boolean {
    return process.env.REGISTRATION_MODE === 'invite_only'
  }

  /**
   * Check if registration requires admin approval
   */
  isApprovalRequiredMode(): boolean {
    return process.env.REGISTRATION_MODE === 'approval_required'
  }
}
