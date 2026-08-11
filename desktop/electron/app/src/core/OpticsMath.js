/**
 * OpticsMath.js - pure optical math helpers.
 *
 * These functions intentionally do not create rays or touch UI/global state.
 * Component classes can use them as a tested physics boundary.
 */

export function reflectDirection(incidentDirection, surfaceNormal) {
    const dot = incidentDirection.dot(surfaceNormal);
    return incidentDirection.subtract(surfaceNormal.multiply(2 * dot)).normalize();
}

export function fresnelUnpolarizedReflectance(n1, n2, cosI, cosT) {
    const clampedCosI = Math.max(0, Math.min(1, cosI));
    const clampedCosT = Math.max(0, Math.min(1, cosT));
    const rsDen = n1 * clampedCosI + n2 * clampedCosT;
    const rpDen = n1 * clampedCosT + n2 * clampedCosI;
    const rs = Math.abs(rsDen) < 1e-12 ? 1 : (n1 * clampedCosI - n2 * clampedCosT) / rsDen;
    const rp = Math.abs(rpDen) < 1e-12 ? 1 : (n1 * clampedCosT - n2 * clampedCosI) / rpDen;
    return Math.max(0, Math.min(1, 0.5 * (rs * rs + rp * rp)));
}

export function snellRefraction(incidentDirection, surfaceNormal, n1, n2) {
    const cosI = Math.max(0, Math.min(1, incidentDirection.multiply(-1).dot(surfaceNormal)));
    const sinI2 = Math.max(0, 1 - cosI * cosI);
    const nRatio = n1 / n2;
    const sinT2 = nRatio * nRatio * sinI2;
    const isTotalInternalReflection = n1 > n2 && sinT2 >= 1 - 1e-9;

    if (isTotalInternalReflection || sinT2 < 0 || sinT2 > 1) {
        return {
            isTotalInternalReflection: true,
            cosI,
            sinI2,
            sinT2,
            cosT: 0,
            refractedDirection: null,
            reflectance: 1
        };
    }

    const cosT = Math.sqrt(1 - sinT2);
    const refractedDirection = incidentDirection
        .multiply(nRatio)
        .add(surfaceNormal.multiply(nRatio * cosI - cosT))
        .normalize();

    return {
        isTotalInternalReflection: false,
        cosI,
        sinI2,
        sinT2,
        cosT,
        refractedDirection,
        reflectance: fresnelUnpolarizedReflectance(n1, n2, cosI, cosT)
    };
}

export function paraxialThinLensDirection(incidentDirection, axisDirection, lensPlaneDirection, heightFromAxis, focalLength) {
    const axisDir = axisDirection.normalize();
    const planeDir = lensPlaneDirection.normalize();
    const incidentAngleRelAxis = Math.atan2(
        incidentDirection.dot(planeDir),
        incidentDirection.dot(axisDir)
    );
    const deviation = Math.abs(focalLength) < 1e-9 ? 0 : -heightFromAxis / focalLength;
    const outputAngleRelAxis = incidentAngleRelAxis + deviation;
    return axisDir.rotate(outputAngleRelAxis).normalize();
}

export function paraxialForwardLensDirection(incidentDirection, axisDirection, lensPlaneDirection, heightFromAxis, focalLength) {
    let forwardAxis = axisDirection.normalize();
    const planeDir = lensPlaneDirection.normalize();

    if (incidentDirection.dot(forwardAxis) < 0) {
        forwardAxis = forwardAxis.multiply(-1);
    }

    const axialComponent = Math.max(1e-9, Math.abs(incidentDirection.dot(forwardAxis)));
    const incidentSlope = incidentDirection.dot(planeDir) / axialComponent;
    const lensPowerSlope = Math.abs(focalLength) < 1e-9 ? 0 : -heightFromAxis / focalLength;
    const outputSlope = incidentSlope + lensPowerSlope;

    return forwardAxis.add(planeDir.multiply(outputSlope)).normalize();
}

export function thinLensImaging(objectDistance, focalLength) {
    const u = objectDistance;
    const F = focalLength;

    if (Math.abs(F) === Infinity) {
        return { v: -u, magnification: 1.0, isRealImage: false, imageAtInfinity: false };
    }
    if (Math.abs(u) < 1e-9) {
        return { v: 0, magnification: 1.0, isRealImage: false, imageAtInfinity: false };
    }
    if (Math.abs(F) < 1e-9) {
        return { v: -u, magnification: 1.0, isRealImage: false, imageAtInfinity: false };
    }
    if (Math.abs(u - F) < 1e-6) {
        return { v: Infinity, magnification: Infinity, isRealImage: false, imageAtInfinity: true };
    }

    const oneOverV = 1 / F - 1 / u;
    if (Math.abs(oneOverV) < 1e-9) {
        return { v: Infinity, magnification: Infinity, isRealImage: false, imageAtInfinity: true };
    }

    const v = 1 / oneOverV;
    const magnification = -v / u;
    return {
        v,
        magnification,
        isRealImage: v > 1e-9,
        imageAtInfinity: false
    };
}

export function diffractionGratingDirection(incidentDirection, gratingDirection, surfaceNormal, wavelengthPixels, gratingPeriodPixels, order) {
    if (gratingPeriodPixels <= 1e-12) return null;

    const tangent = gratingDirection.normalize();
    const normal = surfaceNormal.normalize();
    const propagationNormal = incidentDirection.dot(normal) >= 0 ? normal : normal.multiply(-1);
    const sinThetaI = incidentDirection.dot(tangent);
    const sinThetaM = sinThetaI + order * wavelengthPixels / gratingPeriodPixels;

    if (Math.abs(sinThetaM) > 1 + 1e-9) return null;

    const clampedSinThetaM = Math.max(-1, Math.min(1, sinThetaM));
    const cosThetaM = Math.sqrt(Math.max(0, 1 - clampedSinThetaM * clampedSinThetaM));
    return propagationNormal.multiply(cosThetaM)
        .add(tangent.multiply(clampedSinThetaM))
        .normalize();
}

