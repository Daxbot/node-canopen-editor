import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App, FileServiceProvider } from '@canopen-editor/renderer';
import { electronFileService } from './platform/electronFileService.js';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <FileServiceProvider value={electronFileService}>
            <App />
        </FileServiceProvider>
    </StrictMode>
);
