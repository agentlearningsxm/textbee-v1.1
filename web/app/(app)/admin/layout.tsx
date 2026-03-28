'use client'

import { Shield, Users, Mail, BarChart3, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  if (status === 'loading') {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto'></div>
          <p className='mt-4 text-gray-600 dark:text-gray-400'>Loading...</p>
        </div>
      </div>
    )
  }

  if (session?.user?.role !== 'ADMIN') {
    return null
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      {/* Admin Header */}
      <header className='bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-16'>
            <div className='flex items-center space-x-3'>
              <Shield className='h-6 w-6 text-brand-600 dark:text-brand-400' />
              <h1 className='text-xl font-bold text-gray-900 dark:text-white'>
                Admin Panel
              </h1>
            </div>
            <Link
              href='/dashboard'
              className='text-sm text-gray-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400'
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Admin Navigation Tabs */}
      <nav className='bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex space-x-8'>
            <NavTab
              href='/admin'
              icon={<BarChart3 className='h-4 w-4' />}
              label='Overview'
              isActive={pathname === '/admin'}
            />
            <NavTab
              href='/admin/users'
              icon={<Users className='h-4 w-4' />}
              label='Users'
              isActive={pathname?.startsWith('/admin/users')}
            />
            <NavTab
              href='/admin/invites'
              icon={<Mail className='h-4 w-4' />}
              label='Invite Codes'
              isActive={pathname?.startsWith('/admin/invites')}
            />
            <NavTab
              href='/admin/approval-queue'
              icon={<UserPlus className='h-4 w-4' />}
              label='Approval Queue'
              isActive={pathname?.startsWith('/admin/approval-queue')}
            />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {children}
      </main>
    </div>
  )
}

function NavTab({
  href,
  icon,
  label,
  isActive,
}: {
  href: string
  icon: React.ReactNode
  label: string
  isActive: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-center space-x-2 px-3 py-4 border-b-2 text-sm font-medium transition-colors ${
        isActive
          ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
          : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}
