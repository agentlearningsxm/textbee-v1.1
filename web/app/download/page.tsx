'use client'

import Link from 'next/link'
import { ArrowDownToLine, Check, Download, FileDown, Info, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const SELFHOSTED_APK_PATH = '/textbee-selfhosted.apk'
const SELFHOSTED_APK_SIZE_BYTES = 22_170_366
const SELFHOSTED_VERSION = '2.8.0'

export default function DownloadPage() {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  return (
    <div className='min-h-screen py-16 px-4'>
      <div className='container mx-auto max-w-5xl'>
        <div className='text-center mb-12'>
          <div className='inline-flex items-center rounded-full border px-3 py-1 text-sm bg-brand-50 dark:bg-brand-950 border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 mb-4'>
            <Download className='h-3.5 w-3.5 mr-2' /> Download TextBee
          </div>
          <h1 className='text-4xl font-bold tracking-tight text-gray-900 dark:text-white'>
            Download TextBee App
          </h1>
          <p className='mt-4 text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto'>
            Install the Android gateway app bundled with this self-hosted dashboard.
          </p>
        </div>

        <div className='mb-8'>
          <div className='bg-gradient-to-r from-brand-600 to-brand-700 rounded-xl shadow-lg overflow-hidden'>
            <div className='p-6 sm:p-8'>
              <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
                <div className='text-white'>
                  <div className='flex items-center gap-2 mb-2'>
                    <Badge className='bg-white/20 text-white border-white/30'>
                      Selfhosted Edition
                    </Badge>
                  </div>
                  <h2 className='text-2xl font-bold mb-2'>
                    TextBee Selfhosted App
                  </h2>
                  <p className='text-brand-100'>
                    Pre-configured to connect to your private TextBee API.
                  </p>
                </div>
                <Button
                  size='lg'
                  className='bg-white text-brand-700 hover:bg-brand-50'
                  asChild
                >
                  <Link href={SELFHOSTED_APK_PATH} download>
                    <ArrowDownToLine className='mr-2 h-5 w-5' />
                    Download APK
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className='mb-16'>
          <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden'>
            <div className='p-6 sm:p-8'>
              <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6'>
                <div>
                  <Badge className='bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-100 mb-2'>
                    Local self-hosted build
                  </Badge>
                  <h2 className='text-2xl font-bold text-gray-900 dark:text-white'>
                    TextBee Selfhosted App
                  </h2>
                </div>
                <Button
                  size='lg'
                  className='bg-brand-600 hover:bg-brand-700 text-white'
                  asChild
                >
                  <Link href={SELFHOSTED_APK_PATH} download>
                    <ArrowDownToLine className='mr-2 h-5 w-5' />
                    Download Now
                  </Link>
                </Button>
              </div>

              <div className='flex flex-wrap gap-4 mb-6 text-sm text-gray-600 dark:text-gray-400'>
                <div className='flex items-center'>
                  <Tag className='h-4 w-4 mr-1' />
                  <span>Version: {SELFHOSTED_VERSION}</span>
                </div>
                <div className='flex items-center'>
                  <FileDown className='h-4 w-4 mr-1' />
                  <span>Size: {formatFileSize(SELFHOSTED_APK_SIZE_BYTES)}</span>
                </div>
              </div>

              <div className='space-y-4'>
                <p className='text-gray-700 dark:text-gray-300'>
                  This page serves the APK stored in this self-hosted web app. It does not
                  fetch release assets from GitHub or any upstream TextBee server.
                </p>
                <div>
                  <h3 className='text-lg font-semibold mb-2 text-gray-900 dark:text-white'>
                    Included:
                  </h3>
                  <ul className='space-y-1 list-disc pl-5 text-gray-600 dark:text-gray-400'>
                    <li>Self-hosted API endpoint configuration</li>
                    <li>Gateway polling for pending SMS messages</li>
                    <li>Sticky notification background operation</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='mt-16 bg-gray-50 dark:bg-gray-900 rounded-xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700'>
          <div className='flex items-start'>
            <Info className='h-5 w-5 text-brand-600 dark:text-brand-400 mt-0.5 mr-3 flex-shrink-0' />
            <div>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-2'>
                System Requirements
              </h3>
              <ul className='space-y-2 text-gray-600 dark:text-gray-400'>
                <li className='flex items-start'>
                  <Check className='h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0' />
                  <span>Android 7.0 (Nougat) or higher</span>
                </li>
                <li className='flex items-start'>
                  <Check className='h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0' />
                  <span>SMS capability on the Android device</span>
                </li>
                <li className='flex items-start'>
                  <Check className='h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0' />
                  <span>Internet connection for API communication</span>
                </li>
                <li className='flex items-start'>
                  <Check className='h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0' />
                  <span>Battery optimization disabled for background operation</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
