type PageContext = { url: string; title: string; text: string; capturedAt: string };
export {};

function extractPageContext(): PageContext {
  const text = (document.body?.innerText ?? "").replace(/\s+/g, " ").trim().slice(0, 12_000);
  return { url: location.href, title: document.title, text, capturedAt: new Date().toISOString() };
}
browser.runtime.onMessage.addListener((message: { type: string }) => {
  if (message.type !== "GET_PAGE_CONTEXT") return;
  const context = extractPageContext();
  browser.runtime.sendMessage({ type: "PAGE_CONTEXT_UPDATED", context });
  return Promise.resolve(context);
});
