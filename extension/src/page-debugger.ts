(() => {
  const source = "ai-coworker-debugger";
  const emit = (data: Record<string, unknown>) => window.postMessage({ source, ...data }, "*");
  const safe = (value: unknown) => String(value).replace(/(Bearer\s+)[\w.-]+/gi, "$1[redacted]").slice(0, 500);
  let enabled = false;
  window.addEventListener("message", event => { if (event.source === window && event.data?.source === source && event.data.type === "control") enabled = Boolean(event.data.enabled); });
  const originalFetch = window.fetch;
  window.fetch = async (...args) => { const started = performance.now(); const request = args[0]; const url = typeof request === "string" ? request : request instanceof Request ? request.url : String(request); try { const response = await originalFetch(...args); if (enabled) emit({ type: "network", method: args[1]?.method ?? (request instanceof Request ? request.method : "GET"), url, status: response.status, statusText: response.statusText, duration: Math.round(performance.now() - started) }); return response; } catch (error) { if (enabled) emit({ type: "network", method: "GET", url, status: 0, error: safe(error), duration: Math.round(performance.now() - started) }); throw error; } };
  window.addEventListener("error", event => enabled && emit({ type: "log", level: "error", message: event.message, sourceUrl: event.filename, line: event.lineno }));
  window.addEventListener("unhandledrejection", event => enabled && emit({ type: "log", level: "error", message: safe(event.reason) }));
  for (const level of ["warn", "error"] as const) { const original = console[level]; console[level] = (...args: unknown[]) => { if (enabled) emit({ type: "log", level, message: args.map(safe).join(" ") }); original.apply(console, args); }; }
})();
