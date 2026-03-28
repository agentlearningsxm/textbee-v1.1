'use client'
import { useState } from 'react'

type Status = 'idle' | 'open' | 'sending' | 'sent' | 'error'

export default function SupportWidget() {
  const [status, setStatus] = useState<Status>('idle')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message }),
      })
      if (!res.ok) throw new Error('failed')
      setStatus('sent')
      setName('')
      setMessage('')
    } catch {
      setStatus('error')
    }
  }

  return (
    <>
      {/* Chat bubble button */}
      <button
        onClick={() => setStatus(s => s === 'open' || s === 'sent' || s === 'error' ? 'idle' : 'open')}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-400 shadow-lg transition-colors"
        aria-label="Contact support"
      >
        {status === 'idle' || status === 'sending' ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {(status === 'open' || status === 'sending' || status === 'sent' || status === 'error') && (
        <div className="fixed bottom-24 right-6 z-50 w-80 rounded-2xl shadow-2xl border border-zinc-700 bg-zinc-900 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-zinc-800 border-b border-zinc-700">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">TextBee Support</p>
              <p className="text-xs text-zinc-400">We'll reply via SMS</p>
            </div>
          </div>

          {/* Body */}
          <div className="p-4">
            {status === 'sent' ? (
              <div className="text-center py-6">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 mx-auto mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white font-medium">Message sent!</p>
                <p className="text-zinc-400 text-sm mt-1">We'll text you back shortly.</p>
                <button onClick={() => setStatus('open')} className="mt-4 text-amber-400 text-sm hover:underline">
                  Send another
                </button>
              </div>
            ) : status === 'error' ? (
              <div className="text-center py-6">
                <p className="text-white font-medium">Something went wrong</p>
                <p className="text-zinc-400 text-sm mt-1">Please try again.</p>
                <button onClick={() => setStatus('open')} className="mt-4 text-amber-400 text-sm hover:underline">
                  Try again
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Your name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="John"
                    className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Message</label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    required
                    rows={3}
                    placeholder="How can we help you?"
                    className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold disabled:opacity-60 transition-colors"
                >
                  {status === 'sending' ? 'Sending…' : 'Send message'}
                </button>
              </form>
            )}
          </div>

          <div className="px-4 pb-3 text-center">
            <p className="text-xs text-zinc-600">Powered by TextBee</p>
          </div>
        </div>
      )}
    </>
  )
}
