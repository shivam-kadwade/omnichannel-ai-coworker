type PageContext = { url: string; title: string; text: string; capturedAt: string };
const extensionApi = ((globalThis as unknown as { browser?: typeof browser; chrome?: typeof browser }).browser
  ?? (globalThis as unknown as { chrome?: typeof browser }).chrome) as typeof browser;
export {};

function extractPageContext(): PageContext {
  const text = (document.body?.innerText ?? "").replace(/\s+/g, " ").trim().slice(0, 12_000);
  return { url: location.href, title: document.title, text, capturedAt: new Date().toISOString() };
}
extensionApi.runtime.onMessage.addListener((message: { type: string }) => {
  if (message.type !== "GET_PAGE_CONTEXT") return;
  const context = extractPageContext();
  extensionApi.runtime.sendMessage({ type: "PAGE_CONTEXT_UPDATED", context });
  return Promise.resolve(context);
});
