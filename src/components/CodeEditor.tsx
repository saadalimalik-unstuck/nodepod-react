import {Editor, type BeforeMount} from "@monaco-editor/react";
import FileTree from "./FileTree.tsx";
import {useState} from "react";
import {pod} from "../services/nodepod.ts";

const LANGUAGE_EXTENSIONS: Record<string, string> = {
    'html': 'html',
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'json': 'json',
    'css': 'css',
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

export default function CodeEditor() {
    const [openedFile, setOpenedFile] = useState<string | null>(null);
    const [openedFileContents, setOpenedFileContents] = useState<string>("");

    const saveFile = async () => {
        if (!pod || !openedFile) return;

        const savedContents = await pod.fs.readFile(openedFile, 'utf-8');
        if (savedContents === openedFileContents) return;

        await pod.fs.writeFile(openedFile, openedFileContents);
    }

    const handleOpenFile = async (path: string) => {
        if (!pod || path === openedFile) return;

        if (openedFile) await saveFile();

        const fileContents = await pod.fs.readFile(path, 'utf-8');
        setOpenedFile(path);
        setOpenedFileContents(fileContents);
    }

    const closeFile = async () => {
        if (openedFile) await saveFile();
        setOpenedFile(null);
        setOpenedFileContents('');
    }

    return (
        <div className="flex">
            <FileTree onOpenFile={handleOpenFile} />
            {
                openedFile && (
                    <div>
                        <div className="flex justify-between items-center px-4 py-1 bg-white/10">
                            <small>
                                {openedFile}
                            </small>

                            <button className="cursor-pointer group" onClick={() => closeFile()}>
                                <small className="group-hover:underline">close file</small>
                            </button>
                        </div>

                        <Editor
                            width="40vw"
                            height="100vh"
                            beforeMount={handleEditorWillMount}
                            language={LANGUAGE_EXTENSIONS[openedFile?.split('.').pop() ?? 'DEFAULT']}
                            theme="vs-dark"
                            path={openedFile ?? undefined}
                            defaultValue="// Start coding here..."
                            onChange={(value) => value ? setOpenedFileContents(value) : null}
                            value={openedFileContents}
                            options={{
                                fontSize: 14,
                                minimap: { enabled: false },
                                wordWrap: "on",
                            }}
                        />
                    </div>
                )
            }
        </div>
    )
}