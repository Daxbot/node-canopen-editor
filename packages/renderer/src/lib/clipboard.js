/**
 * Object-Dictionary clipboard payload schema.
 *
 * This module is editor glue, not CANopen domain logic — it is intentionally
 * NOT routed through `lib/eds/index.js`. The renderer owns this schema; the
 * platform FileService implementations only carry it across the OS clipboard.
 *
 * The payload is a marker-tagged JSON envelope so we can recognise our own data
 * when reading back an arbitrary clipboard:
 *
 *   { app, version, kind: 'object',    index,    entry }   // top-level object
 *   { app, version, kind: 'subObject', subIndex, sub   }   // sub-object
 */

const APP_MARKER = 'canopen-editor';
const PAYLOAD_VERSION = 1;

export const CLIPBOARD_KIND = {
    OBJECT: 'object',
    SUB_OBJECT: 'subObject',
};

/** Build a clipboard payload for a top-level object dictionary entry. */
export function buildObjectPayload(index, entry) {
    return {
        app: APP_MARKER,
        version: PAYLOAD_VERSION,
        kind: CLIPBOARD_KIND.OBJECT,
        index: Number(index),
        entry,
    };
}

/** Build a clipboard payload for a single sub-object. */
export function buildSubObjectPayload(subIndex, sub) {
    return {
        app: APP_MARKER,
        version: PAYLOAD_VERSION,
        kind: CLIPBOARD_KIND.SUB_OBJECT,
        subIndex: Number(subIndex),
        sub,
    };
}

/** True if `obj` is a clipboard payload produced by this app. */
export function isValidPayload(obj) {
    return (
        !!obj &&
        typeof obj === 'object' &&
        obj.app === APP_MARKER &&
        obj.version === PAYLOAD_VERSION &&
        (obj.kind === CLIPBOARD_KIND.OBJECT || obj.kind === CLIPBOARD_KIND.SUB_OBJECT)
    );
}
