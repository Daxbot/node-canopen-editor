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
