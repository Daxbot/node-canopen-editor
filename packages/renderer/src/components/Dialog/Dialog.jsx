import { useEffect } from 'react';
import styles from './Dialog.module.css';

/**
 * Reusable dark-FUI modal dialog.
 *
 * Presentational only — drive it imperatively via the `useDialog()` hook
 * (confirm / alert), which manages mounting and promise resolution.
 *
 * Props:
 *   title        — header text
 *   message      — body content (string or any ReactNode)
 *   confirmLabel — primary button label (default "OK")
 *   cancelLabel  — secondary button label; omit/falsy for a single-button alert
 *   danger       — render the confirm button in the danger style
 *   onConfirm    — primary button
 *   onCancel     — X / overlay click / Escape / secondary button
 */
export default function Dialog({
    title,
    message,
    confirmLabel = 'OK',
    cancelLabel,
    danger = false,
    onConfirm,
    onCancel,
}) {
    useEffect(() => {
        function onKeyDown(e) {
            if (e.key === 'Escape') onCancel();
            else if (e.key === 'Enter') onConfirm();
        }
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [onConfirm, onCancel]);

    return (
        <div className={styles.overlay} onClick={onCancel}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles['modal-header']}>
                    <span>{title}</span>
                    <button className={styles['close-btn']} onClick={onCancel}>✕</button>
                </div>
                <div className={styles['modal-body']}>
                    {message != null && <div className={styles.message}>{message}</div>}
                    <div className={styles['modal-actions']}>
                        {cancelLabel && <button onClick={onCancel}>{cancelLabel}</button>}
                        <button
                            autoFocus
                            className={danger ? 'danger' : 'primary'}
                            onClick={onConfirm}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
