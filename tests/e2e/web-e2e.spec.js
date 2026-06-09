import { test } from '@playwright/test';
import { runWebE2E } from './web-e2e.js';

test('web e2e workflow', async ({ page }) => {
  test.setTimeout(process.env.PW_E2E_PROFILE === 'core' ? 60_000 : 180_000);
  await runWebE2E(page);
});
