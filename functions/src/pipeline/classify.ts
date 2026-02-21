import Anthropic from "@anthropic-ai/sdk";
import { CLASSIFY_SYSTEM_PROMPT } from "../prompts/system";

const anthropic = new Anthropic();

export interface ClassificationResult {
  classification: "NEW_TASK" | "STATUS_UPDATE" | "QUESTION" | "CHATTER";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  task_title: string | null;
  task_project: string | null;
  task_disciplines: string[] | null;
  task_assignee_slack_id: string | null;
  task_priority: string;
  task_due_date: string | null;
  existing_task_match: string | null;
  status_update_to: string | null;
  reasoning: string;
}

export async function classifyMessage(
  message: string,
  channelContext?: { channelName: string; client: string | null; discipline: string | null },
  recentTasks?: Array<{ id: string; name: string; status: string }>,
): Promise<ClassificationResult> {
  const userContent = [
    channelContext ? `Channel: ${channelContext.channelName} (Client: ${channelContext.client || "none"}, Discipline: ${channelContext.discipline || "general"})` : "",
    recentTasks?.length ? `Recent tasks in this project:\n${recentTasks.map(t => `- [${t.id}] ${t.name} (${t.status})`).join("\n")}` : "",
    `\nMessage: ${message}`,
  ].filter(Boolean).join("\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    system: CLASSIFY_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(jsonStr) as ClassificationResult;
  } catch {
    return {
      classification: "CHATTER",
      confidence: "LOW",
      task_title: null,
      task_project: null,
      task_disciplines: null,
      task_assignee_slack_id: null,
      task_priority: "normal",
      task_due_date: null,
      existing_task_match: null,
      status_update_to: null,
      reasoning: `Failed to parse classification response`,
    };
  }
}
