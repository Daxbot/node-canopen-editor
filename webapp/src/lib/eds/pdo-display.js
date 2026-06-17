/**
 * PDO display helpers — editor-only UI utilities for rendering PDO bit maps.
 */

export const PDO_MAX_BITS = 64;

// Colors cycling through PDO slots (dark-theme safe)
export const SLOT_COLORS = [
    '#1d4a4a',
    '#4a3d1a',
    '#1a2d4a',
    '#2a4a1a',
    '#4a1a2d',
    '#1a4a3d',
    '#4a2a1a',
    '#2a1a4a',
];

/**
 * Compute display segments for a PDO row's bit visualisation.
 * @param {Array} mappings
 * @param {object} objects - EdsModel objects dictionary
 * @returns {Array<{isEmpty: boolean, bits: number, label: string, shortLabel: string, mapping: object|undefined, colorIndex: number|undefined}>}
 */
export function computePdoSegments(mappings, objects) {
    const segments = [];
    let used = 0;

    (mappings || []).forEach((m, colorIdx) => {
        const obj = objects?.[m.index];
        let name = '';
        if (obj) {
            if (m.subIndex === 0 || !obj.subObjects) {
                name = obj.parameterName || '';
            }
            else {
                name = obj.subObjects?.[m.subIndex]?.parameterName || obj.parameterName || '';
            }
        }
        const hexIdx = `0x${m.index.toString(16).toUpperCase().padStart(4, '0')}`;
        const hexSub = `0x${m.subIndex.toString(16).toUpperCase().padStart(2, '0')}`;
        segments.push({
            isEmpty: false,
            bits: m.bits,
            label: `${hexIdx}/${hexSub}/${name}`,
            shortLabel: name ? `${hexIdx}/${hexSub}/${name}` : `${hexIdx}/${hexSub}`,
            mapping: m,
            colorIndex: colorIdx,
        });
        used += m.bits;
    });

    if (used < PDO_MAX_BITS) {
        segments.push({ isEmpty: true, bits: PDO_MAX_BITS - used, label: 'Empty' });
    }

    return segments;
}
