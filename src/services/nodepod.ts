import { Nodepod, NodepodProcess } from "@scelar/nodepod";
// import { htmlFile, serverFile } from "../mocks/server-files";

export let pod: Nodepod | null = null;

export async function initNodepod(options?: {
  onServerReady: (url: string) => void;
}) {
  pod = await Nodepod.boot({
    watermark: false,
    workdir: "/app",
    /* files: {
      "/app/index.js": serverFile,
      "/app/index.html": htmlFile,
    }, */
    allowedFetchDomains: null,
    onServerReady: (port, url) => {
      console.log(`Server ready on port: ${port}, url: ${url}`);
      options?.onServerReady(url);
    },
  });

  return pod;
}

export async function runCommand(command: string, args: string[] = []) {
  if (!pod) throw new Error("No pod instance initialized!");

  const hasRootPath = args.some((arg) => arg.startsWith("/"));

  const proc = await pod.spawn(command, args, {
    cwd: hasRootPath ? "/" : pod.cwd,
  });
  logProcessData(proc);
  await proc.completion;
}

export async function mountFiles(files: Record<string, string>) {
  if (!pod) throw new Error("No pod instance initialized!");

  const writeFilesPromises: Promise<void>[] = [];

  for (const [path, content] of Object.entries(files)) {
    writeFilesPromises.push(pod.fs.writeFile(path, content));
  }

  await Promise.all(writeFilesPromises);
}

export async function startDevServer() {
  if (!pod) throw new Error("No pod instance initialized!");

  await runCommand("npm", ["install"]);
  await runCommand("npm", ["run", "dev"]);
}

export function logProcessData(proc: NodepodProcess) {
  proc.on("output", (text) => console.log("[Process output]", text)); // stdout
  proc.on("error", (text) => console.log("[Process error]", text)); // stderr
  proc.on("exit", (code) => console.log("[Process exit]", code));
}
