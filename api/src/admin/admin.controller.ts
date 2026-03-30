import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { AdminService } from './admin.service'
import { AdminOnlyGuard } from './guards/admin-only.guard'
import { AuthGuard } from '../auth/guards/auth.guard'
import { UpdateRoleDto } from './dto/update-role.dto'

@Controller('admin')
@UseGuards(AuthGuard, AdminOnlyGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // User Management Endpoints
  @Post('users')
  async createUser(@Body() body: { name: string; email: string; password: string; phone?: string }) {
    const user = await this.adminService.createUser(body)
    return { data: user, message: 'User created successfully' }
  }

  @Get('users')
  async getAllUsers() {
    const users = await this.adminService.getAllUsers()
    return {
      data: users,
      message: 'Users retrieved successfully',
    }
  }

  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    const user = await this.adminService.getUserById(id)
    return {
      data: user,
      message: 'User retrieved successfully',
    }
  }

  @Patch('users/:id/role')
  async updateUserRole(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    const user = await this.adminService.updateUserRole(id, updateRoleDto.role)
    return {
      data: user,
      message: 'User role updated successfully',
    }
  }

  @Patch('users/:id/ban')
  async banUser(@Param('id') id: string) {
    const user = await this.adminService.banUser(id)
    return {
      data: user,
      message: 'User banned successfully',
    }
  }

  @Patch('users/:id/unban')
  async unbanUser(@Param('id') id: string) {
    const user = await this.adminService.unbanUser(id)
    return {
      data: user,
      message: 'User unbanned successfully',
    }
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id') id: string) {
    await this.adminService.deleteUser(id)
  }

  // System Statistics
  @Get('stats')
  async getSystemStats() {
    const stats = await this.adminService.getSystemStats()
    return {
      data: stats,
      message: 'System statistics retrieved successfully',
    }
  }
}
