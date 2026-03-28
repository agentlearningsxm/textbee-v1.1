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

  if (submitted) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-gray-100 dark:bg-muted'>
        <Card className='w-[450px] shadow-lg'>
          <CardHeader className='space-y-1'>
            <CardTitle className='text-2xl font-bold text-center text-green-600'>
              Request Submitted
            </CardTitle>
            <CardDescription className='text-center'>
              Your access request has been received
            </CardDescription>
          </CardHeader>
          <CardContent className='text-center space-y-4'>
            <div className='p-4 bg-green-50 dark:bg-green-900/20 rounded-lg'>
              <p className='text-sm text-green-800 dark:text-green-200'>
                An administrator will review your request. You'll receive an email
                once your account is approved.
              </p>
            </div>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              This usually takes less than 24 hours.
            </p>
          </CardContent>
          <CardFooter className='justify-center'>
            <Link href={Routes.login}>
              <Button variant='outline'>Back to Login</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className='flex items-center justify-center min-h-screen bg-gray-100 dark:bg-muted'>
      <Card className='w-[450px] shadow-lg'>
        <CardHeader className='space-y-1'>
          <CardTitle className='text-2xl font-bold text-center'>
            Request Access
          </CardTitle>
          <CardDescription className='text-center'>
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
                        className='dark:text-white dark:bg-gray-800'
                      />
                    </FormControl>
                    <FormMessage />
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
                        className='dark:text-white dark:bg-gray-800'
                      />
                    </FormControl>
                    <FormMessage />
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
                        className='dark:text-white dark:bg-gray-800'
                      />
                    </FormControl>
                    <FormMessage />
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
                        className='dark:text-white dark:bg-gray-800'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {serverError && (
                <p className='text-sm font-medium text-red-500'>{serverError}</p>
              )}

              <Button
                className='w-full'
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
          <p className='text-sm text-gray-600'>
            Have an invite code?{' '}
            <Link
              href={Routes.register}
              className='font-medium text-brand-600 hover:underline'
            >
              Register with code
            </Link>
          </p>
          <p className='text-sm text-gray-600'>
            Already have an account?{' '}
            <Link
              href={Routes.login}
              className='font-medium text-brand-600 hover:underline'
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
