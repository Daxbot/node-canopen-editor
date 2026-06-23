import { useState, useEffect, useRef } from 'react';
import styles from './Toolbar.module.css';

const TABS = [
    { id: 'device', label: 'Device Info' },
    { id: 'od', label: 'Object Dictionary' },
    { id: 'txpdo', label: '→ TX PDO Mapping' },
    { id: 'rxpdo', label: '← RX PDO Mapping' },
];

export default function Toolbar({
    fileName, isDirty, hasFile,
    onNew, onOpen, onSave, onExportAs,
    activeTab, onTabChange,
}) {
    const [exportOpen, setExportOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!exportOpen) return;
        function handleOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target))
                setExportOpen(false);
        }
        function handleKey(e) {
            if (e.key === 'Escape') setExportOpen(false);
        }
        document.addEventListener('mousedown', handleOutside);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleOutside);
            document.removeEventListener('keydown', handleKey);
        };
    }, [exportOpen]);

    function handleExport(format) {
        setExportOpen(false);
        onExportAs(format);
    }

    return (
        <header className={styles.toolbar}>
            <div className={styles.left}>
                <span className={styles.logo}>⬡ EDS Editor</span>
                <div className={styles.divider} />
                <button onClick={onNew}>New</button>
                <button onClick={onOpen}>Open…</button>
                <button
                    className="primary"
                    disabled={!hasFile}
                    onClick={onSave}
                >
                    Save
                </button>
                {hasFile && (
                    <div className={styles['export-dropdown']} ref={dropdownRef}>
                        <button
                            className={`${styles['export-btn']} ${exportOpen ? styles['export-btn-open'] : ''}`}
                            onClick={() => setExportOpen(o => !o)}
                            title="Export as another format"
                        >
                            ▼ Export
                        </button>
                        {exportOpen && (
                            <div className={styles['export-menu']}>
                                <button onClick={() => handleExport('eds')}>Export as EDS</button>
                                <button onClick={() => handleExport('xdd')}>Export as XDD</button>
                                <button onClick={() => handleExport('canopen-node')}>Export as CANopenNode</button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {hasFile && (
                <div className={styles.tabs}>
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
                            onClick={() => onTabChange(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            <div className={styles.right}>
                {fileName && (
                    <span className={styles.filename}>
                        {isDirty && <span className={styles.dirty}>●</span>}
                        {fileName}
                    </span>
                )}
            </div>
        </header>
    );
}
