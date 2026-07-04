const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1').replace(/\/$/, '')

export const Routes = {
  landingPage: '/',
  contribute: '/contribute',
  useCases: '/dashboard', // Self-hosted: redirects to dashboard
  quickstart: '/dashboard', // Self-hosted: redirects to dashboard
  login: '/login',
  register: '/register',
  requestAccess: '/request-access',
  logout: '/logout',
  resetPassword: '/reset-password',
  verifyEmail: '/verify-email',

  dashboard: '/dashboard',

  downloadAndroidApp: '/download',
  privacyPolicy: '/dashboard', // Self-hosted: no external policy page
  refundPolicy: '/dashboard', // Self-hosted: no external policy page
  termsOfService: '/dashboard', // Self-hosted: no external policy page
  statusPage: `${apiBaseUrl}/health`,
}
