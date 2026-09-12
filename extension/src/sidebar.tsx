import "@copilotkit/react-ui/styles.css";
import { CopilotKit, useCopilotReadable } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AudioStream, type StreamStatus } from "./audio-stream";
import { getAccessToken } from "./auth";
import { extensionApi } from "./extension-api";
import "./sidebar.css";

type PageContext = { url: string; title: string; text: string; capturedAt: string };
type IconName = "capture" | "send" | "mic" | "sun" | "moon" | "sparkle";
const localDemoMode = import.meta.env.VITE_LOCAL_DEMO_MODE === "true";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    capture: <><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M8 12h8M12 8v8" /></>,
    send: <path d="m21 3-7.4 18-3.7-7.6L3 9.7 21 3Zm-11 10.4L21 3" />,
    mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></>,
    moon: <path d="M20.7 15.3A8.5 8.5 0 0 1 8.7 3.3 8.5 8.5 0 1 0 20.7 15.3Z" />,
    sparkle: <path d="m12 2 1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2Zm7 12 .7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14Z" />
  };
  return <svg aria-hidden="true" className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function LocalDemoChat() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true); setReply("");
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/v1/agent/respond`, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer local-demo-token" }, body: JSON.stringify({ message }) });
      const body = await response.json() as { message?: string; error?: string; hint?: string };
      if (!response.ok) throw new Error(body.hint ?? body.error ?? "Agent request failed");
      setReply(body.message ?? "No response received.");
      setMessage("");
    } catch (cause) { setReply(cause instanceof Error ? cause.message : "Agent request failed"); } finally { setSending(false); }
  };
  return <section className="local-chat" aria-label="Coworker conversation"><div className="chat-intro"><span className="intro-icon"><Icon name="sparkle" size={16} /></span><div><h2>Your workspace copilot</h2><p>Ask, draft, or research while staying in flow.</p></div></div>{reply && <article className="assistant-message"><span className="assistant-avatar"><Icon name="sparkle" size={15} /></span><p>{reply}</p></article>}<form className="composer" onSubmit={submit}><textarea value={message} onChange={event => setMessage(event.target.value)} placeholder="Message your coworker…" rows={3} aria-label="Message your coworker" /><div className="composer-actions"><span>Enter to send</span><button className="icon-button primary" type="submit" disabled={sending || !message.trim()} aria-label={sending ? "Sending message" : "Send message"}><Icon name="send" size={17} /></button></div></form></section>;
}

function CoworkerSidebar() {
  const [context, setContext] = useState<PageContext>(); const [audioStatus, setAudioStatus] = useState<StreamStatus>("idle"); const [error, setError] = useState<string>(); const [theme, setTheme] = useState<"light" | "dark">("light"); const audio = useRef(new AudioStream());
  useEffect(() => { extensionApi.storage.local.get("sidebarTheme").then(({ sidebarTheme }) => { if (sidebarTheme === "light" || sidebarTheme === "dark") setTheme(sidebarTheme); }); }, []);
  const toggleTheme = () => setTheme(current => { const next = current === "light" ? "dark" : "light"; extensionApi.storage.local.set({ sidebarTheme: next }); return next; });
  useCopilotReadable({ description: "The active browser page the user is viewing", value: context ?? { status: "No page context captured yet" } });
  const refreshContext = useCallback(async () => { setError(undefined); const [tab] = await extensionApi.tabs.query({ active: true, currentWindow: true }); if (!tab?.id) throw new Error("No active tab available"); try { setContext(await extensionApi.tabs.sendMessage(tab.id, { type: "GET_PAGE_CONTEXT" }) as PageContext); } catch { setError("This page does not allow context capture."); } }, []);
  const toggleRecording = useCallback(async () => { if (audioStatus === "recording") { audio.current.stop(); setAudioStatus("idle"); return; } try { setAudioStatus("connecting"); await audio.current.start(import.meta.env.VITE_WS_URL, await getAccessToken()); setAudioStatus("recording"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Microphone could not start"); setAudioStatus("error"); } }, [audioStatus]);
  const isRecording = audioStatus === "recording";
  return <main className={`coworker-sidebar theme-${theme}`}><header className="app-header"><div className="brand"><span className="brand-mark"><Icon name="sparkle" size={17} /></span><div><strong>AI Coworker</strong><span className="status"><i />Ready to help</span></div></div><div className="header-actions"><button className="icon-button" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`} title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}><Icon name={theme === "light" ? "moon" : "sun"} /></button><button className="capture-button" onClick={refreshContext}><Icon name="capture" size={16} /><span>Capture</span></button></div></header><section className="context-card"><div className="context-copy"><span>Active context</span><strong title={context?.title}>{context?.title ?? "No page captured"}</strong></div><button className="text-button" onClick={refreshContext}>Refresh</button></section>{error && <p className="error" role="alert">{error}</p>}<div className="conversation">{localDemoMode ? <LocalDemoChat /> : <CopilotChat labels={{ title: "Ask about this page", initial: "I can use the current page as context once you capture it." }} />}</div><footer className="voice-bar"><button className={`voice-button ${isRecording ? "recording" : ""}`} onClick={toggleRecording} disabled={audioStatus === "connecting"}><span className="voice-icon"><Icon name="mic" size={19} /></span><span>{isRecording ? "Stop listening" : audioStatus === "connecting" ? "Connecting…" : "Talk to coworker"}</span>{isRecording && <i className="recording-dot" />}</button></footer></main>;
}

createRoot(document.getElementById("root")!).render(<CopilotKit runtimeUrl={import.meta.env.VITE_COPILOT_RUNTIME_URL}><CoworkerSidebar /></CopilotKit>);
