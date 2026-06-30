import { useState, useCallback, useRef } from 'react';
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
    buildDragPreview,
    hoveredInsertIndex,
    PDO_MAX_BITS,
    SLOT_COLORS,
} from '../../../../lib/eds/pdo-display.js';
import { useDialog } from '../../../../components/Dialog/DialogProvider.jsx';
import { useContextMenu } from '../../hooks/useContextMenu.jsx';
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

// ─── PDO slot (single mapped object or drag hologram) ────────────────────────

function pct(bits) { return `${(bits / PDO_MAX_BITS) * 100}%`; }

function PdoSlot({ segment, isSelected, onSelect, onContextMenu, onDragStart, onDragEnd }) {
    const style = { left: pct(segment.startBit), width: pct(segment.bits) };

    if (segment.isHologram) {
        const cls = `${styles.slot} ${styles['slot-hologram']} ${segment.overflow ? styles['slot-hologram-overflow'] : ''}`;
        return (
            <div className={cls} style={style}>
                <span className={styles['slot-text']}>
                    {segment.overflow ? `Too big (${segment.bits} bits)` : segment.shortLabel}
                </span>
            </div>
        );
    }

    const bg = SLOT_COLORS[segment.colorIndex % SLOT_COLORS.length];
    return (
        <div
            className={`${styles.slot} ${isSelected ? styles['slot-selected'] : ''}`}
            style={{ ...style, background: bg }}
            draggable
            onClick={onSelect}
            onContextMenu={onContextMenu}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            title={`${segment.label} (${segment.bits} bits) — drag to move, click to select, Delete to remove`}
        >
            <span className={styles['slot-text']}>{segment.shortLabel}</span>
        </div>
    );
}

// ─── Single PDO grid row ──────────────────────────────────────────────────────

