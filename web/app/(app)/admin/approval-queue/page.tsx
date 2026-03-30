'use client'

import { useEffect, useState } from 'react'
import { adminApi, RegistrationRequest } from '@/lib/api/admin'
import { CheckCircle, XCircle, Clock, RefreshCw, UserPlus, UserX, Search } from 'lucide-react'

export default function ApprovalQueuePage() {
  const [requests, setRequests] = useState<RegistrationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('pending')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadRequests()
  }, [filter])

  const loadRequests = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await adminApi.listRegistrationRequests(filter || undefined)
      setRequests(data)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load registration requests')
      console.error('Load requests error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string, email: string) => {
    if (!confirm(`Approve registration for ${email}? An account will be created and the user will be notified.`)) {
      return
    }

    try {
      setActionLoading(id)
      await adminApi.approveRegistrationRequest(id)
      await loadRequests()
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to approve request')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (id: string, email: string) => {
    if (!confirm(`Reject registration request for ${email}?`)) {
      return
    }

    try {
      setActionLoading(id)
      await adminApi.rejectRegistrationRequest(id)
      await loadRequests()
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to reject request')
    } finally {
      setActionLoading(null)
    }
  }

  const pendingCount = requests.filter((r) => r.status === 'pending').length

  const filteredRequests = search
    ? requests.filter((r) => {
        const q = search.toLowerCase()
        return (
          r.name?.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q) ||
          r.phone?.toLowerCase().includes(q)
        )
      })
    : requests

  if (loading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto'></div>
          <p className='mt-4 text-gray-600 dark:text-gray-400'>Loading requests...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6'>
        <p className='text-red-800 dark:text-red-200'>{error}</p>
        <button
          onClick={loadRequests}
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
            Registration Requests
          </h2>
          <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
            {pendingCount > 0
              ? `${pendingCount} pending request${pendingCount !== 1 ? 's' : ''}`
              : 'No pending requests'}
          </p>
        </div>
        <button
          onClick={loadRequests}
          className='flex items-center space-x-2 px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 transition-colors'
        >
          <RefreshCw className='h-4 w-4' />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search */}
      <div className='relative'>
        <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
        <input
          type='text'
          placeholder='Search by name, email, or phone...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500'
        />
      </div>

      {/* Filter tabs */}
      <div className='flex space-x-2'>
        {['pending', 'approved', 'rejected', ''].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {status === '' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Requests List */}
      <div className='bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-700'>
            <thead className='bg-gray-50 dark:bg-gray-900/50'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  Name
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  Email
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  Status
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  Requested
                </th>
                <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className='bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700'>
              {filteredRequests.map((request) => (
                <tr
                  key={request._id}
                  className='hover:bg-gray-50 dark:hover:bg-gray-700/50'
                >
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div className='text-sm font-medium text-gray-900 dark:text-white'>
                      {request.name}
                    </div>
                    {request.phone && (
                      <div className='text-xs text-gray-500 dark:text-gray-400'>
                        {request.phone}
                      </div>
                    )}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white'>
                    {request.email}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        request.status === 'pending'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                          : request.status === 'approved'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                      }`}
                    >
                      {request.status}
                    </span>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400'>
                    {new Date(request.createdAt).toLocaleDateString()}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                    {request.status === 'pending' ? (
                      <div className='flex items-center justify-end space-x-2'>
                        <button
                          onClick={() => handleApprove(request._id, request.email)}
                          disabled={actionLoading === request._id}
                          className='flex items-center space-x-1 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50 transition-colors'
                        >
                          <CheckCircle className='h-4 w-4' />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleReject(request._id, request.email)}
                          disabled={actionLoading === request._id}
                          className='flex items-center space-x-1 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors'
                        >
                          <XCircle className='h-4 w-4' />
                          <span>Reject</span>
                        </button>
                      </div>
                    ) : (
                      <span className='text-xs text-gray-500 dark:text-gray-400'>
                        {request.reviewedBy
                          ? `by ${request.reviewedBy.name || request.reviewedBy.email}`
                          : ''}
                        {request.reviewedAt
                          ? ` on ${new Date(request.reviewedAt).toLocaleDateString()}`
                          : ''}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRequests.length === 0 && (
          <div className='text-center py-12'>
            <UserPlus className='mx-auto h-12 w-12 text-gray-400' />
            <h3 className='mt-2 text-sm font-medium text-gray-900 dark:text-white'>
              {search
                ? 'No matching requests'
                : filter === 'pending'
                ? 'No pending requests'
                : `No ${filter || ''} requests`}
            </h3>
            <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
              {search
                ? 'Try a different search term.'
                : filter === 'pending'
                ? 'When users request access, they will appear here.'
                : 'No requests match this filter.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
