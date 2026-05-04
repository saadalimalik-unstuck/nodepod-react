import { RotateCcw } from 'lucide-react';
import { useRef, type SubmitEvent } from 'react';

interface Props {
    previewUrl?: string;
    onUrlChange: (url: string) => void;
}

export default function Preview({ previewUrl, onUrlChange }: Props) {
    const browserUrlInput = useRef<HTMLInputElement | null>(null);

    let browserUrl: string | undefined;

    if (previewUrl) {
        const currentUrl = new URL(previewUrl);
        // Strip virtual prefix
        const pathname = currentUrl.pathname.split('/').slice(4).join('/');
        browserUrl = `${currentUrl.origin}/${pathname}`;
    }

    const handleSubmit = (event: SubmitEvent) => {
        event.preventDefault();

        if (!browserUrlInput.current || !previewUrl) return;

        const currentUrl = new URL(previewUrl);
        const virtualPrefix = currentUrl.pathname
            .split('/')
            .slice(1, 4)
            .join('/');
        const requestedUrl =
            new URL(browserUrlInput.current.value).pathname || '/';

        const newUrl = `${currentUrl.origin}/${virtualPrefix}${requestedUrl}`;
        onUrlChange(newUrl);
    };

    return (
        <div className="flex-1 flex flex-col items-center">
            <div className="bg-stone-700 w-full p-2 relative">
                <form onSubmit={handleSubmit}>
                    <input
                        ref={browserUrlInput}
                        type="text"
                        className="bg-stone-600 border-stone-900 rounded w-full p-2 pr-12"
                        placeholder="Application url"
                        defaultValue={browserUrl}
                    />
                    <button
                        type="submit"
                        className="group cursor-pointer flex flex-col absolute top-1/2 right-0 -translate-y-1/2 -translate-x-1/2 p-2"
                    >
                        <RotateCcw size={18} />
                        <span className="border-b border-transparent group-hover:border-white"></span>
                    </button>
                </form>
            </div>
            <iframe
                src={previewUrl}
                className="w-full h-full border border-green-500"
            ></iframe>
        </div>
    );
}
