import { useState, useMemo } from 'react';
import {
    getCategoryForIndex, CATEGORIES,
    createVarEntry, createArrayEntry, createRecordEntry,
    ObjectType, ObjectTypeName, DataTypeName,
} from '../../../../lib/eds/index.js';
import styles from './ObjectList.module.css';

// ─── Add Entry Modal ──────────────────────────────────────────────────────────

function AddEntryModal({ onAdd, onClose, existingIndices }) {
    const [indexStr, setIndexStr] = useState('');
    const [name, setName] = useState('New Object');
    const [objType, setObjType] = useState(String(ObjectType.VAR));
    const [error, setError] = useState('');

    function handleSubmit(e) {
        e.preventDefault();
        const raw = indexStr.trim();
        const idx = raw.startsWith('0x') || raw.startsWith('0X')
            ? parseInt(raw, 16)
            : parseInt(raw, 10);

        if (isNaN(idx) || idx < 0 || idx > 0xFFFF) {
            setError('Index must be 0x0000 – 0xFFFF');
            return;
        }
        if (existingIndices.has(idx)) {
            setError(`Index 0x${idx.toString(16).toUpperCase().padStart(4, '0')} already exists`);
            return;
        }

        const ot = parseInt(objType, 10);
        let entry;
        if (ot === ObjectType.ARRAY) entry = createArrayEntry(name);
        else if (ot === ObjectType.RECORD) entry = createRecordEntry(name);
        else entry = createVarEntry(name);

        onAdd(idx, entry);
    }

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles['modal-header']}>
                    <span>Add Object</span>
                    <button className={styles['close-btn']} onClick={onClose}>✕</button>
                </div>
                <form className={styles['modal-body']} onSubmit={handleSubmit}>
                    <div className={styles['form-group']}>
                        <label>Index (hex or decimal)</label>
                        <input
                            autoFocus
                            placeholder="e.g. 0x2000 or 8192"
                            value={indexStr}
                            onChange={e => { setIndexStr(e.target.value); setError(''); }}
                        />
                    </div>
                    <div className={styles['form-group']}>
                        <label>Parameter Name</label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>
                    <div className={styles['form-group']}>
                        <label>Object Type</label>
                        <select value={objType} onChange={e => setObjType(e.target.value)}>
                            <option value={String(ObjectType.VAR)}>VAR</option>
                            <option value={String(ObjectType.ARRAY)}>ARRAY</option>
                            <option value={String(ObjectType.RECORD)}>RECORD</option>
                        </select>
                    </div>
                    {error && <div className={styles.error}>{error}</div>}
                    <div className={styles['modal-actions']}>
                        <button type="button" onClick={onClose}>Cancel</button>
                        <button type="submit" className="primary">Add</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Category Section ─────────────────────────────────────────────────────────

function CategorySection({ category, entries, selectedIndex, onSelect }) {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className={styles['category-section']}>
            <button
                className={styles['category-header']}
                onClick={() => setCollapsed(c => !c)}
            >
                <span className={styles['cat-arrow']}>{collapsed ? '▶' : '▼'}</span>
                <span className={styles['cat-label']}>{category.label}</span>
                <span className={styles['cat-count']}>{entries.length}</span>
                {category.range && (
                    <span className={styles['cat-range']}>{category.range}</span>
                )}
            </button>
            {!collapsed && (
                <div className={styles['category-body']}>
                    {entries.map(({ index, entry }) => (
                        <button
                            key={index}
                            className={`${styles.row} ${selectedIndex === index ? styles.selected : ''}`}
                            onClick={() => onSelect(index)}
                        >
                            <span className={styles['row-index']}>
                                {`0x${index.toString(16).toUpperCase().padStart(4, '0')}`}
                            </span>
                            <span className={styles['row-name']}>{entry.parameterName}</span>
                            <span className={styles['row-type']}>
                                {ObjectTypeName[entry.objectType] ?? '?'}
                            </span>
                            {entry.dataType != null &&
                                entry.objectType !== ObjectType.ARRAY &&
                                entry.objectType !== ObjectType.RECORD && (
                                <span className={styles['row-dtype']}>
                                    {DataTypeName[entry.dataType] ?? `0x${entry.dataType?.toString(16)}`}
                                </span>
                            )}
                        </button>
                    ))}
                    {entries.length === 0 && (
                        <div className={styles.empty}>No objects</div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ObjectList({ objects, selectedIndex, onSelect, onObjectsChange }) {
    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);

    const existingIndices = useMemo(() => new Set(Object.keys(objects).map(Number)), [objects]);

    const categorised = useMemo(() => {
        const lower = search.toLowerCase();
        const all = Object.entries(objects)
            .map(([k, v]) => ({ index: Number(k), entry: v }))
            .filter(({ index, entry }) => {
                if (!lower) return true;
                const hex = `0x${index.toString(16).toUpperCase().padStart(4, '0')}`;
                return (
                    hex.toLowerCase().includes(lower) ||
                    entry.parameterName?.toLowerCase().includes(lower)
                );
            })
            .sort((a, b) => a.index - b.index);

        const map = {};
        for (const cat of CATEGORIES) map[cat.key] = [];
        for (const item of all) {
            const cat = getCategoryForIndex(item.index);
            map[cat].push(item);
        }
        return map;
    }, [objects, search]);

    function handleAdd(idx, entry) {
        onObjectsChange({ ...objects, [idx]: entry });
        setShowAdd(false);
        onSelect(idx);
    }

    function handleDelete(index) {
        if (!window.confirm(
            `Delete object 0x${index.toString(16).toUpperCase().padStart(4, '0')}?`
        )) return;
        const updated = { ...objects };
        delete updated[index];
        onObjectsChange(updated);
        if (selectedIndex === index) onSelect(null);
    }

    return (
        <div className={styles.panel}>
            <div className={styles.toolbar}>
                <input
                    className={styles.search}
                    placeholder="Search index or name…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <button className="primary" onClick={() => setShowAdd(true)}>+ Add</button>
                {selectedIndex != null && (
                    <button
                        className="danger"
                        onClick={() => handleDelete(selectedIndex)}
                        title="Delete selected object"
                    >
                        Delete
                    </button>
                )}
            </div>

            <div className={styles.list}>
                {CATEGORIES.map(cat => (
                    categorised[cat.key]?.length > 0 && (
                        <CategorySection
                            key={cat.key}
                            category={cat}
                            entries={categorised[cat.key]}
                            selectedIndex={selectedIndex}
                            onSelect={onSelect}
                        />
                    )
                ))}
            </div>

            {showAdd && (
                <AddEntryModal
                    existingIndices={existingIndices}
                    onAdd={handleAdd}
                    onClose={() => setShowAdd(false)}
                />
            )}
        </div>
    );
}
