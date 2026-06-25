/**
 * Browser implementation of the renderer FileService.
 *
 * Open uses a transient <input type="file"> + FileReader (no source path).
 * Write triggers a browser download — there is no concept of overwriting a
 * path in place, so the `path` argument is ignored.
 */

// Custom web clipboard format. The async Clipboard API requires the "web "
// prefix to carry an application-specific MIME type across tabs.
const WEB_CLIPBOARD_FORMAT = 'web application/x-canopen-object+json';

export const browserFileService = {
    isDesktop: false,

    openTextFile({ extensions = [] } = {}) {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            if (extensions.length) {
                input.accept = extensions.map(e => `.${e}`).join(',');
            }
            input.style.display = 'none';

            input.addEventListener('change', () => {
                const file = input.files?.[0];
                input.remove();
                if (!file) {
                    resolve(null);
                    return;
                }
                const reader = new FileReader();
                reader.onload = (evt) =>
                    resolve({ name: file.name, path: null, content: evt.target.result });
                reader.onerror = () =>
                    reject(reader.error ?? new Error('Failed to read file'));
                reader.readAsText(file);
            });

            // If the dialog is dismissed without a selection, no event fires —
            // there is no reliable cancel signal, so we simply never resolve in
            // that case (matches the original hidden-input behavior).
            document.body.appendChild(input);
            input.click();
        });
    },

    writeFile({ suggestedName, content, contentType = 'text/plain' }) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = suggestedName || 'device';
        a.click();
        URL.revokeObjectURL(url);
        // Downloads have no on-disk path to report back.
        return Promise.resolve({ name: suggestedName, path: null });
    },

    // ─── Clipboard (JSON object dictionary entries) ────────────────────────────

    async writeClipboardObject(payload) {
        const json = JSON.stringify(payload);
        // Write under our custom web format (cross-tab) plus a text/plain copy as
        // a same-engine fallback and a debugging aid.
        await navigator.clipboard.write([
            new ClipboardItem({
                // Chromium requires each Blob's type to match its ClipboardItem key.
                [WEB_CLIPBOARD_FORMAT]: new Blob([json], { type: WEB_CLIPBOARD_FORMAT }),
                'text/plain': new Blob([json], { type: 'text/plain' }),
            }),
        ]);
    },

    async readClipboardObject() {
        try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                const type = item.types.includes(WEB_CLIPBOARD_FORMAT)
                    ? WEB_CLIPBOARD_FORMAT
                    : item.types.includes('text/plain')
                        ? 'text/plain'
                        : null;
                if (!type) continue;
                const text = await (await item.getType(type)).text();
                return JSON.parse(text);
            }
        } catch {
            // No readable clipboard data, denied permission, or non-JSON content.
        }
        return null;
    },
};
