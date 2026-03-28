'use client'

import { useEffect, useState } from 'react'
import { adminApi, InviteCode } from '@/lib/api/admin'
import { Mail, Copy, Trash2, CheckCircle, XCircle, Clock, RefreshCw, Send } from 'lucide-react'

export default function InvitesPage() {
  const [invites, setInvites] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form state
  const [maxUses, setMaxUses] = useState(1)
  const [expiryDays, setExpiryDays] = useState(30)
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    loadInvites()
  }, [])

  const loadInvites = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await adminApi.listInvites()
      setInvites(data)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load invite codes')
      console.error('Load invites error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateInvite = async () => {
    try {
      setCreating(true)
      setSuccessMessage(null)

      const payload: any = { maxUses, expiresInDays: expiryDays }
      if (email.trim()) payload.email = email.trim()
      if (note.trim()) payload.note = note.trim()

      await adminApi.createInvite(payload)

      const msg = email.trim()
        ? `Invite code created and sent to ${email.trim()}`
        : 'Invite code created successfully'
      setSuccessMessage(msg)

      await loadInvites()
      setMaxUses(1)
      setExpiryDays(30)
      setEmail('')
      setNote('')

      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create invite code')
    } finally {
      setCreating(false)
    }
  }

  const handleRevokeInvite = async (inviteId: string, code: string) => {
    if (!confirm(`Are you sure you want to revoke invite code "${code}"?`)) {
      return
    }

    try {
      await adminApi.revokeInvite(inviteId)
      await loadInvites()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to revoke invite code')
    }
  }

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      alert('Failed to copy to clipboard')
    }
  }

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date()
  const isFullyUsed = (invite: InviteCode) => invite.currentUses >= invite.maxUses

  if (loading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto'></div>
          <p className='mt-4 text-gray-600 dark:text-gray-400'>Loading invite codes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6'>
        <p className='text-red-800 dark:text-red-200'>{error}</p>
        <button
          onClick={loadInvites}
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
            Invite Code Management
          </h2>
          <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
            {invites.length} total invite codes
          </p>
        </div>
        <button
          onClick={loadInvites}
          className='flex items-center space-x-2 px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 transition-colors'
        >
          <RefreshCw className='h-4 w-4' />
          <span>Refresh</span>
        </button>
      </div>

      {/* Create Invite Form */}
      <div className='bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6'>
        <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
          Generate New Invite Code
        </h3>

        {successMessage && (
          <div className='mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md'>
            <p className='text-sm text-green-800 dark:text-green-200'>{successMessage}</p>
          </div>
        )}

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              Send Invite To (Email)
            </label>
            <input
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='user@example.com (optional)'
              className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500'
            />
            <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
              If provided, the invite code will be emailed automatically
            </p>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              Note (optional)
            </label>
            <input
              type='text'
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder='Internal note or message for the invitee'
              className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500'
            />
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              Max Uses
            </label>
            <input
              type='number'
              min='1'
              max='100'
              value={maxUses}
              onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
              className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500'
            />
            <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
              Number of times this code can be used
            </p>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              Expires In (Days)
            </label>
            <input
              type='number'
              min='1'
              max='365'
              value={expiryDays}
              onChange={(e) => setExpiryDays(parseInt(e.target.value) || 30)}
              className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500'
            />
            <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
              Code will expire after this many days
            </p>
          </div>

          <div className='flex items-end'>
            <button
              onClick={handleCreateInvite}
              disabled={creating}
              className='w-full px-6 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2'
            >
              {creating ? (
                <span>Creating...</span>
              ) : (
                <>
                  {email.trim() ? <Send className='h-4 w-4' /> : null}
                  <span>{email.trim() ? 'Generate & Send' : 'Generate Code'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Invites List */}
      <div className='bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-700'>
            <thead className='bg-gray-50 dark:bg-gray-900/50'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  Code
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  Created By
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  Usage
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  Status
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  Expires
                </th>
                <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className='bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700'>
              {invites.map((invite) => {
                const expired = isExpired(invite.expiresAt)
                const fullyUsed = isFullyUsed(invite)
                const isActive = !expired && !fullyUsed

                return (
                  <tr key={invite._id} className='hover:bg-gray-50 dark:hover:bg-gray-700/50'>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center space-x-2'>
                        <code className='px-3 py-1 bg-gray-100 dark:bg-gray-700 text-brand-600 dark:text-brand-400 rounded text-sm font-mono'>
                          {invite.code}
                        </code>
                        <button
                          onClick={() => copyToClipboard(invite.code)}
                          className='p-1 text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors'
                          title='Copy to clipboard'
                        >
                          {copiedCode === invite.code ? (
                            <CheckCircle className='h-4 w-4 text-green-500' />
                          ) : (
                            <Copy className='h-4 w-4' />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='text-sm text-gray-900 dark:text-white'>
                        {invite.createdBy.name || 'N/A'}
                      </div>
                      <div className='text-xs text-gray-500 dark:text-gray-400'>
                        {invite.createdBy.email}
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='text-sm text-gray-900 dark:text-white'>
                        {invite.currentUses} / {invite.maxUses}
                      </div>
                      {invite.usedBy && (
                        <div className='text-xs text-gray-500 dark:text-gray-400'>
                          Used by {invite.usedBy.email}
                        </div>
                      )}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        isActive
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : expired
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                      }`}>
                        {isActive ? 'Active' : expired ? 'Expired' : 'Used'}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400'>
                      {new Date(invite.expiresAt).toLocaleDateString()}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                      <button
                        onClick={() => handleRevokeInvite(invite._id, invite.code)}
                        className='p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-colors'
                        title='Revoke invite'
                      >
                        <Trash2 className='h-4 w-4' />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {invites.length === 0 && (
          <div className='text-center py-12'>
            <Mail className='mx-auto h-12 w-12 text-gray-400' />
            <h3 className='mt-2 text-sm font-medium text-gray-900 dark:text-white'>No invite codes</h3>
            <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
              Generate your first invite code using the form above.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
