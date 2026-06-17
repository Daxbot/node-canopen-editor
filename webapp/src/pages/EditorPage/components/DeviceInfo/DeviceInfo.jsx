import { useState } from 'react';
import styles from './DeviceInfo.module.css';

// ─── Reusable field row ───────────────────────────────────────────────────────

function Field({ label, value, onChange, type = 'text' }) {
    return (
        <div className={styles.field}>
            <label className={styles.label}>{label}</label>
            <input
                type={type}
                value={value ?? ''}
                onChange={e => onChange(e.target.value)}
            />
        </div>
    );
}

function BoolField({ label, value, onChange }) {
    return (
        <label className={styles['bool-field']}>
            <input
                type="checkbox"
                checked={!!value}
                onChange={e => onChange(e.target.checked)}
            />
            <span>{label}</span>
        </label>
    );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }) {
    const [collapsed, setCollapsed] = useState(false);
    return (
        <div className={styles.section}>
            <button
                className={styles['section-header']}
                onClick={() => setCollapsed(c => !c)}
            >
                <span className={styles['section-arrow']}>{collapsed ? '▶' : '▼'}</span>
                {title}
            </button>
            {!collapsed && <div className={styles['section-body']}>{children}</div>}
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DeviceInfo({
    fileInfo, deviceInfo, comments,
    onChange, onCommentsChange,
}) {
    function updateFileInfo(key, val) {
        onChange('fileInfo', { ...fileInfo, [key]: val });
    }

    function updateDeviceInfo(key, val) {
        onChange('deviceInfo', { ...deviceInfo, [key]: val });
    }

    return (
        <div className={styles.container}>

            <Section title="File Info">
                <div className={styles.grid}>
                    <Field label="File Name" value={fileInfo.fileName}
                        onChange={v => updateFileInfo('fileName', v)} />
                    <Field label="File Version" value={fileInfo.fileVersion}
                        onChange={v => updateFileInfo('fileVersion', v)} />
                    <Field label="File Revision" value={fileInfo.fileRevision}
                        onChange={v => updateFileInfo('fileRevision', v)} />
                    <Field label="EDS Version" value={fileInfo.edsVersion}
                        onChange={v => updateFileInfo('edsVersion', v)} />
                    <Field label="Description" value={fileInfo.description}
                        onChange={v => updateFileInfo('description', v)} />
                    <Field label="Created By" value={fileInfo.createdBy}
                        onChange={v => updateFileInfo('createdBy', v)} />
                    <Field label="Modified By" value={fileInfo.modifiedBy}
                        onChange={v => updateFileInfo('modifiedBy', v)} />
                </div>
            </Section>

            <Section title="Device Info">
                <div className={styles.grid}>
                    <Field label="Vendor Name" value={deviceInfo.vendorName}
                        onChange={v => updateDeviceInfo('vendorName', v)} />
                    <Field label="Vendor Number" value={deviceInfo.vendorNumber}
                        onChange={v => updateDeviceInfo('vendorNumber', v)} />
                    <Field label="Product Name" value={deviceInfo.productName}
                        onChange={v => updateDeviceInfo('productName', v)} />
                    <Field label="Product Number" value={deviceInfo.productNumber}
                        onChange={v => updateDeviceInfo('productNumber', v)} />
                    <Field label="Revision Number" value={deviceInfo.revisionNumber}
                        onChange={v => updateDeviceInfo('revisionNumber', v)} />
                    <Field label="Order Code" value={deviceInfo.orderCode}
                        onChange={v => updateDeviceInfo('orderCode', v)} />
                </div>

                <div className={styles['baud-section']}>
                    <span className={styles['baud-label']}>Supported Baud Rates</span>
                    <div className={styles['baud-grid']}>
                        {[
                            ['10 kbps', 'baudRate10'],
                            ['20 kbps', 'baudRate20'],
                            ['50 kbps', 'baudRate50'],
                            ['125 kbps', 'baudRate125'],
                            ['250 kbps', 'baudRate250'],
                            ['500 kbps', 'baudRate500'],
                            ['800 kbps', 'baudRate800'],
                            ['1000 kbps', 'baudRate1000'],
                        ].map(([label, key]) => (
                            <BoolField
                                key={key}
                                label={label}
                                value={deviceInfo[key]}
                                onChange={v => updateDeviceInfo(key, v)}
                            />
                        ))}
                    </div>
                </div>

                <div className={styles.grid}>
                    <BoolField label="Simple Boot-Up Master"
                        value={deviceInfo.simpleBootUpMaster}
                        onChange={v => updateDeviceInfo('simpleBootUpMaster', v)} />
                    <BoolField label="Simple Boot-Up Slave"
                        value={deviceInfo.simpleBootUpSlave}
                        onChange={v => updateDeviceInfo('simpleBootUpSlave', v)} />
                    <BoolField label="LSS Supported"
                        value={deviceInfo.lssSupported}
                        onChange={v => updateDeviceInfo('lssSupported', v)} />
                    <BoolField label="Group Messaging"
                        value={deviceInfo.groupMessaging}
                        onChange={v => updateDeviceInfo('groupMessaging', v)} />
                </div>
            </Section>

            <Section title="Comments">
                <div className={styles['comments-area']}>
                    <textarea
                        rows={6}
                        value={(comments || []).join('\n')}
                        onChange={e => onCommentsChange(e.target.value.split('\n'))}
                        placeholder="Optional comments…"
                    />
                </div>
            </Section>

        </div>
    );
}
