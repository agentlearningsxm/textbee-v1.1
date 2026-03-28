import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { name, message } = await req.json()

  if (!name?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Name and message are required' }, { status: 400 })
  }

  const apiKey = process.env.SUPPORT_TEXTBEE_API_KEY
  const deviceId = process.env.SUPPORT_TEXTBEE_DEVICE_ID
  const phone = process.env.SUPPORT_PHONE
  const apiBaseUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL

  if (!apiKey || !deviceId || !phone || !apiBaseUrl) {
    console.error('[support] Missing env vars for TextBee SMS')
    return NextResponse.json({ error: 'Support not configured' }, { status: 500 })
  }

  const smsText = `[TextBee Support] ${name}: ${message}`

  const res = await fetch(`${apiBaseUrl}/gateway/devices/${deviceId}/send-sms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      receivers: [phone],
      message: smsText,
      simSubscriptionId: 3,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[support] TextBee SMS failed:', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
