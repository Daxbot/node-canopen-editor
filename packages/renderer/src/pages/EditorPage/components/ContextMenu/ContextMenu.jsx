import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import styles from './ContextMenu.module.css';

/**
 * Custom in-DOM context menu (used on web; desktop uses a native Electron menu).
 *
 * Props:
 *   x, y     — viewport coordinates of the click
 *   items    — array of { id, label, shortcut?, disabled?, danger?, onSelect }
 *              or { type: 'separator' }
 *   onClose  — called when the menu should dismiss
 */
export default function ContextMenu({ x, y, items, onClose }) {
    const ref = useRef(null);
    const [pos, setPos] = useState({ x, y });

    // Clamp to the viewport once the menu has measured itself.
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const { width, height } = el.getBoundingClientRect();
        const margin = 4;
        const nextX = Math.min(x, window.innerWidth - width - margin);
        const nextY = Math.min(y, window.innerHeight - height - margin);
        setPos({ x: Math.max(margin, nextX), y: Math.max(margin, nextY) });
    }, [x, y]);

    // Dismiss on outside interaction, Escape, scroll, or resize.
    useEffect(() => {
        function onPointerDown(e) {
            if (!ref.current?.contains(e.target)) onClose();
        }
        function onKeyDown(e) {
            if (e.key === 'Escape') onClose();
        }
        window.addEventListener('pointerdown', onPointerDown, true);
        window.addEventListener('keydown', onKeyDown, true);
        window.addEventListener('scroll', onClose, true);
        window.addEventListener('resize', onClose, true);
        return () => {
            window.removeEventListener('pointerdown', onPointerDown, true);
            window.removeEventListener('keydown', onKeyDown, true);
            window.removeEventListener('scroll', onClose, true);
            window.removeEventListener('resize', onClose, true);
        };
    }, [onClose]);

    return (
        <div
            ref={ref}
            className={styles.menu}
            style={{ left: pos.x, top: pos.y }}
            onContextMenu={e => e.preventDefault()}
        >
            {items.map((item, i) => {
                if (item.type === 'separator') {
                    return <div key={`sep-${i}`} className={styles.separator} />;
                }
                return (
                    <button
                        key={item.id}
                        className={`${styles.item} ${item.danger ? styles.danger : ''}`}
                        disabled={item.disabled}
                        onClick={() => { onClose(); item.onSelect?.(); }}
                    >
                        <span className={styles.label}>{item.label}</span>
                        {item.shortcut && (
                            <span className={styles.shortcut}>{item.shortcut}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
