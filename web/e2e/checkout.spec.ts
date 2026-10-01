import { expect, test } from '@playwright/test'
import { authenticate } from './session'
import { mockApi } from './mock-api'

for (const path of ['/checkout/pro', '/checkout/pro?billingInterval=monthly', '/checkout/scale?billingInterval=yearly']) {
  test(`self-hosted ${path} returns to local limits without starting payment`, async ({ page, context }) => {
    await authenticate(context)
    await mockApi(page)
    const purchases: string[] = []
    page.on('request', (request) => {
      if (request.method() === 'POST' && /\/billing\/(checkout|change-plan)/.test(request.url())) {
        purchases.push(request.url())
      }
    })
    await page.goto(path)
    await expect(page).toHaveURL(/\/dashboard\/account\/billing$/)
    await expect(page.getByText(/Contact your administrator/)).toBeVisible()
    expect(purchases).toEqual([])
  })
}
