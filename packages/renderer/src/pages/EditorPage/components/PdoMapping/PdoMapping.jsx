import { useState, useCallback } from 'react';
import {
    getTxPdos, getRxPdos,
    getPdoMappableObjects,
    writePdoToObjects,
    addNewPdo,
    deletePdo,
    getMappingBitUsage,
    DataTypeName,
} from '../../../../lib/eds/index.js';
import {
    computePdoSegments,
    PDO_MAX_BITS,
    SLOT_COLORS,
} from '../../../../lib/eds/pdo-display.js';
import { useDialog } from '../../../../components/Dialog/DialogProvider.jsx';
import styles from './PdoMapping.module.css';

// ─── Hex formatting helpers ───────────────────────────────────────────────────

function hex4(n) { return `0x${n.toString(16).toUpperCase().padStart(4, '0')}`; }
function hex2(n) { return `0x${n.toString(16).toUpperCase().padStart(2, '0')}`; }
function hex3(n) { return `0x${n.toString(16).toUpperCase().padStart(3, '0')}`; }

// ─── Bytes header bar (shown above the grid bit area) ────────────────────────

const BYTE_COUNT = 8;

function ByteHeader() {
    return (
        <div className={styles['byte-header']}>
            {Array.from({ length: BYTE_COUNT }, (_, i) => (
                <div key={i} className={styles['byte-cell']}>
                    <span className={styles['byte-label']}>Byte {i}</span>
                    <span className={styles['byte-bit']}>{i * 8}</span>
                </div>
            ))}
        </div>
    );
}

// ─── PDO slot (single mapped object or empty remainder) ──────────────────────

function PdoSlot({ segment, onRemove, isDragOver }) {
    if (segment.isEmpty) {
        return (
            <div
                className={`${styles.slot} ${styles['slot-empty']} ${isDragOver ? styles['slot-dragover'] : ''}`}
                style={{ flex: segment.bits }}
                title={`Empty — ${segment.bits} bits available. Drop an object here.`}
            >
                <span className={styles['slot-text']}>Empty</span>
            </div>
        );
    }

    const bg = SLOT_COLORS[segment.colorIndex % SLOT_COLORS.length];
    return (
        <div
            className={styles.slot}
            style={{ flex: segment.bits, background: bg }}
            onClick={onRemove}
            title={`${segment.label} (${segment.bits} bits) — click to remove`}
        >
            <span className={styles['slot-text']}>{segment.shortLabel}</span>
        </div>
    );
}

// ─── Single PDO grid row ──────────────────────────────────────────────────────

