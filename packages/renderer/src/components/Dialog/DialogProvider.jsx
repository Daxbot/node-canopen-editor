/* eslint-disable react-refresh/only-export-components -- context module exports a provider component alongside its hook */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import Dialog from './Dialog.jsx';

/**
 * Imperative dialog API, replacing the native window.confirm / alert.
 *
 *   const dialog = useDialog();
 *   if (!(await dialog.confirm({ title, message, confirmLabel, danger }))) return;
 *   await dialog.alert({ title, message });          // or dialog.alert('message')
 *
 * confirm() resolves to true/false; alert() resolves once dismissed.
 */
const DialogContext = createContext(null);

export function DialogProvider({ children }) {
    const [dialog, setDialog] = useState(null);

    const confirm = useCallback((opts) => new Promise((resolve) => {
        setDialog({
            title: 'Confirm', confirmLabel: 'OK', cancelLabel: 'Cancel', danger: false,
            ...opts, resolve,
        });
    }), []);

    const alert = useCallback((opts) => new Promise((resolve) => {
        const o = typeof opts === 'string' ? { message: opts } : opts;
        setDialog({ title: 'Notice', confirmLabel: 'OK', cancelLabel: null, ...o, resolve });
    }), []);

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
