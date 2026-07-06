'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, CheckCircle, XCircle, Mail, ArrowRight } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import httpBrowserClient from '@/lib/httpBrowserClient'
import { ApiEndpoints } from '@/config/api'
import { Routes } from '@/config/routes'

// Reusable components
const ErrorAlert = ({ message }: { message: string }) => (
  <Alert
    variant='destructive'
    className='bg-red-950/40 text-red-300 border-red-800/50'
  >
    <XCircle className='h-5 w-5 text-red-400' />
    <AlertTitle className='text-lg font-semibold text-red-300'>
      Error
    </AlertTitle>
    <AlertDescription className='text-red-300'>{message}</AlertDescription>
  </Alert>
)

const SuccessAlert = ({ title, message }: { title: string; message: string }) => (
  <Alert className='bg-green-950/40 text-green-300 border-green-800/50'>
    <CheckCircle className='h-5 w-5 text-green-400' />
    <AlertTitle className='text-lg font-semibold text-green-300'>
      {title}
    </AlertTitle>
    <AlertDescription className='text-green-300'>{message}</AlertDescription>
  </Alert>
)

const InfoAlert = ({ title, message }: { title: string; message: string }) => (
  <Alert className='bg-[#C9A96E]/10 text-[#C9A96E] border-[rgba(201,169,110,0.3)]'>
    <Mail className='h-5 w-5 text-[#C9A96E]' />
    <AlertTitle className='text-lg font-semibold text-[#C9A96E]'>
      {title}
    </AlertTitle>
    <AlertDescription className='text-[#E8E4DC]'>{message}</AlertDescription>
  </Alert>
)

const LoadingSpinner = () => (
  <div className='flex justify-center py-6'>
    <Loader2 className='h-10 w-10 animate-spin text-[#C9A96E]' />
  </div>
)

const DashboardButton = () => (
  <Button
    className='w-full py-5 mt-2 bg-[#C9A96E] font-cinzel font-semibold tracking-wide text-[#0D0D0D] hover:bg-[#E8B923]'
    asChild
  >
    <Link href={Routes.dashboard}>
      Go to Dashboard
      <ArrowRight className='ml-2 h-5 w-5' />
    </Link>
  </Button>
)

