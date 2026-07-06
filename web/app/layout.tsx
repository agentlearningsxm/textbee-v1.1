import { PropsWithChildren } from 'react'
import '@/styles/main.css'
import { Metadata } from 'next'
import Footer from '@/components/shared/footer'
import { Toaster } from '@/components/ui/toaster'
import Analytics from '@/components/shared/analytics'
import { Session } from 'next-auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Reynubix — Secure SMS Gateway',
  description: 'Your private SMS gateway dashboard, secured by Reynubix.',
}

export default async function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang='en'>
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
