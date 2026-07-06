const POLAR_CUSTOMER_PORTAL_REQUEST_BASE =
  'https://polar.sh/textbee/portal/request'

export function polarCustomerPortalRequestUrl(
  email?: string | null
): string {
  const trimmed = email?.trim()
  if (!trimmed) return POLAR_CUSTOMER_PORTAL_REQUEST_BASE
  return `${POLAR_CUSTOMER_PORTAL_REQUEST_BASE}?email=${encodeURIComponent(trimmed)}`
}

export const ExternalLinks = {
  patreon: 'https://github.com/agentlearningsxm/textbee-cloud',
  github: 'https://github.com/agentlearningsxm/textbee-v1.1',
  discord: 'https://discord.gg/d7vyfBpWbQ',
  polar: 'https://github.com/agentlearningsxm/textbee-cloud',
  twitter: 'https://github.com/agentlearningsxm/textbee-cloud',
  linkedin: 'https://github.com/agentlearningsxm/textbee-cloud',
}
