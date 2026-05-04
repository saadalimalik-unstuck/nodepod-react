import { Editor, type BeforeMount, type Monaco } from '@monaco-editor/react';
import FileTree from './FileTree.tsx';
import QuickMenu from './QuickMenu.tsx';
import { useState } from 'react';
import { pod } from '../services/nodepod.ts';
import { X } from 'lucide-react';

const LANGUAGE_EXTENSIONS: Record<string, string> = {
    html: 'html',
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    json: 'json',
    css: 'css',
    DEFAULT: 'typescript',
};

const handleEditorWillMount: BeforeMount = (monaco) => {
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
        allowJs: true,
        allowNonTsExtensions: true,
    });
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSuggestionDiagnostics: true,
        noSyntaxValidation: true,
    });
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
        allowJs: true,
        allowNonTsExtensions: true,
    });
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSuggestionDiagnostics: true,
        noSyntaxValidation: true,
    });
};

interface Props {
    previewUrl?: string;
}

export default function CodeEditor({ previewUrl }: Props) {
    const [openedFile, setOpenedFile] = useState<string | null>(null);
    const [openedFileContents, setOpenedFileContents] = useState<string>('');

    const saveFile = async () => {
        if (!pod || !openedFile) return;

        const savedContents = await pod.fs.readFile(openedFile, 'utf-8');
        if (savedContents === openedFileContents) return;

        await pod.fs.writeFile(openedFile, openedFileContents);
    };

    const handleOpenFile = async (path: string) => {
        if (!pod || path === openedFile) return;

        if (openedFile) await saveFile();

        const fileContents = await pod.fs.readFile(path, 'utf-8');
        setOpenedFile(path);
        setOpenedFileContents(fileContents);
    };

    const closeFile = async () => {
        if (openedFile) await saveFile();
        setOpenedFile(null);
        setOpenedFileContents('');
    };

    function handleEditorDidMount(editor: any, monaco: Monaco) {
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            saveFile();
        });
    }

    return (
        <div className="flex flex-1">
            <FileTree onOpenFile={handleOpenFile} />

            {!previewUrl && <QuickMenu />}

            {openedFile && (
                <div>
                    <div className="flex justify-between items-center px-4 py-1 bg-stone-700">
                        <small>{openedFile}</small>

                        <button
                            className="group cursor-pointer flex flex-col"
                            onClick={() => closeFile()}
                        >
                            <X size={18} />
                            <span className="border-b border-transparent group-hover:border-white"></span>
                        </button>
                    </div>

                    <Editor
                        width="40vw"
                        height="100vh"
                        beforeMount={handleEditorWillMount}
                        onMount={handleEditorDidMount}
                        language={
                            LANGUAGE_EXTENSIONS[
                                openedFile?.split('.').pop() ?? 'DEFAULT'
                            ]
                        }
                        theme="vs-dark"
                        path={openedFile ?? undefined}
                        defaultValue="// Start coding here..."
                        onChange={(value) =>
                            value ? setOpenedFileContents(value) : null
                        }
                        value={openedFileContents}
                        options={{
                            fontSize: 14,
                            minimap: { enabled: false },
                            wordWrap: 'on',
                        }}
                    />
                </div>
            )}
        </div>
    );
}
