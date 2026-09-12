type PageContext = { url: string; title: string; text: string; capturedAt: string };
export {};

browser.runtime.onInstalled.addListener(() => { browser.storage.local.set({ lastPageContext: null }); });
browser.runtime.onMessage.addListener((message: { type: string; context?: PageContext }) => {
  if (message.type === "PAGE_CONTEXT_UPDATED" && message.context) return browser.storage.local.set({ lastPageContext: message.context });
});
browser.tabs.onActivated.addListener(() => browser.storage.local.set({ lastPageContext: null }));
