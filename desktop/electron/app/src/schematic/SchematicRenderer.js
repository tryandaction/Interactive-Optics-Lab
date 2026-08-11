import { normalizeOpticsDocument } from '../document/index.js';
import { escapeXml, renderSchematicSymbol } from './SchematicSymbols.js';

function componentId(endpoint) {
    return endpoint?.componentId || endpoint?.nodeId || endpoint?.id || null;
}

function routePath(from, to, points) {
    const route = Array.isArray(points) && points.length
        ? [{ x: from.x, y: from.y }, ...points, { x: to.x, y: to.y }]
        : [{ x: from.x, y: from.y }, { x: (from.x + to.x) / 2, y: from.y }, { x: (from.x + to.x) / 2, y: to.y }, { x: to.x, y: to.y }];
    return route.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

function wavelengthColor(path) {
    const wavelength = Number(path.wavelengthNm);
    if (wavelength >= 495 && wavelength < 570) return '#17834b';
    if (wavelength >= 450 && wavelength < 495) return '#2767b0';
    if (wavelength >= 380 && wavelength < 450) return '#6547a5';
    return '#d7263d';
}

function serializeDataValue(value) {
    if (value === null || value === undefined) return null;
    return typeof value === 'string' ? value : JSON.stringify(value);
}

function renderPath(path, placements, options = {}) {
    const from = placements[componentId(path.from)];
    const to = placements[componentId(path.to)];
    if (!from || !to) return '';
    const dashed = path.style === 'dashed' || path.auxiliary === true;
    const normal = path.surfaceNormal;
    const polarization = serializeDataValue(path.polarization);
    const attributes = [
        `data-path-id="${escapeXml(path.id)}"`,
        `data-round-trip="${path.roundTrip === true}"`,
        `data-branch-kind="${escapeXml(path.branchKind || 'output')}"`,
        `data-auxiliary="${path.auxiliary === true}"`,
        Number.isFinite(path.wavelengthNm) ? `data-wavelength-nm="${path.wavelengthNm}"` : '',
        Number.isFinite(path.intensity) ? `data-intensity="${path.intensity}"` : '',
        polarization !== null ? `data-polarization="${escapeXml(polarization)}"` : '',
        `data-frequency-offset-hz="${Number(path.frequencyOffsetHz) || 0}"`,
        path.interactionType ? `data-interaction-type="${escapeXml(path.interactionType)}"` : '',
        path.surfaceId ? `data-surface-id="${escapeXml(path.surfaceId)}"` : '',
        Number.isFinite(normal?.x) ? `data-surface-normal-x="${normal.x}"` : '',
        Number.isFinite(normal?.y) ? `data-surface-normal-y="${normal.y}"` : '',
        `d="${routePath(from, to, path.points)}"`,
        'fill="none"',
        `stroke="${wavelengthColor(path)}"`,
        'stroke-width="2"',
        'vector-effect="non-scaling-stroke"',
        dashed ? 'stroke-dasharray="10 7"' : '',
        'stroke-linecap="round"',
        'stroke-linejoin="round"'
    ].filter(Boolean).join(' ');
    const primary = `<path class="schematic-path" ${attributes}/>`;
    const hitTarget = options.interactive
        ? `<path class="schematic-path-hit" data-path-id="${escapeXml(path.id)}" d="${routePath(from, to, path.points)}" fill="none" stroke="transparent" stroke-width="16" vector-effect="non-scaling-stroke"/>`
        : '';
    if (!path.roundTrip) return `${hitTarget}${primary}`;
    return `${hitTarget}${primary}<path class="schematic-path round-trip-return" ${attributes} transform="translate(0 6)" opacity="0.72"/>`;
}

function renderLabels(components, placements) {
    return components.map(component => {
        const placement = placements[component.id];
        if (!placement) return '';
        const offset = placement.labelOffset || { x: 0, y: 48 };
        return `<text data-label-for="${escapeXml(component.id)}" x="${placement.x + (Number(offset.x) || 0)}" y="${placement.y + (Number(offset.y) || 0)}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#20252b">${escapeXml(component.name || component.type)}</text>`;
    }).join('');
}

function renderAnnotations(annotations, placements) {
    return annotations.filter(annotation => annotation.view === 'schematic').map(annotation => {
        const anchor = placements[componentId(annotation.anchor)] || { x: 0, y: 0 };
        const position = annotation.position || {};
        return `<text data-annotation-id="${escapeXml(annotation.id)}" x="${anchor.x + (Number(position.x) || 0)}" y="${anchor.y + (Number(position.y) || 0)}" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="#343b42">${escapeXml(annotation.text)}</text>`;
    }).join('');
}

export function renderSchematicSvg(sourceDocument, options = {}) {
    const document = normalizeOpticsDocument(sourceDocument);
    const view = document.views.schematic;
    const page = { ...view.page, ...options.page };
    const paths = view.paths.map(path => renderPath(path, view.placements, options)).join('');
    const terminationComponents = view.terminationNodes.map(node => ({
        id: node.id,
        type: 'Termination',
        name: node.reason || 'terminated'
    }));
    const renderableComponents = [...document.components, ...terminationComponents];
    const symbols = renderableComponents
        .filter(component => view.placements[component.id])
        .sort((left, right) =>
            (Number(view.placements[left.id].zIndex) || 0) - (Number(view.placements[right.id].zIndex) || 0)
        )
        .map(component => renderSchematicSymbol(component, view.placements[component.id]))
        .join('');
    const labels = renderLabels(renderableComponents, view.placements);
    const annotations = renderAnnotations(document.annotations, view.placements);

    return `<svg xmlns="http://www.w3.org/2000/svg" class="opticslab-schematic" role="img" aria-label="Optical setup schematic" viewBox="0 0 ${page.width} ${page.height}" width="${page.width}" height="${page.height}">
    <rect id="page-boundary" x="0" y="0" width="${page.width}" height="${page.height}" fill="${escapeXml(page.background)}"/>
    <g id="layer-beams">${paths}</g>
    <g id="layer-components">${symbols}</g>
    <g id="layer-labels">${labels}${annotations}</g>
</svg>`;
}
