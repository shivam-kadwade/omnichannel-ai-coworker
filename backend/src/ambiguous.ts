import { randomUUID } from "node:crypto";
import { config } from "./config.js";

export type FollowUp = { id: string; userId: string; meetingEndsAt: string; to: string[]; subject: string; body: string; ambiguousTaskId?: string; status: "waiting" | "ready" | "sent" };
const followUps = new Map<string, FollowUp>();

async function ambiguousRequest(path: string, method: string, body?: unknown) {
  if (!config.ambiguousApiKey) return undefined;
  const response = await fetch(`${config.ambiguousBaseUrl}${path}`, { method, headers: { authorization: `Bearer ${config.ambiguousApiKey}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  if (!response.ok) throw new Error(`Ambiguous request failed: ${response.status}`);
  return response.json() as Promise<Record<string, unknown>>;
}

export async function beginFollowUp(input: Omit<FollowUp, "id" | "status" | "ambiguousTaskId">) {
  const id = randomUUID();
  const task = await ambiguousRequest("/api/tasks", "POST", { title: `Follow up after meeting: ${input.subject}`, description: `Wait until ${input.meetingEndsAt}, then send the approved follow-up email.`, priority: "high" });
  const workflow: FollowUp = { ...input, id, status: "waiting", ambiguousTaskId: typeof task?.task === "object" && task.task ? (task.task as { id?: string }).id : undefined };
  followUps.set(id, workflow); return workflow;
}
export function dueFollowUps(userId: string, now = new Date()) { return [...followUps.values()].filter(item => item.userId === userId && item.status === "waiting" && new Date(item.meetingEndsAt) <= now); }
export function getFollowUp(id: string, userId: string) { const item = followUps.get(id); return item?.userId === userId ? item : undefined; }
export async function markFollowUpSent(item: FollowUp) { item.status = "sent"; if (item.ambiguousTaskId) await ambiguousRequest(`/api/tasks/${item.ambiguousTaskId}`, "PATCH", { status: "done" }); }
