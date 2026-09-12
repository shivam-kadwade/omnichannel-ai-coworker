import "@copilotkit/react-ui/styles.css";
import { CopilotKit, useCopilotReadable } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { FormEvent, useCallback, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AudioStream, type StreamStatus } from "./audio-stream";
import { getAccessToken } from "./auth";
import "./sidebar.css";
type PageContext = { url: string; title: string; text: string; capturedAt: string };
const localDemoMode = import.meta.env.VITE_LOCAL_DEMO_MODE === "true";

function LocalDemoChat() {
  const [message, setMessage] = useState(""); const [reply, setReply] = useState(""); const [sending, setSending] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!message.trim() || sending) return; setSending(true); setReply(""); try { const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/v1/agent/respond`, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer local-demo-token" }, body: JSON.stringify({ message }) }); const body = await response.json() as { message?: string; error?: string; hint?: string }; if (!response.ok) throw new Error(body.hint ?? body.error ?? "Agent request failed"); setReply(body.message ?? "No response received."); } catch (cause) { setReply(cause instanceof Error ? cause.message : "Agent request failed"); } finally { setSending(false); } };
  return <section className="local-chat"><p>Local demo chat</p>{reply && <article>{reply}</article>}<form onSubmit={submit}><textarea value={message} onChange={event => setMessage(event.target.value)} placeholder="Ask the coworker anything…" rows={4} /><button type="submit" disabled={sending}>{sending ? "Thinking…" : "Send"}</button></form></section>;
}
function CoworkerSidebar() {
  const [context, setContext] = useState<PageContext>(); const [audioStatus, setAudioStatus] = useState<StreamStatus>("idle"); const [error, setError] = useState<string>(); const audio = useRef(new AudioStream());
  useCopilotReadable({ description: "The active browser page the user is viewing", value: context ?? { status: "No page context captured yet" } });
  const refreshContext = useCallback(async () => { setError(undefined); const [tab] = await browser.tabs.query({ active: true, currentWindow: true }); if (!tab?.id) throw new Error("No active tab available"); try { setContext(await browser.tabs.sendMessage(tab.id, { type: "GET_PAGE_CONTEXT" }) as PageContext); } catch { setError("This page does not allow context capture."); } }, []);
  const toggleRecording = useCallback(async () => { if (audioStatus === "recording") { audio.current.stop(); setAudioStatus("idle"); return; } try { setAudioStatus("connecting"); await audio.current.start(import.meta.env.VITE_WS_URL, await getAccessToken()); setAudioStatus("recording"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Microphone could not start"); setAudioStatus("error"); } }, [audioStatus]);
  return <main className="coworker-sidebar"><header><div><strong>AI Coworker</strong><span>{context?.title ?? "No page context"}</span></div><button onClick={refreshContext}>Capture page</button></header>{error && <p className="error" role="alert">{error}</p>}{localDemoMode ? <LocalDemoChat /> : <CopilotChat labels={{ title: "Ask about this page", initial: "I can use the current page as context once you capture it." }} />}<footer><button className={audioStatus === "recording" ? "recording" : ""} onClick={toggleRecording} disabled={audioStatus === "connecting"}>{audioStatus === "recording" ? "Stop listening" : audioStatus === "connecting" ? "Connecting…" : "Talk"}</button></footer></main>;
}
createRoot(document.getElementById("root")!).render(<CopilotKit runtimeUrl={import.meta.env.VITE_COPILOT_RUNTIME_URL}><CoworkerSidebar /></CopilotKit>);
