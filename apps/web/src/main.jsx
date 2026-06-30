import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App, FileServiceProvider } from '@canopen-editor/renderer';
import { browserFileService } from './platform/browserFileService.js';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <FileServiceProvider value={browserFileService}>
            <App />
        </FileServiceProvider>
    </StrictMode>
);
