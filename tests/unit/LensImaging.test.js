/**
 * LensImaging.test.js - 单元测试 LensImaging 成像计算
 * 使用 Node.js 内置 test runner (node:test)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { LaserSource } from '../../src/components/sources/LaserSource.js';
import { ThinLens } from '../../src/components/lenses/ThinLens.js';
import { LensImaging } from '../../src/simulation/LensImaging.js';

const createLens = (focalLength) => {
    const pos = new Vector(0, 0);
    return new ThinLens(pos, 80, focalLength, 90);
};

const calc = (objectTip, lens) => {
    const imaging = new LensImaging();
    return imaging._calculateParameters(objectTip, lens, 1);
};

const approx = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
const vecApprox = (v1, v2, eps = 1e-6) => v1 && v2 && approx(v1.x, v2.x, eps) && approx(v1.y, v2.y, eps);

test('LensImaging - 凸透镜 u=2f 成像（实像、等大、倒立）', () => {
    const lens = createLens(100);
    const objectTip = new Vector(-200, 30);
    const params = calc(objectTip, lens);
    assert.ok(params, '参数计算失败');
    assert.ok(Math.abs(params.u - 200) < 1e-6);
    assert.ok(Math.abs(params.v - 200) < 1e-6);
    assert.ok(Math.abs(params.M + 1) < 1e-6);
    assert.equal(params.isRealImage, true);
    assert.equal(params.imageAtInfinity, false);
});

test('LensImaging - 凸透镜 u=f 成像（像在无穷远）', () => {
    const lens = createLens(100);
    const objectTip = new Vector(-100, 20);
    const params = calc(objectTip, lens);
    assert.ok(params, '参数计算失败');
    assert.equal(params.imageAtInfinity, true);
    assert.ok(!isFinite(params.v) || params.v === Infinity);
});

test('LensImaging - 凸透镜 u<f 成像（虚像、正立、放大）', () => {
    const lens = createLens(100);
    const objectTip = new Vector(-50, 20);
    const params = calc(objectTip, lens);
    assert.ok(params, '参数计算失败');
    assert.ok(params.v < 0);
    assert.ok(params.M > 1);
    assert.equal(params.isRealImage, false);
});

test('LensImaging - 凹透镜成像（虚像、正立、缩小）', () => {
    const lens = createLens(-100);
    const objectTip = new Vector(-200, 20);
    const params = calc(objectTip, lens);
    assert.ok(params, '参数计算失败');
    assert.ok(params.v < 0);
    assert.ok(params.M > 0 && params.M < 1);
    assert.equal(params.isRealImage, false);
});

test('LensImaging - 虚像时主光线实线路径不指向虚像点', () => {
    const lens = createLens(100);
    const objectTip = new Vector(-50, 20);
    const imaging = new LensImaging();
    const params = imaging._calculateParameters(objectTip, lens, 1);
    assert.ok(params, '参数计算失败');
    assert.equal(params.isRealImage, false);
    assert.equal(params.imageAtInfinity, false);
    assert.ok(params.IMG_TIP, '虚像点为空');

    const lines = [];
    imaging._drawLine = (ctx, p1, p2, color, width, dashes = []) => {
        lines.push({ p1, p2, dashes });
    };
    imaging._drawPrincipalRays({}, params, 800, 600, 1);

    const hasSolidToVirtual = lines.some(l => (!l.dashes || l.dashes.length === 0) && vecApprox(l.p2, params.IMG_TIP));
    const hasDashedToVirtual = lines.some(l => Array.isArray(l.dashes) && l.dashes.length > 0 && vecApprox(l.p2, params.IMG_TIP));

    assert.equal(hasSolidToVirtual, false);
    assert.equal(hasDashedToVirtual, true);
});

test('LensImaging - u=f 时不绘制虚像延长线', () => {
    const lens = createLens(100);
    const objectTip = new Vector(-100, 20);
    const imaging = new LensImaging();
    const params = imaging._calculateParameters(objectTip, lens, 1);
    assert.ok(params, '参数计算失败');
    assert.equal(params.imageAtInfinity, true);

    const lines = [];
    imaging._drawLine = (ctx, p1, p2, color, width, dashes = []) => {
        lines.push({ dashes });
    };
    imaging._drawPrincipalRays({}, params, 800, 600, 1);

    const dashedLines = lines.filter(l => Array.isArray(l.dashes) && l.dashes.length > 0);
    assert.equal(dashedLines.length, 0);
});

test('LensImaging - 优先使用选中光源与透镜', () => {
    const imaging = new LensImaging();
    const lensA = createLens(80);
    const lensB = createLens(120);
    lensB.selected = true;

    const srcA = new LaserSource(new Vector(-150, 0), 0);
    const srcB = new LaserSource(new Vector(-250, 0), 0);
    srcB.selected = true;

    const components = [lensA, srcA, lensB, srcB];
    const pickedLens = imaging._findLens(components);
    const pickedSrc = imaging._findObjectSource(components);

    assert.equal(pickedLens, lensB);
    assert.equal(pickedSrc, srcB);
});