const LoginButton = () => (
  <Button
    className='w-full py-5 mt-2 bg-[#C9A96E] font-cinzel font-semibold tracking-wide text-[#0D0D0D] hover:bg-[#E8B923]'
    asChild
  >
    <Link href='/login'>
      Go to Login
      <ArrowRight className='ml-2 h-5 w-5' />
    </Link>
  </Button>
)

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')
  const verificationCode = searchParams.get('verificationCode')
  const verificationEmailSent = searchParams.get('verificationEmailSent')
  
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')

  // Check user authentication and email verification status
  const { 
    data: whoAmIData, 
    isPending: isCheckingAuth,
    isError: isAuthError 
  } = useQuery({
    queryKey: ['whoAmI'],
    queryFn: () => httpBrowserClient.get(ApiEndpoints.auth.whoAmI()),
    retry: 1,
  })

  const user = whoAmIData?.data?.data
  const isEmailVerified = !!user?.emailVerifiedAt
  const isLoggedIn = !isAuthError && !!user

  // Verify email mutation
  const { 
    mutate: verifyEmail, 
    isPending: isVerifying 
  } = useMutation({
    mutationFn: () => httpBrowserClient.post('/auth/verify-email', {
      userId,
      verificationCode,
    }),
    onSuccess: () => {
      setSuccessMessage('Your email has been successfully verified')
      setErrorMessage('')
    },
    onError: (error: any) => {
      setErrorMessage(error.message || 'Failed to verify email')
    },
  })

  // Send verification email mutation
  const { 
    mutate: sendVerificationEmail, 
    isPending: isSending 
  } = useMutation({
    mutationFn: () => httpBrowserClient.post(
      ApiEndpoints.auth.sendEmailVerificationEmail(),
      {}
    ),
    onSuccess: () => {
      if (!verificationEmailSent) {
        router.push('/verify-email?verificationEmailSent=true')
      } else {
        setSuccessMessage('Verification email has been sent to your inbox')
        setErrorMessage('')
      }
    },
    onError: (error: any) => {
      setErrorMessage(error.message || 'Failed to send verification email')
    },
  })

  // Handle verification when code is provided
  useEffect(() => {
    if (userId && verificationCode && !isVerifying && !successMessage && !errorMessage) {
      if (isEmailVerified) {
        setSuccessMessage('Your email has already been verified')
      } else if (!isCheckingAuth) {
        verifyEmail()
      }
    }
  }, [userId, verificationCode, isCheckingAuth, isEmailVerified, isVerifying, successMessage, errorMessage, verifyEmail])

  // Render content based on current state
  const renderContent = () => {
    // Show loading state
    if (isCheckingAuth) {
      return (
        <>
          <CardHeader>
            <CardTitle
              className='font-cinzel text-2xl font-semibold tracking-wide text-[#E8E4DC]'
              style={{ letterSpacing: '0.02em' }}
            >
              Email Verification
            </CardTitle>
            <CardDescription className='text-[#A09890]'>
              Checking verification status...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoadingSpinner />
          </CardContent>
        </>
      )
    }

    // Handle verification process
    if (userId && verificationCode) {
      return (
        <>
          <CardHeader>
            <CardTitle
              className='font-cinzel text-2xl font-semibold tracking-wide text-[#E8E4DC]'
              style={{ letterSpacing: '0.02em' }}
            >
              Email Verification
            </CardTitle>
            <CardDescription className='text-[#A09890]'>
              {isVerifying ? 'Verifying your email address...' : 'Email Verification Status'}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {isVerifying ? (
              <LoadingSpinner />
            ) : successMessage ? (
              <SuccessAlert title="Success" message={successMessage} />
            ) : errorMessage ? (
              <ErrorAlert message={errorMessage} />
            ) : null}
          </CardContent>
          <CardFooter>
            {successMessage && <DashboardButton />}
          </CardFooter>
        </>
      )
    }

    // Handle "check your email" state
    if (verificationEmailSent) {
      return (
        <>
          <CardHeader>
            <CardTitle
              className='font-cinzel text-2xl font-semibold tracking-wide text-[#E8E4DC]'
              style={{ letterSpacing: '0.02em' }}
            >
              Check Your Email
            </CardTitle>
            <CardDescription className='text-[#A09890]'>
              We've sent you a verification email. Please check your inbox and click
              the link to verify your account.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {successMessage && (
              <InfoAlert title="Email Sent" message={successMessage} />
            )}
            {errorMessage && (
              <ErrorAlert message={errorMessage} />
            )}
            {isEmailVerified && (
              <SuccessAlert 
                title="Already Verified" 
                message="Your email has already been verified" 
              />
            )}
          </CardContent>
          <CardFooter className='flex flex-col gap-3'>
            {isEmailVerified ? (
              <DashboardButton />
            ) : (
              <div className='flex items-center gap-2 justify-center w-full'>
                <span className='text-sm text-[#A09890]'>
                  Didn't receive the email?
                </span>
                <Button
                  variant='link'
                  onClick={() => sendVerificationEmail()}
                  disabled={isSending}
                  className='text-sm p-0 h-auto font-semibold'
                >
                  {isSending ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Sending...
                    </>
                  ) : (
                    'Click to resend'
                  )}
                </Button>
              </div>
            )}
          </CardFooter>
        </>
      )
    }

    // Handle "send verification email" state
    return (
      <>
        <CardHeader>
          <CardTitle
            className='font-cinzel text-2xl font-semibold tracking-wide text-[#E8E4DC]'
            style={{ letterSpacing: '0.02em' }}
          >
            Email Verification
          </CardTitle>
          <CardDescription className='text-[#A09890]'>
            {isLoggedIn
              ? isEmailVerified
                ? 'Your email is already verified'
                : 'Verify your email address to access all features'
              : 'You need to be logged in to verify your email'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {successMessage && (
            <InfoAlert title="Email Sent" message={successMessage} />
          )}
          {errorMessage && (
            <ErrorAlert message={errorMessage} />
          )}
          {isEmailVerified && (
            <SuccessAlert 
              title="Already Verified" 
              message="Your email has already been verified" 
            />
          )}
          {!isLoggedIn && (
            <Alert
              variant='destructive'
              className='bg-red-950/40 text-red-300 border-red-800/50'
            >
              <XCircle className='h-5 w-5 text-red-400' />
              <AlertTitle className='text-lg font-semibold text-red-300'>
                Not Logged In
              </AlertTitle>
              <AlertDescription className='text-red-300'>
                You need to be logged in to verify your email
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          {isLoggedIn ? (
            isEmailVerified ? (
              <DashboardButton />
            ) : (
              <Button
                className='w-full py-5 bg-[#C9A96E] font-cinzel font-semibold tracking-wide text-[#0D0D0D] hover:bg-[#E8B923]'
                onClick={() => sendVerificationEmail()}
                disabled={isSending}
              >
                {isSending ? (
                  <Loader2 className='mr-2 h-5 w-5 animate-spin' />
                ) : (
                  <Mail className='mr-2 h-5 w-5' />
                )}
                Send Verification Email
              </Button>
            )
          ) : (
            <LoginButton />
          )}
        </CardFooter>
      </>
    )
  }

  return (
    <Card className='w-full max-w-md border border-[rgba(201,169,110,0.25)] bg-[#14141A]/95 text-[#E8E4DC] shadow-2xl shadow-black/50 backdrop-blur-sm'>
      {renderContent()}
    </Card>
  )
}
