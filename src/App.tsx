import { useEffect, useState } from 'react';
import './App.css';
import { initNodepod } from './services/nodepod';
import Preview from './components/Preview.tsx';
import CodeEditor from './components/CodeEditor.tsx';
import { ToastContainer } from 'react-toastify';

function App() {
    const [serverUrl, setServerUrl] = useState<string | undefined>();
    const [isPodReady, setIsPodReady] = useState<boolean>(false);

    const setupNodepod = async () => {
        const pod = await initNodepod({
            onServerReady: setServerUrl,
        });
        setIsPodReady(!!pod);
    };

    // Start Nodepod
    useEffect(() => {
        setupNodepod();
    }, []);

    return (
        <div className="bg-black/90 text-white fixed inset-0 flex">
            {isPodReady && (
                <CodeEditor key={serverUrl} previewUrl={serverUrl} />
            )}
            {serverUrl && <Preview previewUrl={serverUrl} />}
            <ToastContainer position="bottom-right" limit={5} />
        </div>
    );
}

export default App;
