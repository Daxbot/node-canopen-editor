/**
 * PDO display helpers — editor-only UI utilities for rendering PDO bit maps.
 */

// Imported from the source package (not the ./index.js barrel) to avoid a
// circular import, since the barrel re-exports this file.
import { getMappingBitUsage } from 'canopen-eds';

export const PDO_MAX_BITS = 64;
export const PDO_MAX_MAPPINGS = 8;

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
 * Resolve the display name + hex labels for a single mapping entry.
 * @param {object} m - mapping entry ({ index, subIndex, bits })
 * @param {object} objects - EdsModel objects dictionary
 * @returns {{ label: string, shortLabel: string }}
 */
export function mappingLabel(m, objects) {
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
    return {
        label: `${hexIdx}/${hexSub}/${name}`,
        shortLabel: name ? `${hexIdx}/${hexSub}/${name}` : `${hexIdx}/${hexSub}`,
    };
}

/**
 * Compute display segments for a PDO row's bit visualisation.
 * @param {Array} mappings
 * @param {object} objects - EdsModel objects dictionary
 * @returns {Array<{isEmpty: boolean, bits: number, startBit: number, label: string, shortLabel: string, mapping: object|undefined, colorIndex: number|undefined}>}
 */
export function computePdoSegments(mappings, objects) {
    const segments = [];
    let used = 0;

    (mappings || []).forEach((m, colorIdx) => {
        const { label, shortLabel } = mappingLabel(m, objects);
        segments.push({
            isEmpty: false,
            bits: m.bits,
            startBit: used,
            label,
            shortLabel,
            mapping: m,
            colorIndex: colorIdx,
        });
        used += m.bits;
    });

    if (used < PDO_MAX_BITS) {
        segments.push({ isEmpty: true, bits: PDO_MAX_BITS - used, startBit: used, label: 'Empty' });
    }

    return segments;
}

/**
 * Map a 0–1 horizontal fraction of the bit area to an insertion index in the
 * mappings array. Snaps to the nearest gap between mapped objects: the result is
 * the count of existing mappings whose midpoint sits before the hovered bit.
 * @param {Array} mappings
 * @param {number} fraction - 0..1 horizontal position within the bit area
 * @returns {number} insertion index (0..mappings.length)
 */
export function hoveredInsertIndex(mappings, fraction) {
    const clamped = Math.max(0, Math.min(1, fraction));
    const hoveredBit = clamped * PDO_MAX_BITS;
    let used = 0;
    let index = 0;
    for (const m of (mappings || [])) {
        const midpoint = used + m.bits / 2;
        if (midpoint <= hoveredBit) index += 1;
        else break;
        used += m.bits;
    }
    return index;
}

/**
 * Build the drag-preview segment list for a hovered insertion.
 * @param {Array} mappings - current PDO mappings
 * @param {object} objects - EdsModel objects dictionary
 * @param {number} insertIndex - where the dragged object would be inserted
 * @param {object} dragItem - { index, subIndex, bits } of the dragged object
 * @returns {{ segments: Array, overflow: boolean }}
 */
export function buildDragPreview(mappings, objects, insertIndex, dragItem) {
    const list = mappings || [];
    const used = getMappingBitUsage(list);
    const overflow = used + dragItem.bits > PDO_MAX_BITS || list.length >= PDO_MAX_MAPPINGS;

    const { label, shortLabel } = mappingLabel(dragItem, objects);

    if (overflow) {
        // Render the hologram in-place (after the existing objects, clamped to
        // the remaining width) without shifting anything; it signals "won't fit".
        const segments = computePdoSegments(list, objects).filter(s => !s.isEmpty);
        const remaining = Math.max(0, PDO_MAX_BITS - used);
        segments.push({
            isHologram: true,
            overflow: true,
            bits: dragItem.bits,
            startBit: Math.min(used, PDO_MAX_BITS - remaining),
            label,
            shortLabel,
        });
        return { segments, overflow };
    }

    const previewMappings = [...list];
    previewMappings.splice(insertIndex, 0, dragItem);

    const segments = [];
    let offset = 0;
    let colorIdx = 0;
    previewMappings.forEach((m, i) => {
        if (i === insertIndex) {
            segments.push({
                isHologram: true,
                overflow: false,
                bits: dragItem.bits,
                startBit: offset,
                label,
                shortLabel,
            });
        }
        else {
            const lbl = mappingLabel(m, objects);
            segments.push({
                isEmpty: false,
                bits: m.bits,
                startBit: offset,
                label: lbl.label,
                shortLabel: lbl.shortLabel,
                mapping: m,
                colorIndex: colorIdx,
            });
            colorIdx += 1;
        }
        offset += m.bits;
    });

    return { segments, overflow };
}
