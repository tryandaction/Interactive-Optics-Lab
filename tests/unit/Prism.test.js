/**
 * Prism.test.js - 单元测试棱镜色散特性
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { Prism } from '../../src/components/special/Prism.js';

test('Prism 折射率随波长增大而减小（Cauchy）', () => {
    const prism = new Prism(new Vector(0, 0), 100, 60, 0, 1.5, 5000);
    prism.useSellmeier = false;
    const nBlue = prism.getRefractiveIndex(450);
    const nRed = prism.getRefractiveIndex(650);
    assert.ok(nBlue > nRed);
});
