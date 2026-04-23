import { pod, runCommand } from "../../services/nodepod";

export async function createReactApp() {
  if (!pod) throw Error("Pod not initialized yet!");

  await runCommand("npx", ["create-vite@7", "/tmp", "--template", "react-ts"]);
  await runCommand("mv", ["/tmp/*", "/app"]);
  await runCommand("npm", ["install"]);
  await runCommand("npm", ["run", "dev"]);
}
