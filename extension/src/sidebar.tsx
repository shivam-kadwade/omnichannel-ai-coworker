import "@copilotkit/react-ui/styles.css";
import { CopilotKit, useCopilotReadable } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { useCallback, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AudioStream, type StreamStatus } from "./audio-stream";
import { getAccessToken } from "./auth";
import "./sidebar.css";
type PageContext = { url: string; title: string; text: string; capturedAt: string };
function CoworkerSidebar() {
  const [context, setContext] = useState<PageContext>(); const [audioStatus, setAudioStatus] = useState<StreamStatus>("idle"); const [error, setError] = useState<string>(); const audio = useRef(new AudioStream());
  useCopilotReadable({ description: "The active browser page the user is viewing", value: context ?? { status: "No page context captured yet" } });
  const refreshContext = useCallback(async () => { setError(undefined); const [tab] = await browser.tabs.query({ active: true, currentWindow: true }); if (!tab?.id) throw new Error("No active tab available"); try { setContext(await browser.tabs.sendMessage(tab.id, { type: "GET_PAGE_CONTEXT" }) as PageContext); } catch { setError("This page does not allow context capture."); } }, []);
  const toggleRecording = useCallback(async () => { if (audioStatus === "recording") { audio.current.stop(); setAudioStatus("idle"); return; } try { setAudioStatus("connecting"); await audio.current.start(import.meta.env.VITE_WS_URL, await getAccessToken()); setAudioStatus("recording"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Microphone could not start"); setAudioStatus("error"); } }, [audioStatus]);
  return <main className="coworker-sidebar"><header><div><strong>AI Coworker</strong><span>{context?.title ?? "No page context"}</span></div><button onClick={refreshContext}>Capture page</button></header>{error && <p className="error" role="alert">{error}</p>}<CopilotChat labels={{ title: "Ask about this page", initial: "I can use the current page as context once you capture it." }} /><footer><button className={audioStatus === "recording" ? "recording" : ""} onClick={toggleRecording} disabled={audioStatus === "connecting"}>{audioStatus === "recording" ? "Stop listening" : audioStatus === "connecting" ? "Connecting…" : "Talk"}</button></footer></main>;
}
createRoot(document.getElementById("root")!).render(<CopilotKit runtimeUrl={import.meta.env.VITE_COPILOT_RUNTIME_URL}><CoworkerSidebar /></CopilotKit>);
