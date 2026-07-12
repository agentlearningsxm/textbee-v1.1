import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { name, phone, message } = await req.json()

  if (!name?.trim() || !message?.trim()) {
    return NextResponse.json(
      { error: 'Name and message are required' },
      { status: 400 },
    )
  }

  // Normalize + validate the visitor's phone number so we can auto-reply.
  // Accepts an optional leading + followed by 7-15 digits. This is a sanity
  // check, not full E.164 validation — the gateway/SIM will reject bad numbers.
  const normalizedPhone = phone?.replace(/[\s\-()]/g, '').trim()
  if (!normalizedPhone || !/^\+?\d{7,15}$/.test(normalizedPhone)) {
    return NextResponse.json(
      { error: 'A valid phone number (including country code) is required' },
      { status: 400 },
    )
  }

  const apiKey = process.env.SUPPORT_TEXTBEE_API_KEY
  const deviceId = process.env.SUPPORT_TEXTBEE_DEVICE_ID
  const ownerPhone = process.env.SUPPORT_PHONE
  const apiBaseUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL

  if (!apiKey || !deviceId || !ownerPhone || !apiBaseUrl) {
    console.error('[support] Missing env vars for TextBee SMS')
    return NextResponse.json({ error: 'Support not configured' }, { status: 500 })
  }

  // 1. Notify the owner: include the visitor's name + number so they can reply.
  const ownerMessage = `[Support] ${name} (${normalizedPhone}): ${message}`

  // 2. Auto-reply to the visitor so they know their message landed.
  const visitorMessage = `Thanks ${name}! We got your message and will text you back soon. — Reynubix Support`

  // Both sends go out via the support device's SIM (subscription ID 3 =
  // the unlimited "hollandsnieuwe" line). simSubscriptionId is correct and
  // must not be changed without confirming the device's active subscriptions.
  const sendUrl = `${apiBaseUrl}/gateway/devices/${deviceId}/send-sms`
  const sendHeaders = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
  }

  const [ownerRes, visitorRes] = await Promise.allSettled([
    fetch(sendUrl, {
      method: 'POST',
      headers: sendHeaders,
      body: JSON.stringify({
        receivers: [ownerPhone],
        message: ownerMessage,
        simSubscriptionId: 3,
      }),
    }),
    fetch(sendUrl, {
      method: 'POST',
      headers: sendHeaders,
      body: JSON.stringify({
        receivers: [normalizedPhone],
        message: visitorMessage,
        simSubscriptionId: 3,
      }),
    }),
  ])

  // The owner notification is the critical one. If it failed, report an error.
  if (ownerRes.status !== 'fulfilled' || !ownerRes.value.ok) {
    const detail =
      ownerRes.status === 'fulfilled' ? await ownerRes.value.text().catch(() => '') : String(ownerRes.reason)
    console.error('[support] Owner SMS failed:', detail)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }

  // Visitor auto-reply is best-effort; don't fail the whole request over it,
  // but log so we know if the owner needs to reply manually.
  if (visitorRes.status !== 'fulfilled' || !visitorRes.value.ok) {
    const detail =
      visitorRes.status === 'fulfilled' ? await visitorRes.value.text().catch(() => '') : String(visitorRes.reason)
    console.error('[support] Visitor auto-reply SMS failed:', detail)
  }

  return NextResponse.json({ ok: true })
}
