/**
 * DiagnosticSystem.test.js - diagnostic health checks
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DiagnosticSystem } from '../../src/diagram/DiagnosticSystem.js';

test('DiagnosticSystem counts optional module descriptors separately from failures', () => {
    const diagnostics = new DiagnosticSystem();
    const result = diagnostics.checkModules({
        initializedModule: {},
        optionalModule: {
            optional: true,
            instance: null,
            reason: 'managed elsewhere'
        },
        failedModule: null
    });

    assert.equal(result.total, 3);
    assert.equal(result.initialized, 1);
    assert.equal(result.optional, 1);
    assert.equal(result.failed, 1);
    assert.equal(result.details.optionalModule, 'managed elsewhere');
});
