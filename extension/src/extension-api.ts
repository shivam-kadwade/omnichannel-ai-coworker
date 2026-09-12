type WebExtensionApi = typeof browser;

export const extensionApi = ((globalThis as unknown as { browser?: WebExtensionApi; chrome?: WebExtensionApi }).browser
  ?? (globalThis as unknown as { chrome?: WebExtensionApi }).chrome) as WebExtensionApi;
