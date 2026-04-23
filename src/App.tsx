import { useEffect, useState } from "react";
import "./App.css";
import { initNodepod, runCommand } from "./services/nodepod";
import { createReactApp } from "./utils/nodepod/create-react-app";

function App() {
  const [serverUrl, setServerUrl] = useState<string | null>(null);

  const setupNodepod = async () => {
    await initNodepod({
      onServerReady: setServerUrl,
    });
    await createReactApp();
  };

  useEffect(() => {
    setupNodepod();
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: "0",
      }}
    >
      <div>
        <h1>Hello Nodepod</h1>
        <p>Virtual Server Url: {serverUrl}</p>
      </div>

      <iframe
        src={serverUrl}
        style={{
          width: "100%",
          height: "100%",
        }}
      ></iframe>
    </div>
  );
}

export default App;
