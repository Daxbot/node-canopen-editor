import { useCallback, useState } from 'react';
import { useFileService } from '../../../platform/FileServiceContext.jsx';
import ContextMenu from '../components/ContextMenu/ContextMenu.jsx';

/**
 * Unifies the two context-menu styles behind one `openMenu(event, items)` call.
 *
 * Each item is { id, label, shortcut?, disabled?, danger?, onSelect } or
 * { type: 'separator' }.
 *
 *   - Desktop (FileService.showNativeContextMenu present): strip the closures to
 *     a serialisable template, hand it to the native Electron menu, and invoke
 *     the chosen item's onSelect.
 *   - Web: render the in-DOM <ContextMenu>.
 *
 * Returns { openMenu, menuElement }. Render `menuElement` somewhere in the tree.
 */
export function useContextMenu() {
    const fileService = useFileService();
    const [menu, setMenu] = useState(null);

    const openMenu = useCallback(async (event, items) => {
        event.preventDefault();
        event.stopPropagation();

        if (fileService.showNativeContextMenu) {
            const template = items.map(item =>
                item.type === 'separator'
                    ? { type: 'separator' }
                    : { id: item.id, label: item.label, enabled: !item.disabled }
            );
            const actionId = await fileService.showNativeContextMenu(template);
            if (actionId == null) return;
            const chosen = items.find(it => it.id === actionId);
            chosen?.onSelect?.();
            return;
        }

        setMenu({ x: event.clientX, y: event.clientY, items });
    }, [fileService]);

    const closeMenu = useCallback(() => setMenu(null), []);

    const menuElement = menu && (
        <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={closeMenu} />
    );

    return { openMenu, menuElement };
}
