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

// Patch vite.config.ts for nodepod compatibility without clobbering existing settings.
//
// Problems fixed:
//   1. path.resolve(__dirname, ...) — __dirname is undefined in ESM ("type":"module")
//      packages under nodepod's WASM Node.js. Replace with hardcoded /app/... paths.
//   2. server.host / server.allowedHosts — Vite 6 blocks requests whose Host header
//      doesn't match allowedHosts; nodepod proxies via __virtual__ URLs.
function patchViteConfig(content: string, workdir = '/app'): string {
  // 1. Replace path.resolve(__dirname, 'rel') → '/app/rel'
  if (/\b__dirname\b/.test(content)) {
    content = content.replace(
      /path\.resolve\(\s*__dirname\s*,\s*['"]([^'"]*)['"]\s*\)/g,
      (_, rel) => `'${workdir}/${rel.replace(/^\.\//, '')}'`
    );
  }

  // 2. server block — inject or patch host + allowedHosts
  if (/\bserver\s*:\s*\{/.test(content)) {
    if (/\bhost\s*:/.test(content)) {
      content = content.replace(/(\bhost\s*:\s*)[^\n,}]+/, "$1true");
    } else {
      content = content.replace(/(\bserver\s*:\s*\{)/, "$1\n    host: true,");
    }
    if (/\ballowedHosts\s*:/.test(content)) {
      content = content.replace(/(\ballowedHosts\s*:\s*)[^\n,}]+/, "$1'all'");
    } else {
      content = content.replace(/(\bserver\s*:\s*\{)/, "$1\n    allowedHosts: 'all',");
    }
  } else {
    content = content.replace(
      /(\}\s*\)\s*;?\s*)$/,
      `  server: {\n    host: true,\n    allowedHosts: 'all',\n  },\n$1`
    );
  }

  return content;
}

// Vite 6 uses JS-based worker_threads for bundling which nodepod cannot run.
// Vite 7 uses Rolldown (WASM/Rust workers) which nodepod supports.
// Patch the project's package.json to ensure vite >= 7 before installing.
async function patchPackageJson() {
  if (!pod) return;

  const raw = await pod.fs.readFile('/app/package.json', 'utf-8');
  const pkg = JSON.parse(raw);
  const dev = pkg.devDependencies ?? {};

  const majorOf = (range: string) => parseInt(range.replace(/[^0-9]/, ''), 10);

  let changed = false;

  if (dev.vite && majorOf(dev.vite) < 7) {
    dev.vite = '^7.0.0';
    changed = true;
  }
  if (dev['@vitejs/plugin-react'] && majorOf(dev['@vitejs/plugin-react']) < 5) {
    dev['@vitejs/plugin-react'] = '^5.0.0';
    changed = true;
  }

  if (changed) {
    pkg.devDependencies = dev;
    await pod.fs.writeFile('/app/package.json', JSON.stringify(pkg, null, 2));
    console.log('[nodepod] Upgraded vite to ^7.0.0 for nodepod compatibility');
  }
}

// React Router's BrowserRouter reads window.location.pathname, which inside a nodepod
// iframe is "/__virtual__/podXXXX/5173" — no app routes match that prefix.
// Fix: inject a tiny script into index.html that detects the virtual basename and
// exposes it as window.__NODEPOD_BASENAME__, then patch BrowserRouter/createBrowserRouter
// usages to pass it as the basename option.
async function patchReactRouter() {
  if (!pod) return;

  // 1. Inject basename detection script into index.html
  try {
    let html = await pod.fs.readFile('/app/index.html', 'utf-8');
    if (!html.includes('__NODEPOD_BASENAME__')) {
      const script = `  <script>window.__NODEPOD_BASENAME__=(function(){var m=location.pathname.match(/^\\/__virtual__\\/[^/]+\\/\\d+/);return m?m[0]:'/';})();</script>`;
      html = html.replace('<head>', `<head>\n${script}`);
      await pod.fs.writeFile('/app/index.html', html);
    }
  } catch { /* index.html missing — skip */ }

  // 2. Patch BrowserRouter / createBrowserRouter in common entry files
  const candidates = ['/app/src/main.tsx', '/app/src/main.ts', '/app/src/App.tsx'];
  for (const file of candidates) {
    try {
      let content = await pod.fs.readFile(file, 'utf-8');
      let changed = false;

      // <BrowserRouter> → <BrowserRouter basename={window.__NODEPOD_BASENAME__}>
      if (content.includes('BrowserRouter') && !content.includes('__NODEPOD_BASENAME__')) {
        content = content.replace(/<BrowserRouter>/g, '<BrowserRouter basename={window.__NODEPOD_BASENAME__}>');
        changed = true;
      }

      // createBrowserRouter(routes) → createBrowserRouter(routes, { basename: ... })
      if (content.includes('createBrowserRouter') && !content.includes('__NODEPOD_BASENAME__')) {
        content = content.replace(
          /createBrowserRouter\((\[[^\]]*\]|\w+)\s*\)/g,
          'createBrowserRouter($1, { basename: window.__NODEPOD_BASENAME__ })'
        );
        changed = true;
      }

      if (changed) await pod.fs.writeFile(file, content);
    } catch { /* file missing — skip */ }
  }
}

export async function startDevServer() {
  if (!pod) throw new Error("No pod instance initialized!");

  await patchPackageJson();
  await runCommand('npm', ['install']);

  const originalConfig = await pod.fs.readFile('/app/vite.config.ts', 'utf-8');
  const patched = patchViteConfig(originalConfig, pod.cwd ?? '/app');
  await pod.fs.writeFile('/app/vite.config.ts', patched);

  await patchReactRouter();

  await runCommand('npm', ['run', 'dev']);
}

export function logProcessData(proc: NodepodProcess) {
  proc.on("output", (text) => console.log("[Process output]", text)); // stdout
  proc.on("error", (text) => console.log("[Process error]", text)); // stderr
  proc.on("exit", (code) => console.log("[Process exit]", code));
}
