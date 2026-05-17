'use client'

import { useEffect, useState } from 'react'
import { adminApi, User } from '@/lib/api/admin'
import { Shield, Ban, Trash2, UserCog, Search, RefreshCw, UserPlus, X } from 'lucide-react'

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<'ALL' | 'ADMIN' | 'REGULAR'>('ALL')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'BANNED'>('ALL')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', phone: '' })
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | ''>('')
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await adminApi.listUsers()
      setUsers(data)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load users')
      console.error('Load users error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: 'ADMIN' | 'REGULAR') => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      return
    }

    try {
      await adminApi.updateUserRole(userId, newRole)
      await loadUsers()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update role')
    }
  }

  const handleBanToggle = async (user: User) => {
    const action = user.isBanned ? 'unban' : 'ban'
    if (!confirm(`Are you sure you want to ${action} this user?`)) {
      return
    }

    try {
      if (user.isBanned) {
        await adminApi.unbanUser(user._id)
      } else {
        await adminApi.banUser(user._id)
      }
      await loadUsers()
    } catch (err: any) {
      alert(err?.response?.data?.message || `Failed to ${action} user`)
    }
  }

  const validatePassword = (password: string, confirm: string) => {
    const errors: string[] = []
    let score = 0

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters')
    } else {
      score++
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    } else {
      score++
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number')
    } else {
      score++
    }

    if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
      errors.push('Password must contain at least one special character')
    } else {
      score++
    }

    if (confirm && password !== confirm) {
      errors.push('Passwords do not match')
    }

    const strength = score <= 1 ? 'weak' : score === 2 || score === 3 ? 'medium' : 'strong'

    setPasswordErrors(errors)
    setPasswordStrength(password ? strength : '')
  }

  const handlePasswordChange = (value: string) => {
    setCreateForm({ ...createForm, password: value })
    validatePassword(value, passwordConfirm)
  }

  const handlePasswordConfirmChange = (value: string) => {
    setPasswordConfirm(value)
    validatePassword(createForm.password, value)
  }

  const isPasswordValid = () => {
    return passwordStrength === 'medium' || passwordStrength === 'strong'
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isPasswordValid() || passwordErrors.length > 0) {
      setCreateError('Please fix password issues before submitting')
      return
    }
    setCreateLoading(true)
    setCreateError(null)
    try {
      await adminApi.createUser({
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        phone: createForm.phone || undefined,
      })
      setShowCreateForm(false)
      setCreateForm({ name: '', email: '', password: '', phone: '' })
      setPasswordConfirm('')
      setPasswordStrength('')
      setPasswordErrors([])
      await loadUsers()
    } catch (err: any) {
      setCreateError(err?.response?.data?.message || err?.response?.data?.error || 'Failed to create user')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to DELETE ${userEmail}? This action cannot be undone.`)) {
      return
    }

    const confirmText = prompt('Type "DELETE" to confirm:')
    if (confirmText !== 'DELETE') {
      alert('Deletion cancelled')
      return
    }

    try {
      await adminApi.deleteUser(userId)
      await loadUsers()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete user')
    }
  }

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = filterRole === 'ALL' || user.role === filterRole
    const matchesStatus = filterStatus === 'ALL' ||
                         (filterStatus === 'BANNED' && user.isBanned) ||
                         (filterStatus === 'ACTIVE' && !user.isBanned)
    return matchesSearch && matchesRole && matchesStatus
  })

  if (loading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto'></div>
          <p className='mt-4 text-gray-600 dark:text-gray-400'>Loading users...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6'>
        <p className='text-red-800 dark:text-red-200'>{error}</p>
        <button
          onClick={loadUsers}
          className='mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900/60'
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-gray-900 dark:text-white'>
            User Management
          </h2>
          <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
            {filteredUsers.length} of {users.length} users
          </p>
        </div>
        <div className='flex items-center space-x-3'>
          <button
            type='button'
            onClick={() => { setShowCreateForm(!showCreateForm); setCreateError(null) }}
            className='flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors'
          >
            <UserPlus className='h-4 w-4' />
            <span>Create User</span>
          </button>
          <button
            type='button'
            onClick={loadUsers}
            className='flex items-center space-x-2 px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 transition-colors'
          >
            <RefreshCw className='h-4 w-4' />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <div className='bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 p-6'>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>Create New User</h3>
            <button
              type='button'
              aria-label='Close'
              onClick={() => { setShowCreateForm(false); setCreateError(null) }}
              className='p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
            >
              <X className='h-5 w-5' />
            </button>
          </div>
          {createError && (
            <div className='mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-300'>
              {createError}
            </div>
          )}
          <form onSubmit={handleCreateUser} className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label htmlFor='create-name' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Name *</label>
              <input
                id='create-name'
                type='text'
                required
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500'
              />
            </div>
            <div>
              <label htmlFor='create-email' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Email *</label>
              <input
                id='create-email'
                type='email'
                required
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500'
              />
            </div>
            <div>
              <label htmlFor='create-password' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Password *</label>
              <input
                id='create-password'
                type='password'
                required
                minLength={8}
                value={createForm.password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500'
              />
              {createForm.password && (
                <div className='mt-2'>
                  <div className='flex items-center space-x-2 mb-1'>
                    <div className='flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'>
                      <div
                        className={`h-full transition-all duration-300 ${
                          passwordStrength === 'weak' ? 'w-1/3 bg-red-500' :
                          passwordStrength === 'medium' ? 'w-2/3 bg-yellow-500' :
                          passwordStrength === 'strong' ? 'w-full bg-green-500' :
                          'w-0'
                        }`}
                      />
                    </div>
                    {passwordStrength && (
                      <span className={`text-xs font-medium ${
                        passwordStrength === 'weak' ? 'text-red-600 dark:text-red-400' :
                        passwordStrength === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-green-600 dark:text-green-400'
                      }`}>
                        {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                      </span>
                    )}
                  </div>
                  {passwordErrors.length > 0 && (
                    <ul className='text-xs text-red-600 dark:text-red-400 space-y-1 mt-2'>
                      {passwordErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div>
              <label htmlFor='create-password-confirm' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Confirm Password *</label>
              <input
                id='create-password-confirm'
                type='password'
                required
                value={passwordConfirm}
                onChange={(e) => handlePasswordConfirmChange(e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500'
              />
            </div>
            <div>
              <label htmlFor='create-phone' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Phone (optional)</label>
              <input
                id='create-phone'
                type='tel'
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500'
              />
            </div>
            <div className='md:col-span-2 flex justify-end space-x-3'>
              <button
                type='button'
                onClick={() => { setShowCreateForm(false); setCreateError(null) }}
                className='px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
              >
                Cancel
              </button>
              <button
                type='submit'
                disabled={createLoading || !isPasswordValid() || passwordErrors.length > 0}
                className='flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
              >
                <UserPlus className='h-4 w-4' />
                <span>{createLoading ? 'Creating...' : 'Create User'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className='bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4'>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
          {/* Search */}
          <div className='md:col-span-2'>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
              <input
                type='text'
                placeholder='Search by email or name...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500'
              />
            </div>
          </div>

          {/* Role Filter */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as any)}
            aria-label="Filter by role"
            className='px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500'
          >
            <option value='ALL'>All Roles</option>
            <option value='ADMIN'>Admin Only</option>
            <option value='REGULAR'>Regular Only</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            aria-label="Filter by status"
            className='px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500'
          >
            <option value='ALL'>All Status</option>
            <option value='ACTIVE'>Active Only</option>
            <option value='BANNED'>Banned Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className='bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-700'>
            <thead className='bg-gray-50 dark:bg-gray-900/50'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  User
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  Role
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  Status
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  Registered
                </th>
                <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className='bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700'>
              {filteredUsers.map((user) => (
                <tr key={user._id} className='hover:bg-gray-50 dark:hover:bg-gray-700/50'>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div className='flex items-center'>
                      <div>
                        <div className='text-sm font-medium text-gray-900 dark:text-white'>
                          {user.name || 'N/A'}
                        </div>
                        <div className='text-sm text-gray-500 dark:text-gray-400'>
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user._id, e.target.value as 'ADMIN' | 'REGULAR')}
                      aria-label={`Change role for ${user.email}`}
                      className={`px-3 py-1 text-xs font-medium rounded-full border ${
                        user.role === 'ADMIN'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <option value='REGULAR'>Regular</option>
                      <option value='ADMIN'>Admin</option>
                    </select>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.isBanned
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    }`}>
                      {user.isBanned ? 'Banned' : 'Active'}
                    </span>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400'>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                    <div className='flex items-center justify-end space-x-2'>
                      <button
                        onClick={() => handleBanToggle(user)}
                        aria-label={user.isBanned ? `Unban ${user.email}` : `Ban ${user.email}`}
                        className={`p-2 rounded-md transition-colors ${
                          user.isBanned
                            ? 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30'
                            : 'text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30'
                        }`}
                        title={user.isBanned ? 'Unban user' : 'Ban user'}
                      >
                        <Ban className='h-4 w-4' />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user._id, user.email)}
                        aria-label={`Delete ${user.email}`}
                        className='p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-colors'
                        title='Delete user'
                      >
                        <Trash2 className='h-4 w-4' />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className='text-center py-12'>
            <UserCog className='mx-auto h-12 w-12 text-gray-400' />
            <h3 className='mt-2 text-sm font-medium text-gray-900 dark:text-white'>No users found</h3>
            <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
