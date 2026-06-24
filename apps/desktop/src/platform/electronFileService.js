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

    // Native menu / keyboard accelerators (New, Open, Save, Export).
    onMenuCommand(callback) {
        return window.electronAPI.onMenuCommand(callback);
    },
};
