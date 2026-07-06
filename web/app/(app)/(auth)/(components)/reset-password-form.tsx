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
// import { Icons } from "@/components/ui/icons"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import httpBrowserClient from '@/lib/httpBrowserClient'
import { ApiEndpoints } from '@/config/api'
import { Routes } from '@/config/routes'

const resetPasswordSchema = z
  .object({
    email: z.string().email({ message: 'Invalid email address' }),
    otp: z.string().min(4, { message: 'OTP is required' }),
    newPassword: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters long' }),
    confirmPassword: z
      .string()
      .min(4, { message: 'Please confirm your password' }),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords must match',
        path: ['confirmPassword'],
      })
    }
  })

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export default function ResetPasswordForm({
  email,
  otp,
}: {
  email: string
  otp: string
}) {
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: email,
      otp: otp,
      newPassword: '',
      confirmPassword: '',
    },
  })

  const onResetPassword = async (data: ResetPasswordFormValues) => {
    try {
      await httpBrowserClient.post(ApiEndpoints.auth.resetPassword(), data)
    } catch (error) {
      console.error(error)
      form.setError('root.serverError', {
        message: 'Failed to reset password',
      })
    }
  }

  const inputClass =
    'bg-[#0D0D0D]/40 border-[rgba(201,169,110,0.3)] text-[#E8E4DC] placeholder:text-[#6f685f]'

  return (
    <Card className='w-full max-w-[400px] border border-[rgba(201,169,110,0.25)] bg-[#14141A]/95 text-[#E8E4DC] shadow-2xl shadow-black/50 backdrop-blur-sm'>
      <CardHeader className='space-y-1'>
        <CardTitle
          className='font-cinzel text-2xl font-semibold text-center tracking-wide text-[#E8E4DC]'
          style={{ letterSpacing: '0.02em' }}
        >
          Reset your password
        </CardTitle>
        <CardDescription className='text-center text-[#A09890]'>
          Enter your new password below
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onResetPassword)}
            className='space-y-4'
          >
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
              name='otp'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>OTP</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='1234'
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
              name='newPassword'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
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
              name='confirmPassword'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
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

            {form.formState.errors.root && (
              <p className='text-sm font-medium text-red-500'>
                {form.formState.errors.root.message}
              </p>
            )}

            <Button
              className='w-full bg-[#C9A96E] font-cinzel font-semibold tracking-wide text-[#0D0D0D] hover:bg-[#E8B923]'
              type='submit'
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  {/* <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> */}
                  Resetting password...
                </>
              ) : (
                'Reset password'
              )}
            </Button>
          </form>
        </Form>
        {form.formState.isSubmitted && form.formState.isSubmitSuccessful && (
          <Alert className='mt-4 border-green-700/40 bg-green-900/20 text-green-200'>
            {/* <Icons.checkCircle className="h-4 w-4" /> */}
            <AlertTitle className='text-green-200'>
              Password reset successful
            </AlertTitle>
            <AlertDescription className='text-green-200'>
              Your password has been reset successfully. You can now login
              with your new password.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className='text-center'>
        <Link
          href={Routes.login}
          className='text-sm text-[#7BA7E8] hover:text-[#9CC3EE] hover:underline'
        >
          Back to login
        </Link>
      </CardFooter>
    </Card>
  )
}
