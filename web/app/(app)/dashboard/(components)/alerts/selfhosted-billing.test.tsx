import { expect, it } from 'vitest'
import { render } from '@testing-library/react'
import PastDueBillingAlert from './past-due-billing-alert'
import UpgradeToProAlert from './upgrade-to-pro-alert'

it('renders no SaaS billing or purchase alerts on the self-hosted dashboard', () => {
  const { container } = render(<><PastDueBillingAlert /><UpgradeToProAlert /></>)
  expect(container).toBeEmptyDOMElement()
})
