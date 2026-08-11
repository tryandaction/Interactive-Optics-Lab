function escapeXml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
}

function safeId(value) {
    return String(value ?? 'component').replace(/[^a-zA-Z0-9_-]/g, '-');
}

const STROKE = 'stroke="#20252b" stroke-width="2" vector-effect="non-scaling-stroke"';

function laserSymbol() {
    return `<rect x="-30" y="-17" width="46" height="34" rx="3" fill="#f7f8f9" ${STROKE}/>
        <circle cx="18" cy="0" r="9" fill="#ffffff" ${STROKE}/>
        <path d="M27 0H42M36 -5L42 0L36 5" fill="none" ${STROKE}/>`;
}

function aomSymbol() {
    return `<rect x="-25" y="-24" width="50" height="48" rx="2" fill="#e9f2ef" ${STROKE}/>
        <path d="M-17 -12H17M-17 0H17M-17 12H17" fill="none" stroke="#277a68" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
        <path d="M-34 0H34" fill="none" stroke="#d7263d" stroke-width="2" vector-effect="non-scaling-stroke"/>`;
}

function mirrorSymbol() {
    return `<path d="M-9 29L9 -29" fill="none" stroke="#20252b" stroke-width="4" vector-effect="non-scaling-stroke"/>
        <path d="M11 -23L21 -18M8 -11L18 -6M4 1L14 6M0 13L10 18" fill="none" stroke="#68727d" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`;
}

function splitterSymbol() {
    return `<rect x="-23" y="-23" width="46" height="46" transform="rotate(45)" fill="#edf4f6" ${STROKE}/>
        <path d="M-32 32L32 -32" fill="none" stroke="#407b8e" stroke-width="2" vector-effect="non-scaling-stroke"/>`;
}

function pbsSymbol() {
    return `<rect x="-23" y="-23" width="46" height="46" transform="rotate(45)" fill="#edf4f6" ${STROKE}/>
        <path d="M-30 30L30 -30" fill="none" stroke="#407b8e" stroke-width="2" vector-effect="non-scaling-stroke"/>
        <path d="M-12 8H12M0 -4V20" fill="none" stroke="#8a4b1f" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`;
}

function lensSymbol(kind) {
    if (kind === 'lens-concave') {
        return `<path d="M-16 -30Q8 0 -16 30M16 -30Q-8 0 16 30" fill="#e9f4f8" ${STROKE}/>`;
    }
    return `<path d="M-10 -30Q22 0 -10 30M10 -30Q-22 0 10 30" fill="#e9f4f8" ${STROKE}/>`;
}

function polarizerSymbol() {
    return `<circle cx="0" cy="0" r="24" fill="#f7f3df" ${STROKE}/>
        <path d="M-16 16L16 -16" fill="none" stroke="#9a7b20" stroke-width="3" vector-effect="non-scaling-stroke"/>`;
}

function prismSymbol() {
    return `<path d="M-28 24L0 -30L28 24Z" fill="#e9f4f8" ${STROKE}/>`;
}

