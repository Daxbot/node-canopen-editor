import { useState } from 'react';
import {
    ObjectType, ObjectTypeName,
    DataTypeName,
    AccessType,
    isContainerType,
    createSubEntry,
} from '../../../../lib/eds/index.js';
import styles from './ObjectDetail.module.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACCESS_OPTIONS = [
    AccessType.READ_WRITE,
    AccessType.READ_ONLY,
    AccessType.WRITE_ONLY,
    AccessType.CONSTANT,
];

const DATA_TYPE_OPTIONS = Object.entries(DataTypeName)
    .map(([v, k]) => ({ value: Number(v), label: k }))
    .sort((a, b) => a.value - b.value);

const CONTAINER_OBJECT_TYPES = [
    ObjectType.VAR,
    ObjectType.ARRAY,
    ObjectType.RECORD,
    ObjectType.DOMAIN,
    ObjectType.DEFTYPE,
    ObjectType.DEFSTRUCT,
];

function hexIndex(index) {
    return `0x${Number(index).toString(16).toUpperCase().padStart(4, '0')}`;
}

function hexSub(sub) {
    return `0x${Number(sub).toString(16).toUpperCase().padStart(2, '0')}`;
}

// ─── Single field row ─────────────────────────────────────────────────────────

function FieldRow({ label, children }) {
    return (
        <div className={styles.field}>
            <span className={styles.label}>{label}</span>
            <div className={styles.control}>{children}</div>
        </div>
    );
}

// ─── VAR entry editor ─────────────────────────────────────────────────────────

