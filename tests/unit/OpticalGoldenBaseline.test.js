/**
 * OpticalGoldenBaseline.test.js - 核心光学行为金标准测试
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { Ray } from '../../src/core/Ray.js';
import { N_AIR } from '../../src/core/constants.js';
import { Mirror } from '../../src/components/mirrors/Mirror.js';
import { DielectricBlock } from '../../src/components/special/DielectricBlock.js';
import { Prism } from '../../src/components/special/Prism.js';
import { ThinLens } from '../../src/components/lenses/ThinLens.js';
import { BeamSplitter } from '../../src/components/polarizers/BeamSplitter.js';
import { Polarizer } from '../../src/components/polarizers/Polarizer.js';
import { HalfWavePlate } from '../../src/components/polarizers/HalfWavePlate.js';
import { QuarterWavePlate } from '../../src/components/polarizers/QuarterWavePlate.js';

const EPS = 1e-6;

function approx(actual, expected, eps = EPS) {
    assert.ok(
        Math.abs(actual - expected) < eps,
        `expected ${actual} ≈ ${expected} (eps=${eps})`
    );
}

function directionAngleToXAxis(direction) {
    return Math.atan2(direction.y, direction.x);
}

function angleDiff(a, b) {
    return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

test('Golden: Mirror 任意角度满足反射定律', () => {
    const mirrorAngle = Math.PI / 6;
    const mirror = new Mirror(new Vector(0, 0), 160, mirrorAngle);
    const ray = new Ray(new Vector(-60, -80), Vector.fromAngle(Math.PI / 3), 550, 1.0);
    const [hit] = mirror.intersect(ray.origin, ray.direction);
    assert.ok(hit, '斜入射应命中镜面');

    const [reflected] = mirror.interact(ray, hit, Ray);
    assert.ok(reflected, '镜面应产生反射光线');

    const tangent = mirror.p2.subtract(mirror.p1).normalize();
    const incidentTangentComponent = ray.direction.dot(tangent);
    const reflectedTangentComponent = reflected.direction.dot(tangent);
    const incidentNormalComponent = ray.direction.dot(hit.normal);
    const reflectedNormalComponent = reflected.direction.dot(hit.normal);

    approx(reflectedTangentComponent, incidentTangentComponent);
    approx(reflectedNormalComponent, -incidentNormalComponent);
});

test('Golden: DielectricBlock 正入射 Fresnel 能量分配', () => {
    const block = new DielectricBlock(new Vector(0, 0), 100, 60, 0, 1.5, 0, 0.0);
    const ray = new Ray(new Vector(-100, 0), new Vector(1, 0), 550, 1.0);
    const [hit] = block.intersect(ray.origin, ray.direction);

    const out = block.interact(ray, hit, Ray);
    assert.equal(out.length, 2, '正入射应产生反射和透射两条光线');

    const reflected = out.find(r => r.direction.x < 0);
    const transmitted = out.find(r => r.direction.x > 0);
    assert.ok(reflected, '缺少反射光线');
    assert.ok(transmitted, '缺少透射光线');

    const n1 = N_AIR;
    const n2 = block.getRefractiveIndex(550);
    const expectedR = ((n1 - n2) / (n1 + n2)) ** 2;

    approx(reflected.intensity, expectedR);
    approx(transmitted.intensity, 1 - expectedR);
    approx(reflected.intensity + transmitted.intensity, 1.0);
});

test('Golden: DielectricBlock 斜入射满足 Snell 定律', () => {
    const block = new DielectricBlock(new Vector(0, 0), 100, 60, 0, 1.5, 0, 0.0);
    const incidentAngle = Math.PI / 6;
    const ray = new Ray(new Vector(-100, -20), new Vector(Math.cos(incidentAngle), Math.sin(incidentAngle)), 550, 1.0);
    const [hit] = block.intersect(ray.origin, ray.direction);

    const out = block.interact(ray, hit, Ray);
    const transmitted = out.find(r => Math.abs(r.mediumRefractiveIndex - block.getRefractiveIndex(550)) < EPS);
    assert.ok(transmitted, '缺少进入介质的透射光线');

    const expectedAngle = Math.asin((N_AIR / block.getRefractiveIndex(550)) * Math.sin(incidentAngle));
    approx(directionAngleToXAxis(transmitted.direction), expectedAngle);
});

test('Golden: DielectricBlock 介质到空气超过临界角时全反射', () => {
    const block = new DielectricBlock(new Vector(0, 0), 100, 60, 0, 1.5, 0, 0.0);
    const nBlock = block.getRefractiveIndex(550);
    const incidentAngleFromNormal = Math.asin(N_AIR / nBlock) + 0.08;
    const direction = new Vector(Math.sin(incidentAngleFromNormal), -Math.cos(incidentAngleFromNormal));
    const ray = new Ray(new Vector(0, 0), direction, 550, 1.0, 0, 0, nBlock);
    ray.history = [new Vector(0, 20), ray.origin.clone()];

    const [hit] = block.intersect(ray.origin, ray.direction);
    assert.ok(hit, '介质内部光线应命中出射界面');

    const out = block.interact(ray, hit, Ray);
    assert.equal(out.length, 1, '全反射时不应产生透射分支');
    approx(out[0].mediumRefractiveIndex, nBlock);
    approx(out[0].intensity, 1.0);
    assert.ok(out[0].direction.y > 0, '全反射光线应返回介质内部');
});

test('Golden: Prism 入射分支满足 Snell 定律', () => {
    const prism = new Prism(new Vector(0, 0), 120, 60, 0, 1.5, 0);
    const ray = new Ray(new Vector(-80, -10), Vector.fromAngle(Math.PI / 6), 550, 1.0);
    const [hit] = prism.intersect(ray.origin, ray.direction);
    assert.ok(hit, '光线应命中棱镜入射面');

    const out = prism.interact(ray, hit, Ray);
    const transmitted = out.find(r => Math.abs(r.mediumRefractiveIndex - prism.getRefractiveIndex(550)) < EPS);
    assert.ok(transmitted, '缺少进入棱镜的透射分支');

    const n1 = N_AIR;
    const n2 = prism.getRefractiveIndex(550);
    const outwardNormal = prism.worldNormals[hit.surfaceId];
    const entering = ray.direction.dot(outwardNormal) < 0;
    const orientedNormal = entering ? outwardNormal : outwardNormal.multiply(-1);
    const cosI = Math.abs(ray.direction.dot(orientedNormal));
    const sinI = Math.sqrt(Math.max(0, 1 - cosI * cosI));
    const cosT = Math.abs(transmitted.direction.dot(orientedNormal));
    const sinT = Math.sqrt(Math.max(0, 1 - cosT * cosT));

    approx(n1 * sinI, n2 * sinT, 1e-5);
});

test('Golden: ThinLens 平行近轴光聚焦到焦平面', () => {
    const lens = new ThinLens(new Vector(0, 0), 80, 100, 90);
    const ray = new Ray(new Vector(-100, 10), new Vector(1, 0), 550, 1.0);
    const [hit] = lens.intersect(ray.origin, ray.direction);

    const [out] = lens.interact(ray, hit, Ray);
    assert.ok(out, '薄透镜应产生透射光线');

    const tToFocalPlane = (100 - out.origin.x) / out.direction.x;
    const yAtFocalPlane = out.origin.y + out.direction.y * tToFocalPlane;
    approx(yAtFocalPlane, 0, 0.15);
});

test('Golden: BeamSplitter 固定分束比例守恒且方向正确', () => {
    const splitter = new BeamSplitter(new Vector(0, 0), 80, 0, 'BS', 0.25);
    const ray = new Ray(new Vector(0, -20), new Vector(0, 1), 550, 1.0);
    const [hit] = splitter.intersect(ray.origin, ray.direction);

    const out = splitter.interact(ray, hit, Ray);
    assert.equal(out.length, 2);
    approx(out.reduce((sum, r) => sum + r.intensity, 0), 1.0);

    const reflected = out.find(r => r.direction.y < 0);
    const transmitted = out.find(r => r.direction.y > 0);
    assert.ok(reflected, '缺少反射分支');
    assert.ok(transmitted, '缺少透射分支');
    approx(reflected.intensity, 0.25);
    approx(transmitted.intensity, 0.75);
});

test('Golden: Polarizer 45度入射满足 Malus 定律', () => {
    const polarizer = new Polarizer(new Vector(0, 0), 100, 0, 0);
    const ray = new Ray(new Vector(0, -20), new Vector(0, 1), 550, 1.0);
    ray.setLinearPolarization(Math.PI / 4);
    const [hit] = polarizer.intersect(ray.origin, ray.direction);
    assert.ok(hit, '光线应命中偏振片');

    const [out] = polarizer.interact(ray, hit, Ray);
    assert.ok(out, '偏振片应产生透射光线');
    approx(out.intensity, 0.5);
    approx(out.jonesIntensity(), 1.0);
    approx(angleDiff(out.getPolarizationAngle(), 0), 0);
});

test('Golden: HalfWavePlate 满足 theta_out = 2alpha - theta_in', () => {
    const fastAxis = Math.PI / 6;
    const inputAngle = Math.PI / 9;
    const plate = new HalfWavePlate(new Vector(0, 0), 80, fastAxis * 180 / Math.PI, 0);
    const ray = new Ray(new Vector(0, -20), new Vector(0, 1), 550, 1.0);
    ray.setLinearPolarization(inputAngle);
    const [hit] = plate.intersect(ray.origin, ray.direction);
    assert.ok(hit, '光线应命中半波片');

    const [out] = plate.interact(ray, hit, Ray);
    assert.ok(out, '半波片应产生透射光线');
    approx(out.intensity, 1.0);
    approx(out.jonesIntensity(), 1.0);
    approx(angleDiff(out.getPolarizationAngle(), 2 * fastAxis - inputAngle), 0, 1e-4);
});

test('Golden: QuarterWavePlate 45度线偏振转圆偏振且强度守恒', () => {
    const plate = new QuarterWavePlate(new Vector(0, 0), 80, 0, 0);
    const ray = new Ray(new Vector(0, -20), new Vector(0, 1), 550, 1.0);
    ray.setLinearPolarization(Math.PI / 4);
    const [hit] = plate.intersect(ray.origin, ray.direction);
    assert.ok(hit, '光线应命中四分之一波片');

    const [out] = plate.interact(ray, hit, Ray);
    assert.ok(out, '四分之一波片应产生透射光线');
    approx(out.intensity, 1.0);
    approx(out.jonesIntensity(), 1.0);
    assert.equal(out.getPolarizationAngle(), 'circular');
});
