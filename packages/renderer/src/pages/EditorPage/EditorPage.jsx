import { useState, useCallback, useEffect } from 'react';
import { parseEds, serializeEds, parseXdd, writeXdd, createEmptyEds, exportOD } from '../../lib/eds/index.js';
import { useFileService } from '../../platform/FileServiceContext.jsx';
import { useDialog } from '../../components/Dialog/DialogProvider.jsx';
import Toolbar from './components/Toolbar/Toolbar.jsx';
import DeviceInfo from './components/DeviceInfo/DeviceInfo.jsx';
import ObjectList from './components/ObjectList/ObjectList.jsx';
import ObjectDetail from './components/ObjectDetail/ObjectDetail.jsx';
import PdoMapping from './components/PdoMapping/PdoMapping.jsx';
import styles from './EditorPage.module.css';

export default function EditorPage() {
    const fileService = useFileService();
    const dialog = useDialog();
    const [eds, setEds] = useState(null);
    const [fileName, setFileName] = useState(null);
    const [filePath, setFilePath] = useState(null); // on-disk path (desktop only); null on web
    const [isDirty, setIsDirty] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [activeTab, setActiveTab] = useState('od');
    const [fileFormat, setFileFormat] = useState('eds'); // 'eds' or 'xdd'

    // ─── File operations ───────────────────────────────────────────────────

    const confirmDiscard = useCallback(() => dialog.confirm({
        title: 'Discard changes',
        message: 'Discard unsaved changes?',
        confirmLabel: 'Discard',
        danger: true,
    }), [dialog]);

    const handleNew = useCallback(async () => {
        if (isDirty && !(await confirmDiscard())) return;
        setEds(createEmptyEds());
        setFileName('Newdevice.xdd');
        setFilePath(null);
        setFileFormat('xdd');
        setIsDirty(false);
        setSelectedIndex(null);
    }, [isDirty, confirmDiscard]);

    const handleOpen = useCallback(async () => {
        if (isDirty && !(await confirmDiscard())) return;

        let result;
        try {
            result = await fileService.openTextFile({ extensions: ['eds', 'xdd'] });
        } catch (err) {
            dialog.alert({ title: 'Open failed', message: `Failed to open file:\n${err.message}` });
            return;
        }
        if (!result) return; // cancelled

        const isXdd = result.name.toLowerCase().endsWith('.xdd');
        try {
            const parsed = isXdd ? parseXdd(result.content) : parseEds(result.content);
            setEds(parsed);
            setFileName(result.name);
            setFilePath(result.path ?? null);
            setFileFormat(isXdd ? 'xdd' : 'eds');
            setIsDirty(false);
            setSelectedIndex(null);
        }
        catch (err) {
            dialog.alert({ title: 'Parse failed', message: `Failed to parse file:\n${err.message}` });
        }
    }, [isDirty, confirmDiscard, fileService, dialog]);

    const handleSave = useCallback(async () => {
        if (!eds) return;

        const isXdd = fileFormat === 'xdd' || (fileName && fileName.toLowerCase().endsWith('.xdd'));

        let content, contentType, ext;
        try {
            if (isXdd) {
                content = writeXdd(eds, fileName);
                contentType = 'application/xml';
                ext = 'xdd';
            } else {
                content = serializeEds(eds);
                contentType = 'text/plain';
                ext = 'eds';
            }
        } catch (err) {
            dialog.alert({ title: 'Save failed', message: `Failed to save file:\n${err.message}` });
            return;
        }

        try {
            // path set  -> inline overwrite (desktop)
            // path null -> Save dialog (desktop) / browser download (web)
            const result = await fileService.writeFile({
                path: filePath,
                suggestedName: fileName || `device.${ext}`,
                content,
                contentType,
                extensions: [ext],
            });
            if (!result) return; // cancelled
            setFilePath(result.path ?? filePath);
            if (result.name) setFileName(result.name);
            setIsDirty(false);
        } catch (err) {
            dialog.alert({ title: 'Save failed', message: `Failed to save file:\n${err.message}` });
        }
    }, [eds, fileName, fileFormat, filePath, fileService, dialog]);

    const handleExportAs = useCallback(async (format) => {
        if (!eds) return;

        const baseName = fileName ? fileName.replace(/\.[^.]+$/, '') : 'device';

        try {
            if (format === 'canopen-node') {
                // CANopenNode export produces a header + source pair.
                const result = exportOD(eds, 'OD');
                const h = await fileService.writeFile({
                    path: null,
                    suggestedName: 'OD.h',
                    content: result.header,
                    contentType: 'text/plain',
                    extensions: ['h'],
                });
                if (!h) return; // cancelled before the first file
                await fileService.writeFile({
                    path: null,
                    suggestedName: 'OD.c',
                    content: result.source,
                    contentType: 'text/plain',
                    extensions: ['c'],
                });
            } else if (format === 'xdd') {
                const content = writeXdd(eds, `${baseName}.xdd`);
                await fileService.writeFile({
                    path: null,
                    suggestedName: `${baseName}.xdd`,
                    content,
                    contentType: 'application/xml',
                    extensions: ['xdd'],
                });
            } else {
                const content = serializeEds(eds);
                await fileService.writeFile({
                    path: null,
                    suggestedName: `${baseName}.eds`,
                    content,
                    contentType: 'text/plain',
                    extensions: ['eds'],
                });
            }
        } catch (err) {
            dialog.alert({ title: 'Export failed', message: `Failed to export:\n${err.message}` });
        }
    }, [eds, fileName, fileService, dialog]);

    // ─── Edit helpers ──────────────────────────────────────────────────────

    const updateEds = useCallback((updater) => {
        setEds(prev => updater(prev));
        setIsDirty(true);
    }, []);

    const handleObjectsChange = useCallback((updated) => {
        updateEds(prev => ({ ...prev, objects: updated }));
    }, [updateEds]);

    // ─── Native menu / keyboard accelerators (desktop only) ──────────────────

    useEffect(() => {
        if (!fileService.onMenuCommand) return undefined;
        return fileService.onMenuCommand((command) => {
            switch (command) {
                case 'new': handleNew(); break;
                case 'open': handleOpen(); break;
                case 'save': handleSave(); break;
                case 'export-eds': handleExportAs('eds'); break;
                case 'export-xdd': handleExportAs('xdd'); break;
                case 'export-canopen-node': handleExportAs('canopen-node'); break;
                default: break;
            }
        });
    }, [fileService, handleNew, handleOpen, handleSave, handleExportAs]);

    // ─── Render ────────────────────────────────────────────────────────────

    return (
        <div className={styles.page}>
            <Toolbar
                fileName={fileName}
                isDirty={isDirty}
                hasFile={!!eds}
                onNew={handleNew}
                onOpen={handleOpen}
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
                            <button onClick={handleOpen}>
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
