import { useEffect, useState } from 'react';
import { getFileTree } from '../services/nodepod.ts';
import { Plus, RotateCcw } from 'lucide-react';

export type FileTreeI = Array<{
    type: 'f' | 'd';
    title: string;
    path: string;
    collapsed?: boolean;
    children?: FileTreeI;
}>;

export default function FileTree({
    onOpenFile,
}: {
    onOpenFile: (path: string) => void;
}) {
    const [files, setFiles] = useState<FileTreeI>([]);

    const sortFileTree = (tree: FileTreeI): FileTreeI => {
        tree.sort((a, b) => {
            if (a.type === 'd' && b.type !== 'd') return -1;
            if (a.type !== 'd' && b.type === 'd') return 1;
            return a.title.localeCompare(b.title);
        });
        for (const item of tree) {
            if (item.children?.length) {
                sortFileTree(item.children);
            }
        }
        return tree;
    };

    const parseFileTree = (tree: string[]) => {
        const fileTree: FileTreeI = [];

        for (const file of tree) {
            const treeItems = file.split('/').filter(Boolean);

            let parentRef: FileTreeI[number] | null = null;

            treeItems.forEach((item, index) => {
                let file: FileTreeI[number];
                const path = '/' + treeItems.slice(0, index + 1).join('/');

                if (index === treeItems.length - 1) {
                    file = {
                        type: 'f',
                        title: item,
                        path,
                    };
                } else {
                    file = {
                        type: 'd',
                        title: item,
                        path,
                        collapsed: true,
                        children: [],
                    };
                }

                const refToPushTo = parentRef?.children ?? fileTree;
                const alreadyExists = refToPushTo.find(
                    (child) => child.title === file.title
                );
                if (alreadyExists) {
                    parentRef = alreadyExists;
                } else {
                    refToPushTo.push(file);
                    parentRef = file;
                }
            });
        }

        return fileTree;
    };

    const handleOpenFile = (file: FileTreeI[number]) => {
        if (file.type === 'd') {
            file.collapsed = !file.collapsed;
            setFiles((prev) => [...prev]);
            return;
        }

        onOpenFile(file.path);
    };

    const setupFileTree = async () => {
        let fileTree = await getFileTree();
        fileTree = parseFileTree(fileTree);
        fileTree = sortFileTree(fileTree);
        setFiles(fileTree);
    };

    const refreshFiletree = () => {
        setupFileTree();
    };

    useEffect(() => {
        setupFileTree();
    }, []);

    return (
        <div className="flex flex-col min-w-60 overflow-x-auto shadow-md border-r border-black/10 relative z-10">
            <div className="bg-white/10 px-2 py-2 flex items-center justify-between">
                <div>
                    <h1 className="text-xs">Project Name</h1>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        className="group cursor-pointer flex flex-col"
                        onClick={refreshFiletree}
                        title="Close file"
                    >
                        <Plus size={18} />
                        <span className="border-b border-transparent group-hover:border-white"></span>
                    </button>

                    <button
                        className="group cursor-pointer flex flex-col"
                        onClick={refreshFiletree}
                    >
                        <RotateCcw size={16} />
                        <span className="border-b border-transparent group-hover:border-white"></span>
                    </button>
                </div>
            </div>
            <ul className="p-4 max-h-screen overflow-y-scroll">
                {files.map((file) => (
                    <FileItem
                        key={file.title}
                        file={file}
                        onOpenFile={handleOpenFile}
                    />
                ))}
                {files.length === 0 && (
                    <small className="inline-block w-full text-center">
                        No files to show.
                    </small>
                )}
            </ul>
        </div>
    );
}

function FileItem({
    file,
    onOpenFile,
}: {
    file: FileTreeI[number];
    onOpenFile: (file: FileTreeI[number]) => void;
}) {
    return (
        <>
            <li>
                <button
                    title={file.title}
                    className={`flex items-center w-full min-w-fit mb-2 px-4 rounded-md cursor-pointer group ${file.type === 'd' ? 'bg-orange-700' : 'bg-gray-950/50'}`}
                    onClick={() => onOpenFile(file)}
                >
                    <small className="inline-block group-hover:underline">
                        {file.title.slice(0, 20)}
                        {file.title.length > 20 ? '...' : ''}
                    </small>
                </button>
            </li>
            <ul
                className={`pl-5 ${file.collapsed ? 'h-0 overflow-hidden' : ''}`}
            >
                {file.children?.map((item) => (
                    <FileItem
                        key={item.title}
                        file={item}
                        onOpenFile={onOpenFile}
                    />
                ))}
            </ul>
        </>
    );
}
