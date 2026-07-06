'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Routes } from '@/config/routes'
import axios from 'axios'

const requestAccessSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters long' }),
  email: z.string().email({ message: 'Invalid email address' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' }),
  phone: z.string().optional(),
})

type RequestAccessFormValues = z.infer<typeof requestAccessSchema>

export default function RequestAccessPage() {
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<RequestAccessFormValues>({
    resolver: zodResolver(requestAccessSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phone: '',
    },
  })

  const onSubmit = async (data: RequestAccessFormValues) => {
    setServerError(null)

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || ''
      // Call the public endpoint directly (no auth needed)
      await axios.post(`${apiBase}/auth/request-access`, data)
      setSubmitted(true)
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        'Failed to submit request. Please try again.'
      setServerError(message)
    }
  }

  const cardClass =
    'w-full max-w-[450px] border border-[rgba(201,169,110,0.25)] bg-[#14141A]/95 text-[#E8E4DC] shadow-2xl shadow-black/50 backdrop-blur-sm'
  const inputClass =
    'bg-[#0D0D0D]/40 border-[rgba(201,169,110,0.3)] text-[#E8E4DC] placeholder:text-[#6f685f]'
  const linkClass =
    'font-medium text-[#7BA7E8] hover:text-[#9CC3EE] hover:underline'

  if (submitted) {
    return (
      <Card className={cardClass}>
        <CardHeader className='space-y-1'>
          <CardTitle
            className='font-cinzel text-2xl font-semibold text-center tracking-wide text-green-400'
            style={{ letterSpacing: '0.02em' }}
          >
            Request Submitted
          </CardTitle>
          <CardDescription className='text-center text-[#A09890]'>
            Your access request has been received
          </CardDescription>
        </CardHeader>
        <CardContent className='text-center space-y-4'>
          <div className='p-4 bg-green-900/20 border border-green-700/30 rounded-lg'>
            <p className='text-sm text-green-200'>
              An administrator will review your request. You'll receive an email
              once your account is approved.
            </p>
          </div>
          <p className='text-sm text-[#A09890]'>
            This usually takes less than 24 hours.
          </p>
        </CardContent>
        <CardFooter className='justify-center'>
          <Link href={Routes.login}>
            <Button
              variant='outline'
              className='border-[rgba(201,169,110,0.35)] bg-transparent text-[#E8E4DC] hover:bg-[#C9A96E]/10 hover:text-[#E8E4DC]'
            >
              Back to Login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className={cardClass}>
      <CardHeader className='space-y-1'>
        <CardTitle
          className='font-cinzel text-2xl font-semibold text-center tracking-wide text-[#E8E4DC]'
          style={{ letterSpacing: '0.02em' }}
        >
          Request Access
        </CardTitle>
        <CardDescription className='text-center text-[#A09890]'>
          Don't have an invite code? Submit a request and an admin will approve
          your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='John Doe'
                      {...field}
                      className={inputClass}
                    />
                  </FormControl>
                  <FormMessage className='text-red-400' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='m@example.com'
                      {...field}
                      className={inputClass}
                    />
                  </FormControl>
                  <FormMessage className='text-red-400' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type='password'
                      {...field}
                      className={inputClass}
                    />
                  </FormControl>
                  <FormMessage className='text-red-400' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='phone'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='+1 (555) 000-0000'
                      {...field}
                      className={inputClass}
                    />
                  </FormControl>
                  <FormMessage className='text-red-400' />
                </FormItem>
              )}
            />

            {serverError && (
              <p className='text-sm font-medium text-red-500'>{serverError}</p>
            )}

            <Button
              className='w-full bg-[#C9A96E] font-cinzel font-semibold tracking-wide text-[#0D0D0D] hover:bg-[#E8B923]'
              type='submit'
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? 'Submitting...'
                : 'Request Access'}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className='flex flex-col space-y-2 text-center'>
        <p className='text-sm text-[#A09890]'>
          Have an invite code?{' '}
          <Link href={Routes.register} className={linkClass}>
            Register with code
          </Link>
        </p>
        <p className='text-sm text-[#A09890]'>
          Already have an account?{' '}
          <Link href={Routes.login} className={linkClass}>
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
