import styles from './OverwriteDialog.module.css';

function hexIndex(index) {
    return `0x${Number(index).toString(16).toUpperCase().padStart(4, '0')}`;
}

/**
 * Confirmation modal shown when a pasted object's index already exists.
 *
 * Props: { index, onOverwrite, onCancel }
 */
export default function OverwriteDialog({ index, onOverwrite, onCancel }) {
    return (
        <div className={styles.overlay} onClick={onCancel}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles['modal-header']}>
                    <span>Object already exists</span>
                    <button className={styles['close-btn']} onClick={onCancel}>✕</button>
                </div>
                <div className={styles['modal-body']}>
                    <p className={styles.message}>
                        An object already exists at index{' '}
                        <span className={styles.index}>{hexIndex(index)}</span>. Overwrite it
                        with the pasted object?
                    </p>
                    <div className={styles['modal-actions']}>
                        <button onClick={onCancel}>Cancel</button>
                        <button className="danger" onClick={onOverwrite}>Overwrite</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
