'use client'

import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { KeyRound } from 'lucide-react'

import RegisterForm from '../(components)/register-form'
import { Routes } from '@/config/routes'
import { useSearchParams } from 'next/navigation'

export default function RegisterPage() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect')

  return (
    <Card className='w-full max-w-[450px] border border-[rgba(201,169,110,0.25)] bg-[#14141A]/95 text-[#E8E4DC] shadow-2xl shadow-black/50 backdrop-blur-sm'>
      <CardHeader className='space-y-1'>
        <CardTitle
          className='font-cinzel text-2xl font-semibold text-center tracking-wide text-[#E8E4DC]'
          style={{ letterSpacing: '0.02em' }}
        >
          Create an account
        </CardTitle>
        <CardDescription className='text-center text-[#A09890]'>
          Enter your details to get started
        </CardDescription>
        <div className='!mt-4 flex items-start gap-2 rounded-md border border-[rgba(201,169,110,0.25)] bg-[#C9A96E]/[0.06] px-3 py-2.5 text-left'>
          <KeyRound className='mt-0.5 h-4 w-4 shrink-0 text-[#C9A96E]' />
          <p className='text-xs leading-relaxed text-[#A09890]'>
            Access by invitation. Registration requires a valid invite code.
            Don&apos;t have one?{' '}
            <Link
              href='/request-access'
              className='font-medium text-[#7BA7E8] hover:text-[#9CC3EE] hover:underline'
            >
              Request access
            </Link>
            .
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
      <CardFooter className='flex flex-col space-y-2 text-center'>
        <p className='text-sm text-[#A09890]'>
          Don't have an invite code?{' '}
          <Link
            href='/request-access'
            className='font-medium text-[#7BA7E8] hover:text-[#9CC3EE] hover:underline'
          >
            Request access
          </Link>
        </p>
        <p className='text-sm text-[#A09890]'>
          Already have an account?{' '}
          <Link
            href={{
              pathname: Routes.login,
              query: {
                redirect: redirect ? decodeURIComponent(redirect) : undefined,
              },
            }}
            className='font-medium text-[#7BA7E8] hover:text-[#9CC3EE] hover:underline'
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
