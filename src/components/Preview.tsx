import {useState} from "react";
import {cloneRepo} from "../services/github.ts";
import {mountFiles, startDevServer} from "../services/nodepod.ts";

interface Props {
    previewUrl: string | null;
}

export default function Preview({ previewUrl }: Props) {
    const [formState, setFormState] = useState({
        githubToken: import.meta.env.VITE_GH_TOKEN ?? "",
        repoUrl: "",
    });

    const handleSubmit = async (event: SubmitEvent) => {
        event.preventDefault();
        const files = await cloneRepo({
            url: formState.repoUrl,
            token: formState.githubToken,
        });
        await mountFiles(files);
        await startDevServer();
    };

    return (
        <div className="flex-1 flex flex-col items-center gap-5">
            <div>
                <h1 className="text-3xl font-bold mb-2 text-center">Hello Nodepod</h1>
                <p>
                    <span className="font-bold">Virtual Server Url:</span> {previewUrl}
                </p>
            </div>

            <form className="flex gap-5" onSubmit={handleSubmit}>
                {/*<div className="flex flex-col gap-2">*/}
                {/*    <label>Github Token</label>*/}
                {/*    <input*/}
                {/*        type="password"*/}
                {/*        name="github_token"*/}
                {/*        className="border border-white rounded-lg p-3"*/}
                {/*        value={formState.githubToken}*/}
                {/*        onChange={(e) =>*/}
                {/*            setFormState((prev) => ({ ...prev, githubToken: e.target.value }))*/}
                {/*        }*/}
                {/*    />*/}
                {/*</div>*/}

                <div className="flex flex-col gap-2">
                    <label>Github Repo Url</label>
                    <input
                        type="text"
                        name="repo_url"
                        className="border border-white rounded-lg p-3"
                        value={formState.repoUrl}
                        onChange={(e) =>
                            setFormState((prev) => ({ ...prev, repoUrl: e.target.value }))
                        }
                    />
                </div>

                <button
                    type="submit"
                    className="bg-green-500 self-end px-5 py-3.5 rounded-lg cursor-pointer"
                >
                    Load
                </button>
            </form>

            <iframe
                src={previewUrl}
                className="w-full h-full border border-green-500"
            ></iframe>
        </div>
    )
}