/**
 * DielectricBlock.test.js - Basic refraction and dispersion
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { Ray } from '../../src/core/Ray.js';
import { DielectricBlock } from '../../src/components/special/DielectricBlock.js';

test('DielectricBlock 色散：短波折射率更高', () => {
    const block = new DielectricBlock(new Vector(0, 0));
    const n400 = block.getRefractiveIndex(400);
    const n700 = block.getRefractiveIndex(700);
    assert.ok(n400 > n700);
});

test('DielectricBlock 正入射产生透射光线', () => {
    const block = new DielectricBlock(new Vector(0, 0), 100, 60, 0, 1.5, 5000, 0.0);
    const ray = new Ray(new Vector(-200, 0), new Vector(1, 0));
    const hits = block.intersect(ray.origin, ray.direction);
    assert.equal(hits.length, 1, '应有一次交点');

    const out = block.interact(ray, hits[0], Ray);
    assert.ok(out.length >= 1, '应产生至少一条光线');

    const transmitted = out.find(r => r.direction.dot(ray.direction) > 0.9);
    assert.ok(transmitted, '应存在向前的透射光');

    const expectedN = block.getRefractiveIndex(ray.wavelengthNm);
    assert.ok(Math.abs(transmitted.mediumRefractiveIndex - expectedN) < 1e-6);
});

test('DielectricBlock 全反射：大角度出射仅反射', () => {
    const block = new DielectricBlock(new Vector(0, 0), 100, 60, 0, 1.5, 0, 0.0);
    const ray = new Ray(new Vector(0, 0), new Vector(1, 1), 550, 1.0);
    const hits = block.intersect(ray.origin, ray.direction);
    assert.equal(hits.length, 1, '应有一次交点');

    const out = block.interact(ray, hits[0], Ray);
    assert.equal(out.length, 1, '全反射应只产生一条反射光线');

    const expectedN = block.getRefractiveIndex(ray.wavelengthNm);
    assert.ok(Math.abs(out[0].mediumRefractiveIndex - expectedN) < 1e-6);
});
