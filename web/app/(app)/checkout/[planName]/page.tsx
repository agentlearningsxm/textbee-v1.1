import { redirect } from 'next/navigation'

// SaaS checkout cannot change limits on this self-hosted instance.
export default function CheckoutPage() {
  redirect('/dashboard/account/billing')
}
