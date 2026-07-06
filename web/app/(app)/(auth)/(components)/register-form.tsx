'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { signIn } from 'next-auth/react'
import { Checkbox } from '@/components/ui/checkbox'
import { Routes } from '@/config/routes'
import { useTurnstile } from '@/lib/turnstile'

const registerSchema = z.object({
  name: z
    .string()
    .min(2, { message: 'Name must be at least 2 characters long' }),
  email: z.string().email({ message: 'Invalid email address' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' }),
  phone: z.string().optional(),
  inviteCode: z.string().optional(),
  marketingOptIn: z.boolean().optional().default(true),
  turnstileToken: z.string().optional(),
}).refine((data) => {
  if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !data.turnstileToken) {
    return false
  }
  return true
}, {
  message: 'Please complete the bot verification',
  path: ['turnstileToken'],
})

type RegisterFormValues = z.infer<typeof registerSchema>

export default function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get invite code from URL if present
  const inviteCodeFromUrl = searchParams.get('invite')
  const isInviteOnly = process.env.NEXT_PUBLIC_REGISTRATION_MODE === 'invite_only'

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phone: '',
      inviteCode: inviteCodeFromUrl || '',
      marketingOptIn: true,
      turnstileToken: '',
    },
  })

  const {
    containerRef: turnstileRef,
    token: turnstileToken,
    error: turnstileError,
  } = useTurnstile({
    siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    onToken: (token) =>
      form.setValue('turnstileToken', token, { shouldValidate: true }),
    onError: (message) =>
      form.setError('turnstileToken', { type: 'manual', message }),
    onExpire: (message) =>
      form.setError('turnstileToken', { type: 'manual', message }),
  })

  useEffect(() => {
    if (turnstileToken) {
      form.clearErrors('turnstileToken')
    }
  }, [turnstileToken, form])

  useEffect(() => {
    if (turnstileError) {
      form.setError('turnstileToken', { type: 'manual', message: turnstileError })
    }
  }, [turnstileError, form])

  const onSubmit = async (data: RegisterFormValues) => {
    form.clearErrors()

    // Validate invite code is present if required
    if (isInviteOnly && !data.inviteCode) {
      form.setError('inviteCode', {
        type: 'manual',
        message: 'An invite code is required to register',
      })
      return
    }

    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !data.turnstileToken) {
      form.setError('turnstileToken', {
        type: 'manual',
        message: 'Please complete the bot verification',
      })
      return
    }

    try {
      const result = await signIn('email-password-register', {
        redirect: false,
        email: data.email,
        password: data.password,
        name: data.name,
        phone: data.phone,
        inviteCode: data.inviteCode,
        marketingOptIn: data.marketingOptIn,
        turnstileToken: data.turnstileToken,
      })

      if (result?.error) {
        console.log(result.error)
        // Check for specific invite code errors
        if (result.error.toLowerCase().includes('invite')) {
          form.setError('inviteCode', {
            type: 'manual',
            message: 'Invalid or expired invite code',
          })
        } else {
          form.setError('root', {
            type: 'manual',
            message: 'Failed to create account',
          })
        }
      } else {
        router.push(`${Routes.verifyEmail}?verificationEmailSent=1`)
      }
    } catch (error) {
      console.error('register error:', error)
      form.setError('root', {
        type: 'manual',
        message: 'An unexpected error occurred. Please try again.',
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
        {/* Show invite-only notice */}
        {isInviteOnly && (
          <Alert className='border-amber-500/40 bg-amber-500/10'>
            <AlertDescription className='text-amber-400'>
              Registration is currently invite-only. Please enter your invite code below.
            </AlertDescription>
          </Alert>
        )}

        {/* Invite Code Field - show prominently if invite-only mode or URL has invite code */}
        {(isInviteOnly || inviteCodeFromUrl) && (
          <FormField
            control={form.control}
            name='inviteCode'
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Invite Code {isInviteOnly && <span className='text-red-500'>*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder='Enter your invite code'
                    {...field}
                    className='bg-[#0D0D0D]/40 border-[rgba(201,169,110,0.3)] text-[#E8E4DC] placeholder:text-[#6f685f] font-mono uppercase tracking-wider'
                  />
                </FormControl>
                <FormDescription className='text-[#A09890]'>
                  {inviteCodeFromUrl
                    ? 'Your invite code has been pre-filled'
                    : 'Enter the invite code you received'}
                </FormDescription>
                <FormMessage className='text-red-400' />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder='John Doe' {...field} className='bg-[#0D0D0D]/40 border-[rgba(201,169,110,0.3)] text-[#E8E4DC] placeholder:text-[#6f685f]' />
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
                <Input placeholder='m@example.com' {...field} className='bg-[#0D0D0D]/40 border-[rgba(201,169,110,0.3)] text-[#E8E4DC] placeholder:text-[#6f685f]' />
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
                <Input type='password' {...field} className='bg-[#0D0D0D]/40 border-[rgba(201,169,110,0.3)] text-[#E8E4DC] placeholder:text-[#6f685f]' />
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
                <Input placeholder='+1 (555) 000-0000' {...field} className='bg-[#0D0D0D]/40 border-[rgba(201,169,110,0.3)] text-[#E8E4DC] placeholder:text-[#6f685f]' />
              </FormControl>
              <FormMessage className='text-red-400' />
            </FormItem>
          )}
        />

        {/* Show invite code field at bottom if open registration and no URL code */}
        {!isInviteOnly && !inviteCodeFromUrl && (
          <FormField
            control={form.control}
            name='inviteCode'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Invite Code (optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder='Have an invite code?'
                    {...field}
                    className='bg-[#0D0D0D]/40 border-[rgba(201,169,110,0.3)] text-[#E8E4DC] placeholder:text-[#6f685f] font-mono uppercase tracking-wider'
                  />
                </FormControl>
                <FormMessage className='text-red-400' />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name='turnstileToken'
          render={() => (
            <FormItem>
              <FormControl>
                <div
                  ref={turnstileRef}
                  className='min-h-[65px] w-full flex justify-center'
                />
              </FormControl>
              <FormMessage className='text-red-400' />
            </FormItem>
          )}
        />
        {form.formState.errors.root && (
          <p className='text-sm font-medium text-red-500'>
            {form.formState.errors.root.message}
          </p>
        )}

        <FormField
          control={form.control}
          name='marketingOptIn'
          render={({ field }) => (
            <FormItem>
              <div className='flex items-center space-x-3 space-y-0'>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className='text-sm'>
                  I want to receive updates about new features and promotions
                </FormLabel>
              </div>
              <FormMessage className='text-red-400' />
            </FormItem>
          )}
        />
        <Button
          className='w-full bg-[#C9A96E] font-cinzel font-semibold tracking-wide text-[#0D0D0D] hover:bg-[#E8B923]'
          type='submit'
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <>
              {/* <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> */}
              Creating account...
            </>
          ) : (
            'Sign Up'
          )}
        </Button>
      </form>
    </Form>
  )
}
