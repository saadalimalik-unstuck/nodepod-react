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
    <>
      <h1>Hello Nodepod</h1>
      <p>Virtual Server Url: {serverUrl}</p>
      <iframe src={serverUrl}></iframe>
    </>
  );
}

export default App;
