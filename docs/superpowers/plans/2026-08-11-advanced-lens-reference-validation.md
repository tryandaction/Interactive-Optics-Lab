# Advanced Lens Reference Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify the analytic limits implemented by AsphericLens and make GRINLens propagation correct for both directions through its modeled parabolic profile.

**Architecture:** Keep AsphericLens as a paraxial single-surface model and test its public sag/slope functions against closed-form spherical and parabolic cases. Make GRINLens choose its first physical face from ray direction, then propagate radial state through the existing paraxial GRIN transfer equation using a direction-aware propagation axis. This phase does not claim full aberration, coating, or full-wave accuracy.

**Tech Stack:** Native ES modules, Node built-in test runner, Playwright CLI smoke workflow, Canvas renderer.

---

### Task 1: Establish analytic advanced-lens reference failures

**Files:**
- Modify: `tests/unit/AdvancedLenses.test.js`

- [x] **Step 1: Add aspheric sag and slope reference tests**

```javascript
test('AsphericLens matches spherical and parabolic sag references', () => {
    const spherical = new AsphericLens(new Vector(0, 0), 80, 100, 0, [0, 0, 0, 0], 0);
    const parabolic = new AsphericLens(new Vector(0, 0), 80, 100, -1, [0, 0, 0, 0], 0);
    approx(spherical.getSurfaceHeight(20), 100 - Math.sqrt(100 ** 2 - 20 ** 2));
    approx(spherical.getSurfaceSlope(20), 20 / Math.sqrt(100 ** 2 - 20 ** 2));
    approx(parabolic.getSurfaceHeight(20), 20 ** 2 / (2 * 100));
    approx(parabolic.getSurfaceSlope(20), 20 / 100);
});
```

- [x] **Step 2: Add a quarter-pitch reverse GRIN reproduction**

```javascript
test('GRINLens reverse quarter-pitch ray enters at the right face and exits left', () => {
    const length = 20;
    const g = Math.PI / (2 * length);
    const lens = new GRINLens(new Vector(0, 0), 30, length, 1.6, g, 0);
    const ray = new Ray(new Vector(100, 5), new Vector(-1, 0), 550, 1);
    const [hit] = lens.intersect(ray.origin, ray.direction);
    assert.ok(hit);
    approx(hit.point.x, length / 2);
    assert.equal(hit.surfaceId, 'exit');
    const [out] = lens.interact(ray, hit, Ray);
    approx(out.origin.x, -length / 2, 1e-4);
    approx(out.origin.y, 0, 1e-4);
    assert.ok(out.direction.x < -0.99);
});
```

- [x] **Step 3: Run focused tests to confirm the GRIN test is RED**

Run: `node --test tests/unit/AdvancedLenses.test.js`

Expected: the reverse GRIN assertion fails because `intersect()` selects the fixed left face and the output leaves in the wrong direction.

### Task 2: Make GRIN entry-face selection and transfer propagation direction-aware

**Files:**
- Modify: `src/components/lenses/GRINLens.js`
- Test: `tests/unit/AdvancedLenses.test.js`

- [x] **Step 1: Select the first physical face from the axial ray direction**

```javascript
const forwardSign = Math.sign(rayDirection.dot(this.axisDirection));
if (forwardSign === 0) return [];
const entryCenter = this.pos.subtract(this.axisDirection.multiply(forwardSign * this.length / 2));
const exitCenter = this.pos.add(this.axisDirection.multiply(forwardSign * this.length / 2));
```

Return `surfaceId: 'entry'` for positive `forwardSign` and `surfaceId: 'exit'` for negative `forwardSign`, preserving the signed radial coordinate.

- [x] **Step 2: Propagate in the physical travel axis**

```javascript
const travelAxis = this.axisDirection.multiply(Math.sign(incidentDirection.dot(this.axisDirection)));
const r0Prime = incidentDirection.dot(this.perpDirection) /
    Math.max(0.1, Math.abs(incidentDirection.dot(travelAxis)));
const rOut = r0 * Math.cos(g * L) + (r0Prime / g) * Math.sin(g * L);
const rOutPrime = -r0 * g * Math.sin(g * L) + r0Prime * Math.cos(g * L);
const newDirection = travelAxis.add(this.perpDirection.multiply(rOutPrime)).normalize();
```

Build the exit point from the direction-selected `exitCenter`, retain the existing intensity and termination contract, and keep the zero-gradient branch direction-aware.

- [x] **Step 3: Run focused tests to confirm GREEN**

Run: `node --test tests/unit/AdvancedLenses.test.js`

Expected: all advanced-lens tests pass, including spherical/parabolic references and forward/reverse quarter-pitch GRIN propagation.

### Task 3: Carry the validated scope into product evidence

**Files:**
- Modify: `src/components/ComponentValidationMatrix.js`
- Modify: `tests/e2e/run-smoke-e2e.ps1`
- Modify: `docs/QA_REPORT_2026-08-11.md`
- Modify: `docs/generate_physics_redesign_docx.py`

- [x] **Step 1: Extend browser smoke without changing its scene semantics**

Add a GRIN placement assertion for `n0`, `gradientCoeff`, and `angleRad`, keeping the lens outside the primary ray path so the existing thick-lens smoke remains deterministic.

- [x] **Step 2: Update the GRIN validation boundary**

Keep `GRINLens` at `experimental` and `partial`, but list `AdvancedLenses.test.js` as covering analytic refractive-index, pitch, and bidirectional quarter-pitch transfer cases. Explicitly exclude full ray-path integration through inhomogeneous media and external reference-lens calibration.

- [x] **Step 3: Run release verification and record evidence**

Run: `node --check main.js`
Run: `npm.cmd test`
Run: `npm.cmd run test:e2e`
Run: `npm.cmd --registry="https://registry.npmjs.org" audit --audit-level=moderate`

Expected: syntax check succeeds, all unit tests pass, browser smoke produces `output/playwright/smoke-canvas.png` with no captured console errors, and audit reports zero vulnerabilities.
