/* eslint-disable react-refresh/only-export-components -- context module exports a provider component alongside its hook */
import { createContext, useContext } from 'react';

/**
 * Platform file-I/O abstraction.
 *
 * The renderer never touches the browser or Electron file APIs directly.
 * Each host app (web / desktop) provides a concrete implementation of this
 * service and injects it via <FileServiceProvider>. Serialization stays in the
 * renderer — the service only performs the read/write primitives.
 *
 * Shape:
 *   {
 *     isDesktop: boolean,
 *
 *     // Prompt the user to pick a text file and read it.
 *     // Resolves to { name, path, content } or null if cancelled.
 *     // `path` is null on web (downloads have no source path).
 *     openTextFile({ extensions }): Promise<OpenResult | null>,
 *
 *     // Write `content` to disk.
 *     //   path set  -> overwrite that path in place (desktop inline save)
 *     //   path null -> Save dialog (desktop) / browser download (web)
 *     // Resolves to { name, path } on success or null if cancelled.
 *     writeFile({ path, suggestedName, content, contentType, extensions }): Promise<SaveResult | null>,
 *
 *     // Object-dictionary clipboard. The payload is the JSON envelope from
 *     // lib/clipboard.js; transport (custom MIME / OS clipboard format) is the
 *     // service's concern, the renderer owns the schema.
 *     writeClipboardObject(payload): Promise<void>,
 *     readClipboardObject(): Promise<payload | null>,   // null if no usable data
 *
 *     // Optional, desktop only (mirrors onMenuCommand): show a native OS context
 *     // menu. `items` is a serialisable template [{ id, label, enabled } | { type:'separator' }].
 *     // Resolves to the chosen item id, or null if dismissed. When absent (web),
 *     // the renderer falls back to a custom in-DOM context menu.
 *     showNativeContextMenu?(items): Promise<string | null>,
 *   }
 */
const FileServiceContext = createContext(null);

export function FileServiceProvider({ value, children }) {
    return (
        <FileServiceContext.Provider value={value}>
            {children}
        </FileServiceContext.Provider>
    );
}

export function useFileService() {
    const service = useContext(FileServiceContext);
    if (!service) {
        throw new Error('useFileService must be used within a <FileServiceProvider>');
    }
    return service;
}
