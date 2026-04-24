const GITHUB_API = "https://api.github.com";

// Max file size to fetch (1MB) — skip large/binary files
const MAX_FILE_SIZE = 1_000_000;

// File extensions treated as binary — skip them
const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico",
  ".woff", ".woff2", ".ttf", ".eot",
  ".zip", ".tar", ".gz", ".rar",
  ".pdf", ".doc", ".docx",
  ".mp3", ".mp4", ".wav", ".ogg",
  ".exe", ".bin", ".dll", ".so", ".dylib",
]);

// Directories to skip entirely
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".nuxt",
  "coverage",
]);

export type FetchRepoOptions = (
  | { url: string; owner?: never; repo?: never; ref?: string }
  | { owner: string; repo: string; url?: never; ref?: string }
) & {
  token?: string;
  /** Mount prefix for file paths (e.g. "/app"). Defaults to "/app". */
  targetDir?: string;
}

interface GitTreeItem {
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
}

interface GitTree {
  sha: string;
  tree: GitTreeItem[];
  truncated: boolean;
}

function makeHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

function isBinaryPath(filePath: string): boolean {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

function shouldSkip(filePath: string): boolean {
  const segments = filePath.split("/");
  return segments.some((seg) => SKIP_DIRS.has(seg));
}

/**
 * Fetch the recursive git tree for a repo ref.
 * Uses the trees API: GET /repos/{owner}/{repo}/git/trees/{ref}?recursive=1
 */
async function fetchTree(
  owner: string,
  repo: string,
  ref: string,
  token?: string
): Promise<GitTree> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`;
  const res = await fetch(url, { headers: makeHeaders(token) });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub tree fetch failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<GitTree>;
}

/**
 * Fetch a single blob's content (base64-decoded to string).
 */
async function fetchBlob(
  blobUrl: string,
  token?: string
): Promise<string> {
  const res = await fetch(blobUrl, { headers: makeHeaders(token) });

  if (!res.ok) {
    throw new Error(`GitHub blob fetch failed (${res.status}): ${blobUrl}`);
  }

  const data = (await res.json()) as { content: string; encoding: string };

  if (data.encoding === "base64") {
    return atob(data.content.replace(/\n/g, ""));
  }

  return data.content;
}

/**
 * Resolve the default branch of a repo when no ref is provided.
 */
async function resolveDefaultBranch(
  owner: string,
  repo: string,
  token?: string
): Promise<string> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}`;
  const res = await fetch(url, { headers: makeHeaders(token) });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub repo fetch failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { default_branch: string };
  return data.default_branch;
}

/**
 * Clone a GitHub repo by fetching all text files via the API.
 * Returns a files map compatible with Nodepod's `files` option:
 *   `{ "/app/index.js": "...", "/app/package.json": "..." }`
 *
 * @example
 * const files = await cloneRepo({
 *   owner: "vercel",
 *   repo: "next.js",
 *   ref: "main",
 *   token: process.env.GITHUB_TOKEN,
 *   targetDir: "/app",
 * });
 */
export async function cloneRepo(
  options: FetchRepoOptions
): Promise<Record<string, string>> {
  const { token, targetDir = "/app" } = options;

  let owner: string;
  let repo: string;

  if (options.url) {
    const parsed = parseGithubUrl(options.url);
    owner = parsed.owner;
    repo = parsed.repo;
    options = { ...options, ref: options.ref ?? parsed.ref };
  } else {
    owner = options.owner;
    repo = options.repo;
  }

  const ref =
    options.ref ?? (await resolveDefaultBranch(owner, repo, token));

  const tree = await fetchTree(owner, repo, ref, token);

  if (tree.truncated) {
    console.warn(
      `[github] Tree for ${owner}/${repo}@${ref} was truncated — large repos may be incomplete`
    );
  }

  const blobs = tree.tree.filter(
    (item): item is GitTreeItem & { type: "blob" } =>
      item.type === "blob" &&
      !shouldSkip(item.path) &&
      !isBinaryPath(item.path) &&
      (item.size === undefined || item.size <= MAX_FILE_SIZE)
  );

  const entries = await Promise.allSettled(
    blobs.map(async (item) => {
      const content = await fetchBlob(item.url, token);
      const mountPath = `${targetDir}/${item.path}`;
      return [mountPath, content] as [string, string];
    })
  );

  const files: Record<string, string> = {};
  let skipped = 0;

  for (const result of entries) {
    if (result.status === "fulfilled") {
      const [path, content] = result.value;
      files[path] = content;
    } else {
      skipped++;
      console.warn("[github] Skipped file:", result.reason);
    }
  }

  if (skipped > 0) {
    console.warn(`[github] ${skipped} file(s) failed to fetch`);
  }

  console.log(
    `[github] Fetched ${Object.keys(files).length} files from ${owner}/${repo}@${ref}`
  );

  return files;
}

/**
 * Parse a GitHub URL into owner/repo/ref parts.
 *
 * Supports:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo/tree/branch-or-sha
 */
export function parseGithubUrl(url: string): {
  owner: string;
  repo: string;
  ref?: string;
} {
  const match = url.match(
    /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/tree\/([^/]+))?(?:\/|$)/
  );

  if (!match) {
    throw new Error(`Cannot parse GitHub URL: ${url}`);
  }

  return {
    owner: match[1],
    repo: match[2],
    ref: match[3],
  };
}
