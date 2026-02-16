#!/usr/bin/env node

/**
 * generate-license.js - License Key Generation Script
 *
 * Usage:
 *   node scripts/generate-license.js <email> <plan> <expiryDate>
 *
 * Example:
 *   node scripts/generate-license.js user@example.com pro 2027-12-31
 *
 * Plans: free, pro, education, team, enterprise
 */

import crypto from 'crypto';

// Secret key for signing (KEEP THIS SECRET!)
// In production, use environment variable: process.env.LICENSE_SECRET
const LICENSE_SECRET = process.env.LICENSE_SECRET || 'CHANGE_THIS_SECRET_KEY_IN_PRODUCTION';

// Public keys that will be embedded in the client
// These should match the keys in LicenseValidator.js
const PUBLIC_KEYS = {
    'current': 'a1b2c3d4e5f6g7h8',
    'previous': 'i9j0k1l2m3n4o5p6'
};

/**
 * Generate a license key
 * @param {string} email - User email
 * @param {string} plan - Plan name (free, pro, education, team, enterprise)
 * @param {string} expiryDate - Expiry date in YYYY-MM-DD format
 * @returns {string} License key
 */
function generateLicenseKey(email, plan, expiryDate) {
    // Validate inputs
    if (!email || !email.includes('@')) {
        throw new Error('Invalid email address');
    }

    const validPlans = ['free', 'pro', 'education', 'team', 'enterprise'];
    if (!validPlans.includes(plan)) {
        throw new Error(`Invalid plan. Must be one of: ${validPlans.join(', ')}`);
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(expiryDate)) {
        throw new Error('Invalid date format. Use YYYY-MM-DD');
    }

    const expiry = new Date(expiryDate);
    if (isNaN(expiry.getTime())) {
        throw new Error('Invalid date');
    }

    // Create data string
    const data = `${email}|${plan}|${expiryDate}`;

    // Generate signature using HMAC-SHA256
    const signature = crypto
        .createHmac('sha256', LICENSE_SECRET)
        .update(data)
        .digest('hex')
        .substring(0, 16);

    // Encode data as base64
    const dataB64 = Buffer.from(data).toString('base64');

    // Combine into license key
    const licenseKey = `${dataB64}.${signature}`;

    return licenseKey;
}

/**
 * Verify a license key (for testing)
 * @param {string} licenseKey - License key to verify
 * @returns {Object} Verification result
 */
function verifyLicenseKey(licenseKey) {
    try {
        const [dataB64, signature] = licenseKey.split('.');
        if (!dataB64 || !signature) {
            return { valid: false, error: 'Invalid format' };
        }

        // Decode data
        const data = Buffer.from(dataB64, 'base64').toString();
        const [email, plan, expiryDate] = data.split('|');

        // Verify signature
        const expectedSignature = crypto
            .createHmac('sha256', LICENSE_SECRET)
            .update(data)
            .digest('hex')
            .substring(0, 16);

        if (signature !== expectedSignature) {
            return { valid: false, error: 'Invalid signature' };
        }

        // Check expiry
        const expiry = new Date(expiryDate);
        const isExpired = expiry < new Date();

        return {
            valid: !isExpired,
            email,
            plan,
            expiryDate,
            expired: isExpired
        };
    } catch (e) {
        return { valid: false, error: e.message };
    }
}

/**
 * Generate batch licenses from CSV
 * @param {string} csvPath - Path to CSV file
 */
function generateBatchLicenses(csvPath) {
    const fs = require('fs');
    const csv = fs.readFileSync(csvPath, 'utf-8');
    const lines = csv.split('\n').slice(1); // Skip header

    const results = [];

    for (const line of lines) {
        if (!line.trim()) continue;

        const [email, plan, expiryDate] = line.split(',').map(s => s.trim());
        try {
            const key = generateLicenseKey(email, plan, expiryDate);
            results.push({ email, plan, expiryDate, key, status: 'success' });
        } catch (e) {
            results.push({ email, plan, expiryDate, error: e.message, status: 'error' });
        }
    }

    return results;
}

// CLI Interface
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMainModule) {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        console.log(`
License Key Generator for OpticsLab

Usage:
  node generate-license.js <email> <plan> <expiryDate>
  node generate-license.js --verify <licenseKey>
  node generate-license.js --batch <csvFile>

Arguments:
  email       - User email address
  plan        - Plan name: free, pro, education, team, enterprise
  expiryDate  - Expiry date in YYYY-MM-DD format

Options:
  --verify    - Verify a license key
  --batch     - Generate licenses from CSV file

Examples:
  node generate-license.js user@example.com pro 2027-12-31
  node generate-license.js --verify ZW1haWx8cHJvfDIwMjctMTItMzE=.a1b2c3d4e5f6g7h8
  node generate-license.js --batch licenses.csv

CSV Format:
  email,plan,expiryDate
  user1@example.com,pro,2027-12-31
  user2@example.com,education,2027-06-30

Environment Variables:
  LICENSE_SECRET - Secret key for signing (required in production)
        `);
        process.exit(0);
    }

    if (args[0] === '--verify') {
        const key = args[1];
        if (!key) {
            console.error('Error: License key required');
            process.exit(1);
        }

        const result = verifyLicenseKey(key);
        console.log('\nVerification Result:');
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.valid ? 0 : 1);
    }

    if (args[0] === '--batch') {
        const csvPath = args[1];
        if (!csvPath) {
            console.error('Error: CSV file path required');
            process.exit(1);
        }

        const results = generateBatchLicenses(csvPath);
        console.log('\nBatch Generation Results:');
        console.table(results);

        // Save to output file
        const fs = require('fs');
        const outputPath = csvPath.replace('.csv', '_output.csv');
        const outputCsv = 'email,plan,expiryDate,key,status\n' +
            results.map(r => `${r.email},${r.plan},${r.expiryDate},${r.key || ''},${r.status}`).join('\n');
        fs.writeFileSync(outputPath, outputCsv);
        console.log(`\nOutput saved to: ${outputPath}`);
        process.exit(0);
    }

    // Generate single license
    if (args.length < 3) {
        console.error('Error: Missing arguments');
        console.error('Usage: node generate-license.js <email> <plan> <expiryDate>');
        process.exit(1);
    }

    const [email, plan, expiryDate] = args;

    try {
        const key = generateLicenseKey(email, plan, expiryDate);

        console.log('\n✓ License Key Generated Successfully\n');
        console.log('Details:');
        console.log(`  Email:       ${email}`);
        console.log(`  Plan:        ${plan}`);
        console.log(`  Expiry Date: ${expiryDate}`);
        console.log('\nLicense Key:');
        console.log(`  ${key}`);
        console.log('\nVerification:');

        const verification = verifyLicenseKey(key);
        console.log(`  Valid: ${verification.valid ? '✓' : '✗'}`);

        if (!verification.valid) {
            console.log(`  Error: ${verification.error}`);
        }

        console.log('\nInstructions:');
        console.log('  1. Send this license key to the user');
        console.log('  2. User opens OpticsLab');
        console.log('  3. User clicks on license status indicator');
        console.log('  4. User pastes the key and clicks "Activate"');
        console.log('');

    } catch (e) {
        console.error(`\nError: ${e.message}\n`);
        process.exit(1);
    }
}

export { generateLicenseKey, verifyLicenseKey, generateBatchLicenses };
