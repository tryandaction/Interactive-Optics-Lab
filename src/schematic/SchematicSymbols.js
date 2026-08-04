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

function symbolBody(type) {
    if (type === 'LaserSource' || type === 'Laser') return laserSymbol();
    if (type === 'AcoustoOpticModulator' || type === 'AOM') return aomSymbol();
    if (type === 'Mirror') return mirrorSymbol();
    if (type === 'BeamSplitter' || type === 'PBS') return splitterSymbol();
    if (type === 'WavePlate' || type === 'HalfWavePlate' || type === 'QuarterWavePlate') return wavePlateSymbol();
    if (type === 'AtomicCell') return atomicCellSymbol();
    return genericSymbol();
}

export function renderSchematicSymbol(component, placement = {}) {
    const id = safeId(component.id);
    const x = Number(placement.x) || 0;
    const y = Number(placement.y) || 0;
    const angle = Number(placement.angleDeg) || 0;
    return `<g id="component-${id}" class="schematic-component" data-component-id="${escapeXml(component.id)}" data-component-type="${escapeXml(component.type)}" transform="translate(${x} ${y}) rotate(${angle})">
        ${symbolBody(component.type)}
    </g>`;
}

export { escapeXml };
