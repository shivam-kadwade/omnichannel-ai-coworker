type PageContext = { url: string; title: string; text: string; capturedAt: string };
const extensionApi = ((globalThis as unknown as { browser?: typeof browser; chrome?: typeof browser }).browser
  ?? (globalThis as unknown as { chrome?: typeof browser }).chrome) as typeof browser;
export {};

extensionApi.runtime.onInstalled.addListener(() => { extensionApi.storage.local.set({ lastPageContext: null }); });
extensionApi.runtime.onMessage.addListener((message: { type: string; context?: PageContext }) => {
  if (message.type === "PAGE_CONTEXT_UPDATED" && message.context) return extensionApi.storage.local.set({ lastPageContext: message.context });
});
extensionApi.tabs.onActivated.addListener(() => extensionApi.storage.local.set({ lastPageContext: null }));

const chromiumSidePanel = extensionApi as typeof extensionApi & { sidePanel?: { setPanelBehavior(options: { openPanelOnActionClick: boolean }): Promise<void> } };
chromiumSidePanel.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
