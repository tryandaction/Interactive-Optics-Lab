import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 180_000,
    expect: {
        timeout: 10_000
    },
    outputDir: './output/playwright/test-results',
    reporter: [['line']],
    use: {
        actionTimeout: 15_000,
        trace: 'retain-on-failure'
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        }
    ]
});
