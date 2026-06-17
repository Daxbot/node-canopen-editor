import { useState, useCallback, useRef } from 'react';
import { parseEds, serializeEds, parseXdd, writeXdd, createEmptyEds } from '../../lib/eds/index.js';
import Toolbar from './components/Toolbar/Toolbar.jsx';
import DeviceInfo from './components/DeviceInfo/DeviceInfo.jsx';
import ObjectList from './components/ObjectList/ObjectList.jsx';
import ObjectDetail from './components/ObjectDetail/ObjectDetail.jsx';
import PdoMapping from './components/PdoMapping/PdoMapping.jsx';
import styles from './EditorPage.module.css';

export default function EditorPage() {
    const [eds, setEds] = useState(null);
    const [fileName, setFileName] = useState(null);
    const [isDirty, setIsDirty] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [activeTab, setActiveTab] = useState('od');
    const [fileFormat, setFileFormat] = useState('eds'); // 'eds' or 'xdd'
    const fileInputRef = useRef(null);

    // ─── File operations ───────────────────────────────────────────────────

    const handleNew = useCallback(() => {
        if (isDirty && !window.confirm('Discard unsaved changes?')) return;
        setEds(createEmptyEds());
        setFileName('Newdevice.od');
        setFileFormat('eds');
        setIsDirty(false);
        setSelectedIndex(null);
    }, [isDirty]);

    const handleOpenClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const isXdd = file.name.toLowerCase().endsWith('.xdd');
        const reader = new FileReader();
        
        reader.onload = (evt) => {
            try {
                let parsed;
                if (isXdd) {
                    parsed = parseXdd(evt.target.result);
                } else {
                    parsed = parseEds(evt.target.result);
                }
                setEds(parsed);
                setFileName(file.name);
                setFileFormat(isXdd ? 'xdd' : 'eds');
                setIsDirty(false);
                setSelectedIndex(null);
            }
            catch (err) {
                alert(`Failed to parse file:\n${err.message}`);
            }
        };
        
        reader.readAsText(file);
        e.target.value = '';
    }, []);

    const handleSave = useCallback(() => {
        if (!eds) return;
        
        const isXdd = fileFormat === 'xdd' || (fileName && fileName.toLowerCase().endsWith('.xdd'));
        
        const downloadFile = (content, contentType, extension) => {
            const blob = new Blob([content], { type: contentType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName || `device.${extension}`;
            a.click();
            URL.revokeObjectURL(url);
            setIsDirty(false);
        };

        if (isXdd) {
            try {
                const content = writeXdd(eds, fileName);
                downloadFile(content, 'application/xml', 'xdd');
            } catch (err) {
                alert(`Failed to export XDD:\n${err.message}`);
            }
        } else {
            const content = serializeEds(eds);
            downloadFile(content, 'text/plain', 'eds');
        }
    }, [eds, fileName, fileFormat]);

    const handleExportAs = useCallback((format) => {
        if (!eds) return;
        
        const downloadFile = (content, contentType, extension) => {
            const baseName = fileName ? fileName.replace(/\.[^.]+$/, '') : 'device';
            const blob = new Blob([content], { type: contentType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${baseName}.${extension}`;
            a.click();
            URL.revokeObjectURL(url);
        };

        if (format === 'xdd') {
            try {
                const baseName = fileName ? fileName.replace(/\.[^.]+$/, '') : 'device';
                const content = writeXdd(eds, `${baseName}.xdd`);
                downloadFile(content, 'application/xml', 'xdd');
            } catch (err) {
                alert(`Failed to export XDD:\n${err.message}`);
            }
        } else {
            const content = serializeEds(eds);
            downloadFile(content, 'text/plain', 'eds');
        }
    }, [eds, fileName]);

    // ─── Edit helpers ──────────────────────────────────────────────────────

    const updateEds = useCallback((updater) => {
        setEds(prev => updater(prev));
        setIsDirty(true);
    }, []);

    const handleObjectsChange = useCallback((updated) => {
        updateEds(prev => ({ ...prev, objects: updated }));
    }, [updateEds]);

    // ─── Render ────────────────────────────────────────────────────────────

    return (
        <div className={styles.page}>
            <input
                ref={fileInputRef}
                type="file"
                accept=".eds,.xdd"
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />
            <Toolbar
                fileName={fileName}
                isDirty={isDirty}
                hasFile={!!eds}
                onNew={handleNew}
                onOpen={handleOpenClick}
                onSave={handleSave}
                onExportAs={handleExportAs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            {!eds ? (
                <div className={styles.welcome}>
                    <div className={styles['welcome-box']}>
                        <h2 className={styles['welcome-title']}>CANopen EDS Editor</h2>
                        <p className={styles['welcome-sub']}>
                            Create or open an EDS/XDD file to begin editing.
                        </p>
                        <div className={styles['welcome-actions']}>
                            <button className="primary" onClick={handleNew}>
                                New Device
                            </button>
                            <button onClick={handleOpenClick}>
                                Open EDS/XDD File
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className={styles.workspace}>
                    {activeTab === 'device' && (
                        <div className={styles['device-tab']}>
                            <DeviceInfo
                                fileInfo={eds.fileInfo}
                                deviceInfo={eds.deviceInfo}
                                comments={eds.comments}
                                onChange={(section, updated) =>
                                    updateEds(prev => ({ ...prev, [section]: updated }))
                                }
                                onCommentsChange={(updated) =>
                                    updateEds(prev => ({ ...prev, comments: updated }))
                                }
                            />
                        </div>
                    )}
                    {activeTab === 'od' && (
                        <div className={styles['od-tab']}>
                            <ObjectList
                                objects={eds.objects}
                                selectedIndex={selectedIndex}
                                onSelect={setSelectedIndex}
                                onObjectsChange={handleObjectsChange}
                            />
                            <ObjectDetail
                                index={selectedIndex}
                                entry={selectedIndex != null ? eds.objects[selectedIndex] : null}
                                allObjects={eds.objects}
                                onChange={(updatedEntry) =>
                                    handleObjectsChange({
                                        ...eds.objects,
                                        [selectedIndex]: updatedEntry,
                                    })
                                }
                            />
                        </div>
                    )}
                    {activeTab === 'txpdo' && (
                        <PdoMapping
                            objects={eds.objects}
                            isRx={false}
                            onObjectsChange={handleObjectsChange}
                        />
                    )}
                    {activeTab === 'rxpdo' && (
                        <PdoMapping
                            objects={eds.objects}
                            isRx={true}
                            onObjectsChange={handleObjectsChange}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