function gratingSymbol() {
    return `<rect x="-10" y="-30" width="20" height="60" fill="#f1f1f1" ${STROKE}/>
        <path d="M-7 -24H7M-7 -16H7M-7 -8H7M-7 0H7M-7 8H7M-7 16H7M-7 24H7" fill="none" stroke="#68727d" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
}

function fiberSymbol() {
    return `<path d="M-34 0H34" fill="none" stroke="#68727d" stroke-width="10" vector-effect="non-scaling-stroke"/>
        <path d="M-34 0H34" fill="none" stroke="#d7edf5" stroke-width="4" vector-effect="non-scaling-stroke"/>`;
}

function screenSymbol() {
    return `<path d="M0 -32V32" fill="none" stroke="#20252b" stroke-width="4" vector-effect="non-scaling-stroke"/>
        <path d="M-12 -24L0 -32L12 -24M-12 24L0 32L12 24" fill="none" stroke="#68727d" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`;
}

function terminationSymbol() {
    return `<circle cx="0" cy="0" r="16" fill="#fff2f2" ${STROKE}/>
        <path d="M-7 -7L7 7M7 -7L-7 7" fill="none" stroke="#b42318" stroke-width="2" vector-effect="non-scaling-stroke"/>`;
}

function wavePlateSymbol() {
    return `<rect x="-8" y="-30" width="16" height="60" rx="2" fill="#f5f0df" ${STROKE}/>
        <path d="M-16 18L16 -18" fill="none" stroke="#9a7b20" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`;
}

function atomicCellSymbol() {
    return `<rect x="-35" y="-22" width="70" height="44" rx="6" fill="#eef5eb" ${STROKE}/>
        <path d="M-26 0H26M-20 -13V13M20 -13V13" fill="none" stroke="#52864a" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`;
}

function genericSymbol() {
    return `<rect x="-24" y="-20" width="48" height="40" rx="3" fill="#f7f8f9" ${STROKE}/>
        <circle cx="0" cy="0" r="7" fill="none" ${STROKE}/>`;
}

function propertiesOf(component) {
    return component?.properties && typeof component.properties === 'object' ? component.properties : {};
}

function lensSymbolKind(component) {
    const properties = propertiesOf(component);
    const profile = component?.shapeProfile || properties.shapeProfile || {};
    const lensType = String(profile.kind || profile.id || properties.lensType || '').toLowerCase();
    if (lensType.includes('concave') || Number(properties.focalLength) < 0) return 'lens-concave';
    return 'lens-convex';
}

function symbolDefinition(component) {
    const type = component?.type;
    const properties = propertiesOf(component);
    if (type === 'LaserSource' || type === 'Laser') return { kind: 'laser-source', body: laserSymbol() };
    if (type === 'AcoustoOpticModulator' || type === 'AOM') return { kind: 'acousto-optic-modulator', body: aomSymbol() };
    if (type === 'Mirror' || type === 'SphericalMirror' || type === 'ParabolicMirror') return { kind: 'mirror', body: mirrorSymbol() };
    if (type === 'ThinLens' || type === 'CylindricalLens' || type === 'AsphericLens' || type === 'GRINLens') {
        const kind = lensSymbolKind(component);
        return { kind, body: lensSymbol(kind) };
    }
    if (type === 'PBS' || (type === 'BeamSplitter' && String(properties.splitterType || properties.type || '').toUpperCase() === 'PBS')) {
        return { kind: 'polarizing-beam-splitter', body: pbsSymbol() };
    }
    if (type === 'BeamSplitter') return { kind: 'beam-splitter', body: splitterSymbol() };
    if (type === 'WavePlate' || type === 'HalfWavePlate' || type === 'QuarterWavePlate') return { kind: 'wave-plate', body: wavePlateSymbol() };
    if (type === 'Polarizer' || type === 'PolarizationAnalyzer') return { kind: 'polarizer', body: polarizerSymbol() };
    if (type === 'Prism') return { kind: 'prism', body: prismSymbol() };
    if (type === 'DiffractionGrating') return { kind: 'diffraction-grating', body: gratingSymbol() };
    if (type === 'OpticalFiber') return { kind: 'optical-fiber', body: fiberSymbol() };
    if (type === 'Screen' || type === 'Photodiode' || type === 'CCDCamera' || type === 'Spectrometer') return { kind: 'screen', body: screenSymbol() };
    if (type === 'AtomicCell') return { kind: 'atomic-cell', body: atomicCellSymbol() };
    if (type === 'Termination' || type === 'termination') return { kind: 'termination', body: terminationSymbol() };
    return { kind: 'generic', body: genericSymbol() };
}

export function renderSchematicSymbol(component, placement = {}) {
    const id = safeId(component.id);
    const x = Number(placement.x) || 0;
    const y = Number(placement.y) || 0;
    const angle = Number(placement.angleDeg) || 0;
    const symbol = symbolDefinition(component);
    return `<g id="component-${id}" class="schematic-component" data-component-id="${escapeXml(component.id)}" data-component-type="${escapeXml(component.type)}" data-symbol-kind="${symbol.kind}" transform="translate(${x} ${y}) rotate(${angle})">
        ${symbol.body}
    </g>`;
}

export { escapeXml };