function VarEditor({ entry, onChange }) {
    function set(key, val) { onChange({ ...entry, [key]: val }); }

    return (
        <div className={styles.fields}>
            <FieldRow label="Parameter Name">
                <input
                    value={entry.parameterName ?? ''}
                    onChange={e => set('parameterName', e.target.value)}
                />
            </FieldRow>
            <FieldRow label="Object Type">
                <select
                    value={entry.objectType ?? ObjectType.VAR}
                    onChange={e => set('objectType', parseInt(e.target.value, 10))}
                >
                    {CONTAINER_OBJECT_TYPES.map(t => (
                        <option key={t} value={t}>{ObjectTypeName[t] ?? t}</option>
                    ))}
                </select>
            </FieldRow>
            <FieldRow label="Data Type">
                <select
                    value={entry.dataType ?? ''}
                    onChange={e => set('dataType', parseInt(e.target.value, 10))}
                >
                    <option value="">—</option>
                    {DATA_TYPE_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
            </FieldRow>
            <FieldRow label="Access Type">
                <select
                    value={entry.accessType ?? AccessType.READ_WRITE}
                    onChange={e => set('accessType', e.target.value)}
                >
                    {ACCESS_OPTIONS.map(a => (
                        <option key={a} value={a}>{a}</option>
                    ))}
                </select>
            </FieldRow>
            <FieldRow label="Default Value">
                <input
                    value={entry.defaultValue ?? ''}
                    onChange={e => set('defaultValue', e.target.value)}
                    placeholder="Optional"
                />
            </FieldRow>
            <FieldRow label="Low Limit">
                <input
                    value={entry.lowLimit ?? ''}
                    onChange={e => set('lowLimit', e.target.value)}
                    placeholder="Optional"
                />
            </FieldRow>
            <FieldRow label="High Limit">
                <input
                    value={entry.highLimit ?? ''}
                    onChange={e => set('highLimit', e.target.value)}
                    placeholder="Optional"
                />
            </FieldRow>
            <FieldRow label="PDO Mapping">
                <label className={styles.check}>
                    <input
                        type="checkbox"
                        checked={!!entry.pdoMapping}
                        onChange={e => set('pdoMapping', e.target.checked)}
                    />
                    <span>Mappable to PDO</span>
                </label>
            </FieldRow>
        </div>
    );
}

// ─── Sub-object row (inline in table) ────────────────────────────────────────

function SubObjectRow({ subIndex, sub, selected, onSelect, onDelete }) {
    return (
        <button
            className={`${styles['sub-row']} ${selected ? styles['sub-selected'] : ''}`}
            onClick={() => onSelect(subIndex)}
        >
            <span className={styles['sub-idx']}>{hexSub(subIndex)}</span>
            <span className={styles['sub-name']}>{sub.parameterName}</span>
            <span className={styles['sub-type']}>
                {DataTypeName[sub.dataType] ?? (sub.dataType != null ? `0x${sub.dataType?.toString(16)}` : '—')}
            </span>
            <span className={styles['sub-access']}>{sub.accessType ?? '—'}</span>
            {subIndex !== 0 && (
                <span
                    className={styles['sub-del']}
                    onClick={e => { e.stopPropagation(); onDelete(subIndex); }}
                    title="Delete sub-object"
                >
                    ✕
                </span>
            )}
        </button>
    );
}

// ─── Container entry editor (ARRAY / RECORD) ──────────────────────────────────

function ContainerEditor({ entry, onChange }) {
    const [selectedSub, setSelectedSub] = useState(null);

    const subObjects = entry.subObjects ?? {};
    const subIndices = Object.keys(subObjects).map(Number).sort((a, b) => a - b);

    function setEntry(key, val) { onChange({ ...entry, [key]: val }); }

    function setSubEntry(subIdx, updated) {
        onChange({
            ...entry,
            subObjects: { ...entry.subObjects, [subIdx]: updated },
        });
    }

    function addSubObject() {
        const next = subIndices.length > 0 ? Math.max(...subIndices) + 1 : 1;
        const newSub = createSubEntry(`Sub-object ${next}`);
        const updatedSubs = { ...entry.subObjects, [next]: newSub };
        // Update sub 0 max-sub-index
        if (updatedSubs[0]) {
            updatedSubs[0] = {
                ...updatedSubs[0],
                defaultValue: String(next),
            };
        }
        onChange({ ...entry, subObjects: updatedSubs });
        setSelectedSub(next);
    }

    function deleteSubObject(subIdx) {
        if (!window.confirm(`Delete sub-object ${hexSub(subIdx)}?`)) return;
        const updated = { ...entry.subObjects };
        delete updated[subIdx];
        // Update max sub-index in sub0
        const remaining = Object.keys(updated).map(Number).filter(i => i !== 0);
        const maxSub = remaining.length > 0 ? Math.max(...remaining) : 0;
        if (updated[0]) {
            updated[0] = { ...updated[0], defaultValue: String(maxSub) };
        }
        onChange({ ...entry, subObjects: updated });
        if (selectedSub === subIdx) setSelectedSub(null);
    }

    const activeSub = selectedSub != null ? subObjects[selectedSub] : null;

    return (
        <div className={styles.container}>
            {/* Container header fields */}
            <div className={styles.fields}>
                <FieldRow label="Parameter Name">
                    <input
                        value={entry.parameterName ?? ''}
                        onChange={e => setEntry('parameterName', e.target.value)}
                    />
                </FieldRow>
                <FieldRow label="Object Type">
                    <span className={styles['read-only-value']}>
                        {ObjectTypeName[entry.objectType] ?? entry.objectType}
                    </span>
                </FieldRow>
            </div>

            {/* Sub-objects table */}
            <div className={styles['sub-section']}>
                <div className={styles['sub-header']}>
                    <span>Sub-objects</span>
                    <button className="primary" onClick={addSubObject}>+ Add</button>
                </div>
                <div className={styles['sub-list']}>
                    <div className={styles['sub-list-header']}>
                        <span>Sub</span>
                        <span>Name</span>
                        <span>Data Type</span>
                        <span>Access</span>
                        <span />
                    </div>
                    {subIndices.map(sub => (
                        <SubObjectRow
                            key={sub}
                            subIndex={sub}
                            sub={subObjects[sub]}
                            selected={selectedSub === sub}
                            onSelect={setSelectedSub}
                            onDelete={deleteSubObject}
                        />
                    ))}
                </div>
            </div>

            {/* Selected sub-object editor */}
            {activeSub && (
                <div className={styles['sub-editor']}>
                    <div className={styles['sub-editor-title']}>
                        Sub {hexSub(selectedSub)} — {activeSub.parameterName}
                    </div>
                    <VarEditor
                        entry={activeSub}
                        onChange={updated => setSubEntry(selectedSub, updated)}
                    />
                </div>
            )}
        </div>
    );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function ObjectDetail({ index, entry, onChange }) {
    if (index == null || !entry) {
        return (
            <div className={styles.empty}>
                <span>Select an object to view details</span>
            </div>
        );
    }

    const container = isContainerType(entry.objectType);

    return (
        <div className={styles.panel}>
            <div className={styles['panel-header']}>
                <span className={styles['panel-index']}>{hexIndex(index)}</span>
                <span className={styles['panel-name']}>{entry.parameterName}</span>
                <span className={styles['panel-type']}>
                    {ObjectTypeName[entry.objectType] ?? entry.objectType}
                </span>
            </div>
            <div className={styles['panel-body']}>
                {container
                    ? <ContainerEditor entry={entry} onChange={onChange} />
                    : <VarEditor entry={entry} onChange={onChange} />
                }
            </div>
        </div>
    );
}