function PdoRow({ pdo, isSelected, objects, onSelect, onDropObject, onRemoveMapping }) {
    const [dragOver, setDragOver] = useState(false);
    const segments = computePdoSegments(pdo.mappings, objects);
    const usedBits = getMappingBitUsage(pdo.mappings);

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setDragOver(true);
    }

    function handleDragLeave() { setDragOver(false); }

    function handleDrop(e) {
        e.preventDefault();
        setDragOver(false);
        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            onDropObject(pdo.id, data);
        }
        catch { /* ignore bad data */ }
    }

    return (
        <div
            className={`${styles['pdo-row']} ${isSelected ? styles['pdo-row-selected'] : ''}`}
            onClick={() => onSelect(pdo.id)}
        >
            <div className={styles['pdo-cell-id']}>{pdo.id}</div>
            <div className={styles['pdo-cell-cob']}>{hex3(pdo.cobId)}</div>
            <div className={styles['pdo-cell-idx']}>{hex4(pdo.commIndex)}</div>

            <div
                className={`${styles['pdo-bits']} ${dragOver ? styles['bits-dragover'] : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                title={`${usedBits}/${PDO_MAX_BITS} bits used — drop to add`}
            >
                {segments.map((seg, i) => (
                    <PdoSlot
                        key={i}
                        segment={seg}
                        isDragOver={dragOver && seg.isEmpty}
                        onRemove={seg.isEmpty ? undefined : () => onRemoveMapping(pdo.id, seg.mapping)}
                    />
                ))}
            </div>
        </div>
    );
}

// ─── PDO grid (header + all rows) ─────────────────────────────────────────────

function PdoGrid({ pdos, selectedPdoId, objects, onSelectPdo, onDropObject, onRemoveMapping }) {
    if (pdos.length === 0) {
        return (
            <div className={styles['grid-empty']}>
                No PDOs defined. Click &quot;Add new PDO&quot; to create one.
            </div>
        );
    }

    return (
        <div className={styles['pdo-grid']}>
            {/* Header row */}
            <div className={styles['grid-header']}>
                <div className={styles['pdo-cell-id']}>ID</div>
                <div className={styles['pdo-cell-cob']}>COB</div>
                <div className={styles['pdo-cell-idx']}>Index</div>
                <ByteHeader />
            </div>

            {/* PDO rows */}
            {pdos.map(pdo => (
                <PdoRow
                    key={pdo.id}
                    pdo={pdo}
                    isSelected={selectedPdoId === pdo.id}
                    objects={objects}
                    onSelect={onSelectPdo}
                    onDropObject={onDropObject}
                    onRemoveMapping={onRemoveMapping}
                />
            ))}
        </div>
    );
}

// ─── Available objects list ───────────────────────────────────────────────────

function AvailableObjects({ objects }) {
    const items = getPdoMappableObjects(objects);

    function handleDragStart(e, item) {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', JSON.stringify(item));
    }

    return (
        <div className={styles['avail-panel']}>
            <div className={styles['avail-header']}>Available Objects for PDO</div>
            <div className={styles['avail-cols']}>
                <span>Index</span>
                <span>Sub</span>
                <span className={styles['avail-name-col']}>Name</span>
                <span>Datatype</span>
                <span>Bits</span>
            </div>
            <div className={styles['avail-list']}>
                {items.map(item => (
                    <div
                        key={`${item.index}/${item.subIndex}`}
                        className={styles['avail-row']}
                        draggable
                        onDragStart={e => handleDragStart(e, item)}
                        title={`Drag onto a PDO row to map this object`}
                    >
                        <span>{hex4(item.index)}</span>
                        <span>{hex2(item.subIndex)}</span>
                        <span className={styles['avail-name-col']}>{item.name}</span>
                        <span>{DataTypeName[item.dataType] ?? '—'}</span>
                        <span>{item.bits}</span>
                    </div>
                ))}
                {items.length === 0 && (
                    <div className={styles['avail-empty']}>
                        No PDO-mappable objects in the dictionary.
                        <br />Set &quot;PDO Mapping&quot; to true on an object in the Object Dictionary tab.
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Communication parameters panel ──────────────────────────────────────────

function CommParams({ pdo, onChange }) {
    const [cobInput, setCobInput] = useState('');
    const [cobFocus, setCobFocus] = useState(false);

    const cobDisplay = cobFocus
        ? cobInput
        : (pdo ? hex4(pdo.cobId) : '');

    function set(key, val) { onChange({ ...pdo, [key]: val }); }

    function handleCobBlur() {
        setCobFocus(false);
        if (!pdo) return;
        const s = cobInput.trim();
        const v = /^0x/i.test(s) ? parseInt(s, 16) : parseInt(s, 10);
        if (!isNaN(v)) set('cobId', v & 0x7FF);
    }

    return (
        <div className={styles['comm-panel']}>
            <div className={styles['comm-title']}>Communication parameters</div>
            {!pdo ? (
                <div className={styles['comm-empty']}>Select a PDO row</div>
            ) : (
                <div className={styles['comm-fields']}>
                    <div className={styles['comm-field']}>
                        <span>Communication</span>
                        <input readOnly value={hex4(pdo.commIndex)} />
                    </div>
                    <div className={styles['comm-field']}>
                        <span>Mapping</span>
                        <input readOnly value={hex4(pdo.mappingIndex)} />
                    </div>
                    <div className={styles['comm-field']}>
                        <span>COB</span>
                        <input
                            value={cobDisplay}
                            onFocus={() => { setCobFocus(true); setCobInput(hex4(pdo.cobId)); }}
                            onChange={e => setCobInput(e.target.value)}
                            onBlur={handleCobBlur}
                        />
                    </div>
                    <div className={styles['comm-field']}>
                        <span>Type</span>
                        <input
                            type="number" min={0} max={255}
                            value={pdo.transmissionType ?? ''}
                            onChange={e => set('transmissionType', parseInt(e.target.value, 10))}
                        />
                    </div>
                    <div className={styles['comm-field']}>
                        <span>Inhibit</span>
                        <input
                            type="number" min={0}
                            value={pdo.inhibitTime ?? 0}
                            onChange={e => set('inhibitTime', parseInt(e.target.value, 10))}
                        />
                    </div>
                    <div className={styles['comm-field']}>
                        <span>Event Timer</span>
                        <input
                            type="number" min={0}
                            value={pdo.eventTimer ?? 0}
                            onChange={e => set('eventTimer', parseInt(e.target.value, 10))}
                        />
                    </div>
                    <div className={styles['comm-field']}>
                        <span>Sync start</span>
                        <input
                            type="number" min={0}
                            value={pdo.syncStart ?? 0}
                            onChange={e => set('syncStart', parseInt(e.target.value, 10))}
                        />
                    </div>
                    <div className={styles['comm-field']}>
                        <span>Invalid</span>
                        <label className={styles['invalid-check']}>
                            <input
                                type="checkbox"
                                checked={!!pdo.disabled}
                                onChange={e => set('disabled', e.target.checked)}
                            />
                            <span>Disabled</span>
                        </label>
                    </div>
                    <div className={styles['comm-bits']}>
                        {getMappingBitUsage(pdo.mappings)}/{PDO_MAX_BITS} bits used
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PdoMapping({ objects, isRx, onObjectsChange }) {
    const dialog = useDialog();
    const [selectedPdoId, setSelectedPdoId] = useState(null);

    const pdos = isRx ? getRxPdos(objects) : getTxPdos(objects);
    const selectedPdo = pdos.find(p => p.id === selectedPdoId) ?? null;

    // ── Comm param edits ───────────────────────────────────────────────────

    const handleCommChange = useCallback((updatedPdo) => {
        onObjectsChange(writePdoToObjects(objects, updatedPdo, isRx));
    }, [objects, isRx, onObjectsChange]);

    // ── Drop object onto PDO row ──────────────────────────────────────────

    const handleDropObject = useCallback((pdoId, item) => {
        const pdo = pdos.find(p => p.id === pdoId);
        if (!pdo) return;

        const used = getMappingBitUsage(pdo.mappings);
        if (used + item.bits > PDO_MAX_BITS) {
            dialog.alert({
                title: 'PDO full',
                message: `Cannot add ${item.bits}-bit object — only ${PDO_MAX_BITS - used} bits remaining in PDO ${pdoId}.`,
            });
            return;
        }
        if (pdo.mappings.length >= 8) {
            dialog.alert({ title: 'PDO full', message: 'A PDO can map at most 8 objects.' });
            return;
        }

        const updated = {
            ...pdo,
            mappings: [...pdo.mappings, { index: item.index, subIndex: item.subIndex, bits: item.bits }],
        };
        onObjectsChange(writePdoToObjects(objects, updated, isRx));
        setSelectedPdoId(pdoId);
    }, [pdos, objects, isRx, onObjectsChange, dialog]);

    // ── Remove mapping ────────────────────────────────────────────────────

    const handleRemoveMapping = useCallback((pdoId, mapping) => {
        const pdo = pdos.find(p => p.id === pdoId);
        if (!pdo) return;
        const updated = {
            ...pdo,
            mappings: pdo.mappings.filter(
                m => !(m.index === mapping.index && m.subIndex === mapping.subIndex)
            ),
        };
        onObjectsChange(writePdoToObjects(objects, updated, isRx));
    }, [pdos, objects, isRx, onObjectsChange]);

    // ── Add / delete PDO ──────────────────────────────────────────────────

    function handleAddPdo() {
        const updated = addNewPdo(objects, isRx);
        onObjectsChange(updated);
        // Select the new PDO
        const newPdos = isRx ? getRxPdos(updated) : getTxPdos(updated);
        const last = newPdos[newPdos.length - 1];
        if (last) setSelectedPdoId(last.id);
    }

    async function handleDeletePdo() {
        if (!selectedPdoId) return;
        const ok = await dialog.confirm({
            title: 'Delete PDO',
            message: `Delete PDO ${selectedPdoId}?`,
            confirmLabel: 'Delete',
            danger: true,
        });
        if (!ok) return;
        onObjectsChange(deletePdo(objects, selectedPdoId, isRx));
        setSelectedPdoId(null);
    }

    const title = isRx ? 'RX PDO Mapping' : 'TX PDO Mapping';

    return (
        <div className={styles.page}>
            {/* Top section: available objects + comm params */}
            <div className={styles['top-section']}>
                <AvailableObjects objects={objects} />

                <div className={styles['right-section']}>
                    <CommParams
                        pdo={selectedPdo}
                        onChange={handleCommChange}
                    />
                    <div className={styles.actions}>
                        <button className="primary" onClick={handleAddPdo}>
                            + Add new PDO
                        </button>
                        <button
                            className="danger"
                            disabled={!selectedPdoId}
                            onClick={handleDeletePdo}
                        >
                            Delete PDO
                        </button>
                    </div>
                </div>
            </div>

            {/* PDO grid */}
            <div className={styles['grid-section']}>
                <div className={styles['grid-title']}>{title}</div>
                <div className={styles['grid-scroll']}>
                    <PdoGrid
                        pdos={pdos}
                        selectedPdoId={selectedPdoId}
                        objects={objects}
                        onSelectPdo={setSelectedPdoId}
                        onDropObject={handleDropObject}
                        onRemoveMapping={handleRemoveMapping}
                    />
                </div>
            </div>
        </div>
    );
}
