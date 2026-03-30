import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import {
  RegistrationRequest,
  RegistrationRequestDocument,
  RegistrationRequestStatus,
} from './schemas/registration-request.schema'
import { UsersService } from '../users/users.service'
import { MailService } from '../mail/mail.service'
import * as bcrypt from 'bcryptjs'

@Injectable()
export class RegistrationRequestsService {
  constructor(
    @InjectModel(RegistrationRequest.name)
    private registrationRequestModel: Model<RegistrationRequestDocument>,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Submit a new access request (public endpoint)
   */
  async submitRequest(data: {
    name: string
    email: string
    password: string
    phone?: string
  }): Promise<{ message: string }> {
    const { name, email, password, phone } = data

    // Validate email
    const emailRegex = /\S+@\S+\.\S+/
    if (!emailRegex.test(email)) {
      throw new HttpException(
        { error: 'Invalid email address' },
        HttpStatus.BAD_REQUEST,
      )
    }

    // Validate password
    if (password.length < 6 || password.length > 128) {
      throw new HttpException(
        { error: 'Password must be between 6 and 128 characters' },
        HttpStatus.BAD_REQUEST,
      )
    }

    // Check if user already exists
    const existingUser = await this.usersService.findOne({ email })
    if (existingUser) {
      throw new HttpException(
        { error: 'An account with this email already exists. Please log in instead.' },
        HttpStatus.BAD_REQUEST,
      )
    }

    // Check if there's already a pending request for this email
    const existingRequest = await this.registrationRequestModel.findOne({
      email,
      status: RegistrationRequestStatus.PENDING,
    })
    if (existingRequest) {
      throw new HttpException(
        { error: 'A pending request for this email already exists. Please wait for admin approval.' },
        HttpStatus.BAD_REQUEST,
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create the request
    const request = new this.registrationRequestModel({
      name,
      email,
      password: hashedPassword,
      phone,
      status: RegistrationRequestStatus.PENDING,
    })

    await request.save()

    // Send confirmation email to user
    this.mailService
      .sendEmailFromTemplate({
        to: email,
        subject: 'TextBee - Access Request Received',
        template: 'access-request-received',
        context: { name },
      })
      .catch((e) => {
        console.log(`Failed to send request confirmation email to ${email}:`, e?.message)
      })

    return {
      message:
        'Your access request has been submitted. An administrator will review it shortly.',
    }
  }

  /**
   * List registration requests (admin only)
   */
  async listRequests(params?: {
    status?: string
    limit?: number
    offset?: number
  }): Promise<{ requests: RegistrationRequest[]; total: number }> {
    const { status, limit = 50, offset = 0 } = params || {}
    const filter: any = {}
    if (status) {
      filter.status = status
    }

    const [requests, total] = await Promise.all([
      this.registrationRequestModel
        .find(filter)
        .populate('reviewedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit),
      this.registrationRequestModel.countDocuments(filter),
    ])

    return { requests, total }
  }

  /**
   * Approve a registration request (admin only)
   */
  async approveRequest(
    requestId: string,
    admin: any,
  ): Promise<RegistrationRequest> {
    const request = await this.registrationRequestModel.findById(requestId)
    if (!request) {
      throw new HttpException(
        { error: 'Registration request not found' },
        HttpStatus.NOT_FOUND,
      )
    }

    if (request.status !== RegistrationRequestStatus.PENDING) {
      throw new HttpException(
        { error: `Request has already been ${request.status}` },
        HttpStatus.BAD_REQUEST,
      )
    }

    // Check if user was created in the meantime
    const existingUser = await this.usersService.findOne({ email: request.email })
    if (existingUser) {
      // Mark as approved but note user already exists
      request.status = RegistrationRequestStatus.APPROVED
      request.reviewedBy = admin._id
      request.reviewedAt = new Date()
      await request.save()
      return request
    }

    // Create the user account
    await this.usersService.create({
      name: request.name,
      email: request.email,
      password: request.password,
      phone: request.phone,
    })

    // Update the request status
    request.status = RegistrationRequestStatus.APPROVED
    request.reviewedBy = admin._id
    request.reviewedAt = new Date()
    await request.save()

    // Send approval email
    const frontendUrl = process.env.FRONTEND_URL || 'https://textbee.dev'
    this.mailService
      .sendEmailFromTemplate({
        to: request.email,
        subject: 'TextBee - Your Access Has Been Approved!',
        template: 'access-approved',
        context: {
          name: request.name,
          loginUrl: `${frontendUrl}/login`,
        },
      })
      .catch((e) => {
        console.log(`Failed to send approval email to ${request.email}:`, e?.message)
      })

    return request
  }

  /**
   * Reject a registration request (admin only)
   */
  async rejectRequest(
    requestId: string,
    admin: any,
    reason?: string,
  ): Promise<RegistrationRequest> {
    const request = await this.registrationRequestModel.findById(requestId)
    if (!request) {
      throw new HttpException(
        { error: 'Registration request not found' },
        HttpStatus.NOT_FOUND,
      )
    }

    if (request.status !== RegistrationRequestStatus.PENDING) {
      throw new HttpException(
        { error: `Request has already been ${request.status}` },
        HttpStatus.BAD_REQUEST,
      )
    }

    request.status = RegistrationRequestStatus.REJECTED
    request.reviewedBy = admin._id
    request.reviewedAt = new Date()
    if (reason) {
      request.rejectionReason = reason
    }
    await request.save()

    return request
  }

  async getPendingCount(): Promise<number> {
    return this.registrationRequestModel.countDocuments({ status: 'pending' })
  }
}