function PdoRow({
    pdo, isSelected, objects, selectedMapping, draggedItemRef,
    onSelect, onSelectMapping, onDropObject, onMappingContextMenu,
}) {
    const [dragOver, setDragOver] = useState(false);
    const [preview, setPreview] = useState(null);
    const bitsRef = useRef(null);
    const usedBits = getMappingBitUsage(pdo.mappings);

    // When an object already mapped in *this* PDO is being dragged, exclude it
    // from the base mappings so the preview shows it lifted out and sliding.
    function baseMappingsFor(item) {
        if (item?.source?.pdoId === pdo.id) {
            return pdo.mappings.filter(m => `${m.index}/${m.subIndex}` !== item.source.key);
        }
        return pdo.mappings;
    }

    function insertIndexFromEvent(e, base) {
        const rect = bitsRef.current?.getBoundingClientRect();
        if (!rect || rect.width === 0) return base.length;
        const fraction = (e.clientX - rect.left) / rect.width;
        return hoveredInsertIndex(base, fraction);
    }

    function handleSlotDragStart(e, mapping) {
        const item = {
            index: mapping.index,
            subIndex: mapping.subIndex,
            bits: mapping.bits,
            source: { pdoId: pdo.id, key: `${mapping.index}/${mapping.subIndex}` },
        };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify(item));
        draggedItemRef.current = item;
    }

    function handleSlotDragEnd() { draggedItemRef.current = null; }

    function handleDragOver(e) {
        e.preventDefault();
        setDragOver(true);
        const item = draggedItemRef.current;
        if (!item) { e.dataTransfer.dropEffect = 'copy'; return; }
        e.dataTransfer.dropEffect = item.source ? 'move' : 'copy';
        const base = baseMappingsFor(item);
        const insertIndex = insertIndexFromEvent(e, base);
        setPreview(buildDragPreview(base, objects, insertIndex, item));
    }

    function handleDragLeave() { setDragOver(false); setPreview(null); }

    function handleDrop(e) {
        e.preventDefault();
        setDragOver(false);
        setPreview(null);
        let data;
        try { data = JSON.parse(e.dataTransfer.getData('text/plain')); }
        catch { return; }
        const insertIndex = insertIndexFromEvent(e, baseMappingsFor(data));
        onDropObject(pdo.id, data, insertIndex);
    }

    const segments = preview
        ? preview.segments
        : computePdoSegments(pdo.mappings, objects).filter(s => !s.isEmpty);
    const showEmptyHint = !preview && pdo.mappings.length === 0;

    return (
        <div
            className={`${styles['pdo-row']} ${isSelected ? styles['pdo-row-selected'] : ''}`}
            onClick={() => onSelect(pdo.id)}
        >
            <div className={styles['pdo-cell-id']}>{pdo.id}</div>
            <div className={styles['pdo-cell-cob']}>{hex3(pdo.cobId)}</div>
            <div className={styles['pdo-cell-idx']}>{hex4(pdo.commIndex)}</div>

            <div
                ref={bitsRef}
                className={`${styles['pdo-bits']} ${dragOver ? styles['bits-dragover'] : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                title={`${usedBits}/${PDO_MAX_BITS} bits used — drop to add`}
            >
                {showEmptyHint && (
                    <span className={styles['bits-empty-hint']}>Empty — drop an object here</span>
                )}
                {segments.map(seg => (
                    <PdoSlot
                        key={seg.isHologram ? 'hologram' : `${seg.mapping.index}/${seg.mapping.subIndex}`}
                        segment={seg}
                        isSelected={
                            !seg.isHologram &&
                            selectedMapping?.pdoId === pdo.id &&
                            selectedMapping?.key === `${seg.mapping.index}/${seg.mapping.subIndex}`
                        }
                        onSelect={seg.isHologram ? undefined : (e) => {
                            e.stopPropagation();
                            onSelectMapping(pdo.id, seg.mapping);
                        }}
                        onContextMenu={seg.isHologram ? undefined : (e) => onMappingContextMenu(e, pdo.id, seg.mapping)}
                        onDragStart={seg.isHologram ? undefined : (e) => handleSlotDragStart(e, seg.mapping)}
                        onDragEnd={seg.isHologram ? undefined : handleSlotDragEnd}
                    />
                ))}
            </div>
        </div>
    );
}

// ─── PDO grid (header + all rows) ─────────────────────────────────────────────

function PdoGrid({
    pdos, selectedPdoId, objects, selectedMapping, draggedItemRef,
    onSelectPdo, onSelectMapping, onDropObject, onMappingContextMenu,
}) {
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
                    selectedMapping={selectedMapping}
                    draggedItemRef={draggedItemRef}
                    onSelect={onSelectPdo}
                    onSelectMapping={onSelectMapping}
                    onDropObject={onDropObject}
                    onMappingContextMenu={onMappingContextMenu}
                />
            ))}
        </div>
    );
}

// ─── Available objects list ───────────────────────────────────────────────────

function AvailableObjects({ objects, onItemDragStart, onItemDragEnd }) {
    const items = getPdoMappableObjects(objects);

    function handleDragStart(e, item) {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', JSON.stringify(item));
        onItemDragStart(item);
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
                        onDragEnd={onItemDragEnd}
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
    const { openMenu, menuElement } = useContextMenu();
    const [selectedPdoId, setSelectedPdoId] = useState(null);
    const [selectedMapping, setSelectedMapping] = useState(null);
    const draggedItemRef = useRef(null);

    const pdos = isRx ? getRxPdos(objects) : getTxPdos(objects);
    const selectedPdo = pdos.find(p => p.id === selectedPdoId) ?? null;

    // ── Comm param edits ───────────────────────────────────────────────────

    const handleCommChange = useCallback((updatedPdo) => {
        onObjectsChange(writePdoToObjects(objects, updatedPdo, isRx));
    }, [objects, isRx, onObjectsChange]);

    // ── Drop object onto PDO row ──────────────────────────────────────────

    const handleDropObject = useCallback((targetPdoId, item, insertIndex) => {
        const target = pdos.find(p => p.id === targetPdoId);
        if (!target) return;

        const src = item.source;
        const sameTarget = src && src.pdoId === targetPdoId;

        // For a reorder within the same PDO, drop the dragged object out of the
        // target's mappings first so the capacity check and insertion index line
        // up with what the preview showed.
        const targetMappings = sameTarget
            ? target.mappings.filter(m => `${m.index}/${m.subIndex}` !== src.key)
            : [...target.mappings];

        // Silently reject objects that won't fit — the red overflow hologram
        // shown during the drag already communicated why.
        const used = getMappingBitUsage(targetMappings);
        if (used + item.bits > PDO_MAX_BITS || targetMappings.length >= 8) return;

        const at = insertIndex == null ? targetMappings.length : insertIndex;
        targetMappings.splice(at, 0, { index: item.index, subIndex: item.subIndex, bits: item.bits });

        let updated = writePdoToObjects(objects, { ...target, mappings: targetMappings }, isRx);

        // Moving across PDOs: also remove the object from its source PDO.
        if (src && !sameTarget) {
            const source = pdos.find(p => p.id === src.pdoId);
            if (source) {
                const sourceMappings = source.mappings.filter(
                    m => `${m.index}/${m.subIndex}` !== src.key
                );
                updated = writePdoToObjects(updated, { ...source, mappings: sourceMappings }, isRx);
            }
        }

        onObjectsChange(updated);
        setSelectedPdoId(targetPdoId);
        setSelectedMapping({ pdoId: targetPdoId, key: `${item.index}/${item.subIndex}` });
    }, [pdos, objects, isRx, onObjectsChange]);

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

    // ── Select / context-menu / keyboard for mapped objects ───────────────

    const handleSelectMapping = useCallback((pdoId, mapping) => {
        setSelectedPdoId(pdoId);
        setSelectedMapping({ pdoId, key: `${mapping.index}/${mapping.subIndex}` });
    }, []);

    const handleMappingContextMenu = useCallback((e, pdoId, mapping) => {
        handleSelectMapping(pdoId, mapping);
        openMenu(e, [
            {
                id: 'delete', label: 'Delete', shortcut: 'Del', danger: true,
                onSelect: () => { handleRemoveMapping(pdoId, mapping); setSelectedMapping(null); },
            },
        ]);
    }, [handleSelectMapping, handleRemoveMapping, openMenu]);

    function handleSelectPdo(pdoId) {
        setSelectedPdoId(pdoId);
        setSelectedMapping(null);
    }

    function handleKeyDown(e) {
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
        if (e.key === 'Delete' && selectedMapping) {
            e.preventDefault();
            const [index, subIndex] = selectedMapping.key.split('/').map(Number);
            handleRemoveMapping(selectedMapping.pdoId, { index, subIndex });
            setSelectedMapping(null);
        }
    }

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
                <AvailableObjects
                    objects={objects}
                    onItemDragStart={item => { draggedItemRef.current = item; }}
                    onItemDragEnd={() => { draggedItemRef.current = null; }}
                />

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
                <div
                    className={styles['grid-scroll']}
                    tabIndex={0}
                    onKeyDown={handleKeyDown}
                >
                    <PdoGrid
                        pdos={pdos}
                        selectedPdoId={selectedPdoId}
                        objects={objects}
                        selectedMapping={selectedMapping}
                        draggedItemRef={draggedItemRef}
                        onSelectPdo={handleSelectPdo}
                        onSelectMapping={handleSelectMapping}
                        onDropObject={handleDropObject}
                        onMappingContextMenu={handleMappingContextMenu}
                    />
                </div>
            </div>

            {menuElement}
        </div>
    );
}
