interface Props {
    previewUrl?: string;
}

export default function Preview({ previewUrl }: Props) {
    return (
        <div className="flex-1 flex flex-col items-center gap-5">
            <iframe
                src={previewUrl}
                className="w-full h-full border border-green-500"
            ></iframe>
        </div>
    );
}
