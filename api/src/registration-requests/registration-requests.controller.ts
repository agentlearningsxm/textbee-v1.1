import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '../auth/guards/auth.guard'
import { AdminOnlyGuard } from '../admin/guards/admin-only.guard'
import { RegistrationRequestsService } from './registration-requests.service'

@ApiTags('registration-requests')
@Controller()
export class RegistrationRequestsController {
  constructor(
    private readonly registrationRequestsService: RegistrationRequestsService,
  ) {}

  // Public endpoint - submit a request
  @ApiOperation({ summary: 'Request access to TextBee (public)' })
  @Post('auth/request-access')
  @HttpCode(HttpStatus.CREATED)
  async submitRequest(
    @Body() body: { name: string; email: string; password: string; phone?: string },
  ) {
    const result = await this.registrationRequestsService.submitRequest(body)
    return { data: result }
  }

  // Admin endpoints
  @ApiTags('admin')
  @ApiOperation({ summary: 'List all registration requests (Admin only)' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'rejected'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @Get('admin/registration-requests')
  @UseGuards(AuthGuard, AdminOnlyGuard)
  @ApiBearerAuth()
  async listRequests(
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const result = await this.registrationRequestsService.listRequests({
      status,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    })
    return { data: result.requests, total: result.total }
  }

  @ApiTags('admin')
  @ApiOperation({ summary: 'Get pending registration request count (Admin only)' })
  @Get('admin/registration-requests/pending-count')
  @UseGuards(AuthGuard, AdminOnlyGuard)
  @ApiBearerAuth()
  async getPendingCount() {
    const count = await this.registrationRequestsService.getPendingCount()
    return { data: { count } }
  }

  @ApiTags('admin')
  @ApiOperation({ summary: 'Approve a registration request (Admin only)' })
  @Post('admin/registration-requests/:id/approve')
  @UseGuards(AuthGuard, AdminOnlyGuard)
  @ApiBearerAuth()
  async approveRequest(@Param('id') id: string, @Request() req) {
    const request = await this.registrationRequestsService.approveRequest(id, req.user)
    return { data: request, message: 'Registration request approved' }
  }

  @ApiTags('admin')
  @ApiOperation({ summary: 'Reject a registration request (Admin only)' })
  @Post('admin/registration-requests/:id/reject')
  @UseGuards(AuthGuard, AdminOnlyGuard)
  @ApiBearerAuth()
  async rejectRequest(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Request() req,
  ) {
    const request = await this.registrationRequestsService.rejectRequest(
      id,
      req.user,
      body?.reason,
    )
    return { data: request, message: 'Registration request rejected' }
  }
}
