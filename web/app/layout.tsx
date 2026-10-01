import { PropsWithChildren } from 'react'
import '@/styles/main.css'
import { Metadata } from 'next'
import { Inter } from 'next/font/google'
import ThemeProvider from './theme-provider'
import Analytics from '@/components/shared/analytics'
import AttributionCapture from '@/components/shared/attribution-capture'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Reynubix — Secure SMS Gateway',
  description: 'Your private SMS gateway dashboard, secured by Reynubix.',
}

export default async function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang='en' suppressHydrationWarning className={inter.variable}>
      {/* No <main> here: the (app) layout renders its own, and nesting
          <main> inside <main> is invalid HTML. */}
      <body className='font-sans antialiased'>
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
        <AttributionCapture />
      </body>
    </html>
  )
}
