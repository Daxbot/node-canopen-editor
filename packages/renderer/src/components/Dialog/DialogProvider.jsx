/* eslint-disable react-refresh/only-export-components -- context module exports a provider component alongside its hook */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useFileService } from '../../platform/FileServiceContext.jsx';
import Dialog from './Dialog.jsx';

/**
 * Imperative dialog API, replacing the native window.confirm / alert.
 *
 *   const dialog = useDialog();
 *   if (!(await dialog.confirm({ title, message, confirmLabel, danger }))) return;
 *   await dialog.alert({ title, message });          // or dialog.alert('message')
 *
 * confirm() resolves to true/false; alert() resolves once dismissed.
 *
 * When the platform FileService exposes showNativeDialog (desktop), it routes to
 * the native OS dialog; otherwise (web) it renders the custom DOM <Dialog>.
 * Messages must be plain strings so the native path can render them.
 */
const DialogContext = createContext(null);

export function DialogProvider({ children }) {
    const fileService = useFileService();
    const [dialog, setDialog] = useState(null);

    const confirm = useCallback((opts) => {
        const o = { title: 'Confirm', confirmLabel: 'OK', cancelLabel: 'Cancel', danger: false, ...opts };
        if (fileService.showNativeDialog) {
            return fileService.showNativeDialog({ kind: 'confirm', ...o });
        }
        return new Promise((resolve) => setDialog({ ...o, resolve }));
    }, [fileService]);

    const alert = useCallback((opts) => {
        const o = { title: 'Notice', confirmLabel: 'OK', ...(typeof opts === 'string' ? { message: opts } : opts) };
        if (fileService.showNativeDialog) {
            return fileService.showNativeDialog({ kind: 'alert', ...o });
        }
        return new Promise((resolve) => setDialog({ ...o, cancelLabel: null, resolve }));
    }, [fileService]);

    const api = useMemo(() => ({ confirm, alert }), [confirm, alert]);

    function close(result) {
        dialog?.resolve(result);
        setDialog(null);
    }

    return (
        <DialogContext.Provider value={api}>
            {children}
            {dialog && (
                <Dialog
                    title={dialog.title}
                    message={dialog.message}
                    confirmLabel={dialog.confirmLabel}
                    cancelLabel={dialog.cancelLabel}
                    danger={dialog.danger}
                    onConfirm={() => close(true)}
                    onCancel={() => close(false)}
                />
            )}
        </DialogContext.Provider>
    );
}

export function useDialog() {
    const ctx = useContext(DialogContext);
    if (!ctx) throw new Error('useDialog must be used within a <DialogProvider>');
    return ctx;
}
