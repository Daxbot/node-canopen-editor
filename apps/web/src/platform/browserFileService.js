/**
 * Browser implementation of the renderer FileService.
 *
 * Open uses a transient <input type="file"> + FileReader (no source path).
 * Write triggers a browser download — there is no concept of overwriting a
 * path in place, so the `path` argument is ignored.
 */
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
};
