import type { Response } from "express";
import { Exa } from "exa-js";
import OpenAI from "openai";
import { config } from "./config.js";
import { beginFollowUp, getFollowUp, markFollowUpSent } from "./ambiguous.js";
import { createDraft, sendEmail } from "./gmail.js";
import type { AuthenticatedRequest } from "./auth.js";

type ToolArgs = { query?: string; to?: string[]; subject?: string; body?: string; meetingEndsAt?: string };
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  { type: "function", function: { name: "search_web", description: "Search the live web for research.", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } },
  { type: "function", function: { name: "draft_email", description: "Create a Gmail draft for the user.", parameters: { type: "object", properties: { to: { type: "array", items: { type: "string" } }, subject: { type: "string" }, body: { type: "string" } }, required: ["to", "subject", "body"] } } },
  { type: "function", function: { name: "schedule_meeting_followup", description: "Create a durable post-meeting follow-up workflow. It never sends email until the user explicitly confirms sending.", parameters: { type: "object", properties: { to: { type: "array", items: { type: "string" } }, subject: { type: "string" }, body: { type: "string" }, meetingEndsAt: { type: "string", description: "ISO 8601 date-time" } }, required: ["to", "subject", "body", "meetingEndsAt"] } } }
];

async function executeTool(userId: string, name: string, args: ToolArgs) {
  if (name === "search_web") { if (!config.exaApiKey) throw new Error("EXA_API_KEY is not configured"); const result = await new Exa(config.exaApiKey).search(args.query!, { numResults: 5, contents: { highlights: true } }); return result.results.map(item => ({ title: item.title, url: item.url, highlights: item.highlights })); }
  if (name === "draft_email") return { draftId: await createDraft(userId, args.to!, args.subject!, args.body!) };
  if (name === "schedule_meeting_followup") { const flow = await beginFollowUp({ userId, to: args.to!, subject: args.subject!, body: args.body!, meetingEndsAt: args.meetingEndsAt! }); return { workflowId: flow.id, status: flow.status, taskId: flow.ambiguousTaskId, note: "Awaiting the user’s explicit send confirmation after the meeting." }; }
  throw new Error(`Unsupported tool: ${name}`);
}

export async function respondToAgent(req: AuthenticatedRequest, res: Response) {
  const userId = req.auth?.sub; const message = req.body?.message;
  if (!userId || typeof message !== "string") return res.status(400).json({ error: "message_required" });
  const apiKey = config.otariApiKey ?? config.openAiApiKey;
  if (!apiKey) return res.status(503).json({ error: "llm_not_configured", hint: "Set OTARI_API_KEY or OPENAI_API_KEY" });
  const client = new OpenAI({ apiKey, baseURL: config.otariBaseUrl });
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [{ role: "system", content: "You are an omnichannel coworker. Use tools for live research and Gmail drafts. Never claim an email was sent; sending requires a separate explicit confirmation endpoint." }, { role: "user", content: message }];
  try {
    for (let round = 0; round < 4; round++) {
      const model = config.otariBaseUrl ? config.otariModel : "gpt-4o-mini";
      const completion = await client.chat.completions.create({ model, messages, tools }); const choice = completion.choices[0]?.message;
      if (!choice) return res.status(502).json({ error: "empty_gateway_response" });
      if (!choice.tool_calls?.length) return res.json({ message: choice.content ?? "" });
      messages.push(choice);
      for (const call of choice.tool_calls) { const output = await executeTool(userId, call.function.name, JSON.parse(call.function.arguments) as ToolArgs); messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(output) }); }
    }
    return res.status(502).json({ error: "agent_tool_loop_limit" });
  } catch (cause) {
    console.error("Agent request failed", cause);
    return res.status(502).json({ error: "agent_request_failed", hint: "Verify OPENAI_API_KEY and network access, then retry." });
  }
}

export async function confirmFollowUpSend(req: AuthenticatedRequest, res: Response) {
  const userId = req.auth?.sub; const { workflowId } = req.body ?? {};
  if (!userId || typeof workflowId !== "string") return res.status(400).json({ error: "workflow_id_required" });
  const workflow = getFollowUp(workflowId, userId);
  if (!workflow) return res.status(404).json({ error: "workflow_not_found" });
  if (new Date(workflow.meetingEndsAt) > new Date()) return res.status(409).json({ error: "meeting_not_finished" });
  const messageId = await sendEmail(userId, workflow.to, workflow.subject, workflow.body);
  await markFollowUpSent(workflow);
  return res.status(201).json({ messageId, workflowId });
}
