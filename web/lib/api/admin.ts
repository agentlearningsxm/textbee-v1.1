import httpBrowserClient from '@/lib/httpBrowserClient'
import { ApiEndpoints } from '@/config/api'

export interface User {
  _id: string
  email: string
  name: string
  phone?: string
  role: 'ADMIN' | 'REGULAR'
  isBanned: boolean
  createdAt: string
  emailVerified: boolean
}

export interface InviteCode {
  _id: string
  code: string
  createdBy: {
    _id: string
    email: string
    name: string
  }
  usedBy?: {
    _id: string
    email: string
    name: string
  }
  maxUses: number
  currentUses: number
  expiresAt: string
  createdAt: string
  usedAt?: string
}

export interface AdminStats {
  totalUsers: number
  activeUsers: number
  bannedUsers: number
  adminUsers: number
  totalDevices: number
  totalSMSSent: number
  totalSMSReceived: number
}

export interface RegistrationRequest {
  _id: string
  name: string
  email: string
  phone?: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  reviewedBy?: {
    _id: string
    email: string
    name: string
  }
  reviewedAt?: string
}

export const adminApi = {
  // User Management
  async listUsers() {
    const response = await httpBrowserClient.get<{ data: User[] }>(
      ApiEndpoints.admin.users.list()
    )
    return response.data.data
  },

  async getUser(id: string) {
    const response = await httpBrowserClient.get<{ data: User }>(
      ApiEndpoints.admin.users.get(id)
    )
    return response.data.data
  },

  async updateUserRole(id: string, role: 'ADMIN' | 'REGULAR') {
    const response = await httpBrowserClient.patch<{ data: User }>(
      ApiEndpoints.admin.users.updateRole(id),
      { role }
    )
    return response.data.data
  },

  async banUser(id: string) {
    const response = await httpBrowserClient.patch<{ data: User }>(
      ApiEndpoints.admin.users.ban(id)
    )
    return response.data.data
  },

  async unbanUser(id: string) {
    const response = await httpBrowserClient.patch<{ data: User }>(
      ApiEndpoints.admin.users.unban(id)
    )
    return response.data.data
  },

  async deleteUser(id: string) {
    await httpBrowserClient.delete(ApiEndpoints.admin.users.delete(id))
  },

  // Invite Management
  async createInvite(data: { maxUses?: number; expiresInDays?: number; email?: string; note?: string }) {
    const response = await httpBrowserClient.post<{ data: InviteCode }>(
      ApiEndpoints.admin.invites.create(),
      data
    )
    return response.data.data
  },

  async listInvites() {
    const response = await httpBrowserClient.get<{ data: InviteCode[] }>(
      ApiEndpoints.admin.invites.list()
    )
    return response.data.data
  },

  async revokeInvite(id: string) {
    await httpBrowserClient.post(ApiEndpoints.admin.invites.revoke(id))
  },

  // System Stats
  async getStats() {
    const response = await httpBrowserClient.get<{ data: AdminStats }>(
      ApiEndpoints.admin.stats()
    )
    return response.data.data
  },

  // Registration Request Queue
  async listRegistrationRequests(status?: string) {
    const url = status
      ? `${ApiEndpoints.admin.registrationRequests.list()}?status=${status}`
      : ApiEndpoints.admin.registrationRequests.list()
    const response = await httpBrowserClient.get<{ data: RegistrationRequest[] }>(url)
    return response.data.data
  },

  async approveRegistrationRequest(id: string) {
    const response = await httpBrowserClient.post<{ data: RegistrationRequest }>(
      ApiEndpoints.admin.registrationRequests.approve(id)
    )
    return response.data.data
  },

  async rejectRegistrationRequest(id: string) {
    const response = await httpBrowserClient.post<{ data: RegistrationRequest }>(
      ApiEndpoints.admin.registrationRequests.reject(id)
    )
    return response.data.data
  },
}
