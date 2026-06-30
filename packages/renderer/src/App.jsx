import './index.css';
import EditorPage from './pages/EditorPage/EditorPage.jsx';
import { DialogProvider } from './components/Dialog/DialogProvider.jsx';

export default function App() {
    return (
        <DialogProvider>
            <EditorPage />
        </DialogProvider>
    );
}
