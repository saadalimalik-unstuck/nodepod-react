import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { cloneRepo } from '../services/github.ts';
import { mountFiles, startDevServer } from '../services/nodepod.ts';
import { SendHorizonal } from 'lucide-react';
import { type Id as ToastId, toast } from 'react-toastify';
import AnsiToHtml from 'ansi-to-html';

export default function QuickMenu() {
    const [isGithubUrlInputShown, setIsGithubUrlInputShown] = useState(false);
    const githubUrlInputRef = useRef<HTMLInputElement | null>(null);
    const formContainerRef = useRef<HTMLDivElement | null>(null);
    const cloneRepoButtonRef = useRef<HTMLButtonElement | null>(null);
    const eventToastId = useRef<ToastId | null>(null);

    const ansiConverter = useRef(new AnsiToHtml());

    const showEvent = (event: string) => {
        const html = ansiConverter.current.toHtml(event);
        const rendered = <span dangerouslySetInnerHTML={{ __html: html }} />;

        if (!eventToastId.current) {
            eventToastId.current = toast(rendered, {
                autoClose: false,
                closeButton: false,
            });
        } else {
            toast.update(eventToastId.current, { render: rendered });
        }
    };

    const handleSubmit = async (event: SubmitEvent) => {
        event.preventDefault();

        const url = githubUrlInputRef.current?.value || '';
        const token = import.meta.env.VITE_GH_TOKEN;

        setIsGithubUrlInputShown(false);

        if (!token) throw Error('No token found!');
        if (!url) throw Error('No url provided!');

        const files = await cloneRepo({
            url,
            token,
        });
        showEvent(`[github] Fetched ${Object.keys(files).length} files.`);

        await mountFiles(files);
        showEvent(`[nodepod] ${Object.keys(files).length} files mounted.`);

        await startDevServer({ processCallback: showEvent });

        setTimeout(() => {
            if (eventToastId.current) toast.dismiss(eventToastId.current);
            eventToastId.current = null;
        }, 2000);
    };

    useEffect(() => {
        window.addEventListener('click', (event) => {
            if (!formContainerRef.current || !cloneRepoButtonRef.current)
                return;

            const target = event.target as HTMLElement;

            if (
                !formContainerRef.current.contains(target) &&
                !cloneRepoButtonRef.current.contains(target)
            ) {
                setIsGithubUrlInputShown(false);
            }
        });
    }, []);

    return (
        <section className="flex items-center justify-center bg-neutral-800 h-full w-full relative">
            {isGithubUrlInputShown && (
                <div
                    ref={formContainerRef}
                    className="absolute top-0 left-1/2 -translate-x-1/2 mt-5 w-1/3"
                >
                    <form onSubmit={handleSubmit}>
                        <input
                            ref={githubUrlInputRef}
                            autoFocus={true}
                            type="text"
                            className="bg-stone-600 border-stone-900 rounded w-full p-2 pr-12"
                            placeholder="Enter a public repo's https url"
                        />
                        <button
                            type="submit"
                            className="group cursor-pointer flex flex-col absolute top-1/2 right-0 -translate-y-1/2 mr-1.5 bg-stone-700 px-2 py-1 rounded"
                        >
                            <SendHorizonal size={18} />
                            <span className="border-b border-transparent group-hover:border-white"></span>
                        </button>
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
