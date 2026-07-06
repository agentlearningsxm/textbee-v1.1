'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import LoginForm from '../(components)/login-form'
import { Routes } from '@/config/routes'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect')

  return (
    <Card className='w-full max-w-[400px] border border-[rgba(201,169,110,0.25)] bg-[#14141A]/95 text-[#E8E4DC] shadow-2xl shadow-black/50 backdrop-blur-sm'>
      <CardHeader className='space-y-1'>
        <CardTitle
          className='font-cinzel text-2xl font-semibold text-center tracking-wide text-[#E8E4DC]'
          style={{ letterSpacing: '0.02em' }}
        >
          Welcome back
        </CardTitle>
        <CardDescription className='text-center text-[#A09890]'>
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
      <CardFooter className='flex flex-col space-y-2 text-center'>
        <Link
          href={Routes.resetPassword}
          className='text-sm text-[#7BA7E8] hover:text-[#9CC3EE] hover:underline'
        >
          Forgot your password?
        </Link>
        <p className='text-sm text-[#A09890]'>
          Don&apos;t have an account?{' '}
          <Link
            href={{
              pathname: Routes.register,
              query: {
                redirect: redirect ? decodeURIComponent(redirect) : undefined,
              },
            }}
            className='font-medium text-[#7BA7E8] hover:text-[#9CC3EE] hover:underline'
          >
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
