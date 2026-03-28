export const ApiEndpoints = {
  auth: {
    login: () => '/auth/login',
    register: () => '/auth/register',
    requestAccess: () => '/auth/request-access',
    signInWithGoogle: () => '/auth/google-login',
    updateProfile: () => '/auth/update-profile',
    changePassword: () => '/auth/change-password',

    whoAmI: () => '/auth/who-am-i',

    sendEmailVerificationEmail: () => '/auth/send-email-verification-email',
    verifyEmail: () => '/auth/verify-email',

    requestPasswordReset: () => '/auth/request-password-reset',
    resetPassword: () => '/auth/reset-password',

    generateApiKey: () => '/auth/api-keys',
    listApiKeys: () => '/auth/api-keys',
    revokeApiKey: (id: string) => `/auth/api-keys/${id}/revoke`,
    renameApiKey: (id: string) => `/auth/api-keys/${id}/rename`,
    deleteApiKey: (id: string) => `/auth/api-keys/${id}`,
  },
  gateway: {
    listDevices: () => '/gateway/devices',
    deleteDevice: (id: string) => `/gateway/devices/${id}`,
    sendSMS: (id: string) => `/gateway/devices/${id}/send-sms`,
    sendBulkSMS: (id: string) => `/gateway/devices/${id}/send-bulk-sms`,
    getReceivedSMS: (id: string) => `/gateway/devices/${id}/get-received-sms`,
    getMessages: (id: string) => `/gateway/devices/${id}/messages`,

    getWebhooks: () => '/webhooks',
    getWebhookNotifications: () => '/webhooks/notifications',
    createWebhook: () => '/webhooks',
    updateWebhook: (id: string) => `/webhooks/${id}`,
    getStats: () => '/gateway/stats',
  },
  billing: {
    currentSubscription: () => '/billing/current-subscription',
    checkout: () => '/billing/checkout',
    plans: () => '/billing/plans',
  },
  support: {
    customerSupport: () => '/support/customer-support',
    requestAccountDeletion: () => '/support/request-account-deletion',
  },
  admin: {
    invites: {
      create: () => '/admin/invites',
      list: () => '/admin/invites',
      get: (id: string) => `/admin/invites/${id}`,
      revoke: (id: string) => `/admin/invites/${id}/revoke`,
      delete: (id: string) => `/admin/invites/${id}`,
    },
    users: {
      list: () => '/admin/users',
      get: (id: string) => `/admin/users/${id}`,
      updateRole: (id: string) => `/admin/users/${id}/role`,
      ban: (id: string) => `/admin/users/${id}/ban`,
      unban: (id: string) => `/admin/users/${id}/unban`,
      delete: (id: string) => `/admin/users/${id}`,
    },
    stats: () => '/admin/stats',
    registrationRequests: {
      list: () => '/admin/registration-requests',
      approve: (id: string) => `/admin/registration-requests/${id}/approve`,
      reject: (id: string) => `/admin/registration-requests/${id}/reject`,
    },
  },
}
