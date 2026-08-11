const input = (id = 'input', role = 'input') => ({ id, kind: 'input', role });
const output = (id = 'output', role = 'output') => ({ id, kind: 'output', role });

const PORTS = new Map();

function register(types, ports) {
    types.forEach(type => PORTS.set(type, ports));
}

register([
    'LaserSource', 'FanSource', 'LineSource', 'WhiteLightSource',
    'PointSource', 'LEDSource', 'PulsedLaserSource'
], [output()]);

register([
    'Mirror', 'SphericalMirror', 'ParabolicMirror', 'DichroicMirror',
    'MetallicMirror', 'RingMirror'
], [input(), output('reflected', 'reflected')]);

register(['BeamSplitter'], [
    input(),
    output('transmitted', 'transmitted'),
    output('reflected', 'reflected')
]);

register(['AcoustoOpticModulator'], [
    input(),
    output('zeroOrder', 'zeroOrder'),
    output('firstOrder', 'firstOrder')
]);

// Visual-only atomic cells terminate an incoming beam; they do not claim physical transmission.
register(['AtomicCell'], [input()]);

register(['ThinLens'], [input(), output(), output('transmitted', 'transmitted'), output('reflected', 'reflected')]);

register([
    'CylindricalLens', 'AsphericLens', 'GRINLens',
    'Polarizer', 'WavePlate', 'HalfWavePlate', 'QuarterWavePlate',
    'FaradayRotator', 'FaradayIsolator', 'DielectricBlock',
    'Prism', 'DiffractionGrating', 'Aperture', 'Screen', 'Photodiode',
    'CCDCamera', 'Spectrometer', 'PowerMeter', 'PolarizationAnalyzer',
    'ElectroOpticModulator', 'VariableAttenuator', 'OpticalChopper',
    'FabryPerotCavity', 'WollastonPrism', 'OpticalFiber'
], [input(), output()]);

function copyPorts(ports) {
    return ports.map(port => ({ ...port }));
}

export class ComponentPortRegistry {
    static getPorts(componentOrType) {
        const type = typeof componentOrType === 'string'
            ? componentOrType
            : componentOrType?.type || componentOrType?.constructor?.name;
        return copyPorts(PORTS.get(type) || [input(), output()]);
    }

    static resolveInputPort(componentOrType) {
        return ComponentPortRegistry.getPorts(componentOrType).find(port => port.kind === 'input') || null;
    }

    static resolveOutputPort(componentOrType, context = {}) {
        const ports = ComponentPortRegistry.getPorts(componentOrType);
        const branch = context.branchKind || context.role;
        if (branch) {
            const semantic = ports.find(port => port.kind === 'output' && (port.id === branch || port.role === branch));
            if (semantic) return semantic;
        }
        return ports.find(port => port.kind === 'output') || null;
    }

    static hasPort(componentOrType, portId) {
        return ComponentPortRegistry.getPorts(componentOrType).some(port => port.id === portId);
    }
}
