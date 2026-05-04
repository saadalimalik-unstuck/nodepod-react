import { useEffect, useRef, useState } from 'react';
import { cloneRepo } from '../services/github.ts';
import { mountFiles, startDevServer } from '../services/nodepod.ts';

export default function QuickMenu() {
    const [isGithubUrlInputShown, setIsGithubUrlInputShown] = useState(false);
    const githubUrlInputRef = useRef<HTMLInputElement | null>(null);
    const cloneRepoButtonRef = useRef<HTMLButtonElement | null>(null);

    const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();

        const url = githubUrlInputRef.current?.value || '';
        const token = import.meta.env.VITE_GH_TOKEN;

        if (!token) throw Error('No token found!');
        if (!url) throw Error('No url provided!');

        setIsGithubUrlInputShown(false);

        const files = await cloneRepo({
            url,
            token,
        });
        await mountFiles(files);
        await startDevServer();
    };

    useEffect(() => {
        window.addEventListener('click', (event) => {
            if (!githubUrlInputRef.current || !cloneRepoButtonRef.current)
                return;

            const target = event.target as HTMLElement;

            if (
                !githubUrlInputRef.current.contains(target) &&
                !cloneRepoButtonRef.current.contains(target)
            ) {
                setIsGithubUrlInputShown(false);
            }
        });
    }, []);

    return (
        <section className="flex items-center justify-center bg-neutral-800 h-full w-full relative">
            {isGithubUrlInputShown && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 mt-5 w-1/3">
                    <form onSubmit={handleSubmit}>
                        <input
                            ref={githubUrlInputRef}
                            autoFocus={true}
                            type="text"
                            className="bg-stone-600 border-stone-900 rounded w-full p-2"
                        />
                    </form>
                </div>
            )}

            <button
                ref={cloneRepoButtonRef}
                className="border border-stone-900 bg-stone-800 text-stone-200 rounded-lg p-5 cursor-pointer"
                onClick={() => setIsGithubUrlInputShown(true)}
            >
                Clone Project
            </button>
        </section>
    );
}
