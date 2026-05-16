import { Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { User } from '../users/schemas/user.schema'
import { Device } from '../gateway/schemas/device.schema'
import { SMS } from '../gateway/schemas/sms.schema'
import { UserRole } from '../users/user-roles.enum'
import * as bcrypt from 'bcryptjs'

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Device.name) private deviceModel: Model<Device>,
    @InjectModel(SMS.name) private smsModel: Model<SMS>,
  ) {}

  // User Management
  async getAllUsers(): Promise<User[]> {
    return this.userModel
      .find()
      .select('-password')
      .sort({ createdAt: -1 })
      .exec()
  }

  async getUserById(userId: string): Promise<User> {
    const user = await this.userModel.findById(userId).select('-password').exec()

    if (!user) {
      throw new NotFoundException('User not found')
    }

    return user
  }

  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    const user = await this.userModel.findById(userId).exec()

    if (!user) {
      throw new NotFoundException('User not found')
    }

    user.role = role
    await user.save()

    return this.userModel.findById(userId).select('-password').exec()
  }

  async banUser(userId: string): Promise<User> {
    const user = await this.userModel.findById(userId).exec()

    if (!user) {
      throw new NotFoundException('User not found')
    }

    if (user.isBanned) {
      throw new HttpException(
        { message: 'User is already banned' },
        HttpStatus.BAD_REQUEST,
      )
    }

    user.isBanned = true
    await user.save()

    return this.userModel.findById(userId).select('-password').exec()
  }

  async unbanUser(userId: string): Promise<User> {
    const user = await this.userModel.findById(userId).exec()

    if (!user) {
      throw new NotFoundException('User not found')
    }

    if (!user.isBanned) {
      throw new HttpException(
        { message: 'User is not banned' },
        HttpStatus.BAD_REQUEST,
      )
    }

    user.isBanned = false
    await user.save()

    return this.userModel.findById(userId).select('-password').exec()
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId).exec()

    if (!user) {
      throw new NotFoundException('User not found')
    }

    // Delete user's devices
    await this.deviceModel.deleteMany({ user: userId }).exec()

    // Delete user's SMS records
    await this.smsModel.deleteMany({ user: userId }).exec()

    // Delete the user
    await this.userModel.findByIdAndDelete(userId).exec()
  }

  async createUser(data: { name: string; email: string; password: string; phone?: string }): Promise<User> {
    const existing = await this.userModel.findOne({ email: data.email }).exec()
    if (existing) {
      throw new HttpException(
        { message: 'A user with this email already exists' },
        HttpStatus.BAD_REQUEST,
      )
    }

    if (!data.password) {
      throw new HttpException(
        { message: 'Password is required' },
        HttpStatus.BAD_REQUEST,
      )
    }

    if (data.password.length < 8) {
      throw new HttpException(
        { message: 'Password must be at least 8 characters' },
        HttpStatus.BAD_REQUEST,
      )
    }
    if (!/[A-Z]/.test(data.password)) {
      throw new HttpException(
        { message: 'Password must contain at least one uppercase letter' },
        HttpStatus.BAD_REQUEST,
      )
    }
    if (!/[0-9]/.test(data.password)) {
      throw new HttpException(
        { message: 'Password must contain at least one number' },
        HttpStatus.BAD_REQUEST,
      )
    }
    if (!/[^A-Za-z0-9]/.test(data.password)) {
      throw new HttpException(
        { message: 'Password must contain at least one special character' },
        HttpStatus.BAD_REQUEST,
      )
    }

    const hashedPassword = await bcrypt.hash(data.password, 10)
    const user = new this.userModel({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      phone: data.phone,
      emailVerified: true,
    })
    await user.save()

    return this.userModel.findById(user._id).select('-password').exec()
  }

  // System Statistics
  async getSystemStats() {
    const [
      totalUsers,
      activeUsers,
      bannedUsers,
      adminUsers,
      totalDevices,
      totalSMSSent,
      totalSMSReceived,
    ] = await Promise.all([
      this.userModel.countDocuments().exec(),
      this.userModel.countDocuments({ isBanned: false }).exec(),
      this.userModel.countDocuments({ isBanned: true }).exec(),
      this.userModel.countDocuments({ role: UserRole.ADMIN }).exec(),
      this.deviceModel.countDocuments().exec(),
      this.smsModel.countDocuments({ type: 'sent' }).exec(),
      this.smsModel.countDocuments({ type: 'received' }).exec(),
    ])

    return {
      totalUsers,
      activeUsers,
      bannedUsers,
      adminUsers,
      totalDevices,
      totalSMSSent,
      totalSMSReceived,
    }
  }
}
