import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { getUser, login } from "./auth";

function Popup() {
  const [email, setEmail] = useState<string>();
  const [error, setError] = useState<string>();
  useEffect(() => { getUser().then(user => setEmail(user?.email)); }, []);
  if (email) return <main><h1>AI Coworker</h1><p>Signed in as {email}</p></main>;
  return <main><h1>AI Coworker</h1><p>Connect your workspace to begin.</p><button onClick={() => login().then(() => getUser()).then(user => setEmail(user?.email)).catch(e => setError(e.message))}>Sign in</button>{error && <p role="alert">{error}</p>}</main>;
}

createRoot(document.getElementById("root")!).render(<Popup />);
