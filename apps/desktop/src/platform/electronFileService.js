/**
 * Electron implementation of the renderer FileService.
 *
 * Delegates to the contextBridge API (`window.electronAPI`) exposed by the
 * preload script, which forwards to the main process over IPC.
 */
export const electronFileService = {
    isDesktop: true,

    openTextFile({ extensions = [] } = {}) {
        return window.electronAPI.openFile({ extensions });
    },

    writeFile({ path, suggestedName, content, extensions = [] }) {
        return window.electronAPI.writeFile({ path, suggestedName, content, extensions });
    },

    // ─── Clipboard (JSON object dictionary entries) ────────────────────────────

    writeClipboardObject(payload) {
        return window.electronAPI.clipboardWrite(JSON.stringify(payload));
    },

    async readClipboardObject() {
        const json = await window.electronAPI.clipboardRead();
        if (!json) return null;
        try {
            return JSON.parse(json);
        } catch {
            return null;
        }
    },

    // Native OS context menu; resolves to the chosen item id or null.
    showNativeContextMenu(items) {
        return window.electronAPI.showContextMenu(items);
    },

    // Native menu / keyboard accelerators (New, Open, Save, Export).
    onMenuCommand(callback) {
        return window.electronAPI.onMenuCommand(callback);
    },
};