export function fiberCouplingFactor(cosThetaFacet, minCosFacet, radialDistance, coreRadius) {
    if (cosThetaFacet < minCosFacet - 1e-6) return 0;

    const angleFactor = minCosFacet < 1.0 - 1e-9
        ? Math.max(0, Math.min(1, (cosThetaFacet - minCosFacet) / (1.0 - minCosFacet)))
        : 1.0;

    const positionFactor = coreRadius < 1e-6
        ? 1.0
        : Math.max(0, 1.0 - (radialDistance / coreRadius));

    return Math.max(0, Math.min(1, angleFactor * positionFactor));
}

export function complexAbs2(value) {
    return value.re * value.re + value.im * value.im;
}

export function complexScale(value, scale) {
    return { re: value.re * scale, im: value.im * scale };
}

export function complexAdd(a, b) {
    return { re: a.re + b.re, im: a.im + b.im };
}

export function complexSub(a, b) {
    return { re: a.re - b.re, im: a.im - b.im };
}

export function complexMul(a, b) {
    return {
        re: a.re * b.re - a.im * b.im,
        im: a.re * b.im + a.im * b.re
    };
}

export function jonesIntensity(jones) {
    if (!jones || !jones.Ex || !jones.Ey) return 0;
    return complexAbs2(jones.Ex) + complexAbs2(jones.Ey);
}

export function normalizeJones(jones) {
    const intensity = jonesIntensity(jones);
    if (intensity <= 1e-12) return jones;
    const scale = 1 / Math.sqrt(intensity);
    return {
        Ex: complexScale(jones.Ex, scale),
        Ey: complexScale(jones.Ey, scale)
    };
}

export function jonesLinear(angleRad) {
    const c = Math.cos(angleRad);
    const s = Math.sin(angleRad);
    return {
        Ex: { re: c, im: 0 },
        Ey: { re: s, im: 0 }
    };
}

export function jonesCircular(rightHanded = true) {
    const inv = 1 / Math.sqrt(2);
    return rightHanded
        ? { Ex: { re: inv, im: 0 }, Ey: { re: 0, im: inv } }
        : { Ex: { re: inv, im: 0 }, Ey: { re: 0, im: -inv } };
}

export function jonesRotationMatrix(theta) {
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    return [
        [{ re: c, im: 0 }, { re: -s, im: 0 }],
        [{ re: s, im: 0 }, { re: c, im: 0 }]
    ];
}

export function applyJonesMatrix(matrix, jones) {
    return {
        Ex: complexAdd(
            complexMul(matrix[0][0], jones.Ex),
            complexMul(matrix[0][1], jones.Ey)
        ),
        Ey: complexAdd(
            complexMul(matrix[1][0], jones.Ex),
            complexMul(matrix[1][1], jones.Ey)
        )
    };
}

export function linearPolarizationProjector(axisAngleRad) {
    const c = Math.cos(axisAngleRad);
    const s = Math.sin(axisAngleRad);
    return [
        [{ re: c * c, im: 0 }, { re: c * s, im: 0 }],
        [{ re: c * s, im: 0 }, { re: s * s, im: 0 }]
    ];
}

export function projectJonesLinear(jones, axisAngleRad) {
    return applyJonesMatrix(linearPolarizationProjector(axisAngleRad), jones);
}

export function splitJonesByPBS(jones, pAxisAngleRad) {
    const transmittedJones = projectJonesLinear(jones, pAxisAngleRad);
    const reflectedJones = projectJonesLinear(jones, pAxisAngleRad + Math.PI / 2);
    const inputIntensity = jonesIntensity(jones);
    const transmittedScale = inputIntensity > 1e-12
        ? jonesIntensity(transmittedJones) / inputIntensity
        : 0;
    const reflectedScale = inputIntensity > 1e-12
        ? jonesIntensity(reflectedJones) / inputIntensity
        : 0;

    return {
        transmittedJones,
        reflectedJones,
        transmittedScale,
        reflectedScale
    };
}

export function splitJonesByOrthogonalAxes(jones, primaryAxisAngleRad) {
    const primaryJones = projectJonesLinear(jones, primaryAxisAngleRad);
    const secondaryJones = projectJonesLinear(jones, primaryAxisAngleRad + Math.PI / 2);
    const inputIntensity = jonesIntensity(jones);
    const primaryScale = inputIntensity > 1e-12
        ? jonesIntensity(primaryJones) / inputIntensity
        : 0.5;
    const secondaryScale = inputIntensity > 1e-12
        ? jonesIntensity(secondaryJones) / inputIntensity
        : 0.5;

    return {
        primaryJones,
        secondaryJones,
        primaryScale,
        secondaryScale
    };
}

export function transformJonesByRetarder(jones, retarderMatrix, fastAxisAngleRad) {
    const toLocal = jonesRotationMatrix(-fastAxisAngleRad);
    const toWorld = jonesRotationMatrix(fastAxisAngleRad);
    const localInput = applyJonesMatrix(toLocal, jones);
    const localOutput = applyJonesMatrix(retarderMatrix, localInput);
    return applyJonesMatrix(toWorld, localOutput);
}
