import { onRequest } from "firebase-functions/v2/https";
import Anthropic from "@anthropic-ai/sdk";
import { buildCmdSystemPrompt } from "../prompts/system";
import { buildCommandContext } from "../pipeline/context";
import { executeCmdResponse, CmdResponse } from "../pipeline/execute";
import { logActivity } from "../shared/logger";
import { CLAUDE_MODEL, CLAUDE_MAX_TOKENS } from "../shared/constants";

const anthropic = new Anthropic();

export const warboardCmd = onRequest(
  { cors: true, region: "europe-west1", maxInstances: 5 },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const { message } = req.body as { message: string };
    if (!message) {
      res.status(400).json({ error: "Missing 'message' in request body" });
      return;
    }

    try {
      // 1. Log incoming command
      await logActivity({
        action: "CMD",
        detail: `Warboard CMD received: "${message.slice(0, 100)}"`,
        source: "warboard",
      });

      // 2. Build board context from Firestore + ClickUp
      const ctx = await buildCommandContext();

      // 3. Send to Claude
      const systemPrompt = buildCmdSystemPrompt(ctx);
      const claudeRes = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: CLAUDE_MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: "user", content: message }],
      });

      const raw = claudeRes.content[0].type === "text" ? claudeRes.content[0].text : "";

      // 4. Parse structured response
      let parsed: CmdResponse;
      try {
        parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      } catch {
        res.status(200).json({
          message: "Could not parse AI response. Try rephrasing.",
          changes: { taskUpdates: 0, newTasks: 0, clientUpdates: 0 },
        });
        return;
      }

      // 5. Execute actions (ClickUp writes + Firestore mirror + audit comments)
      const result = await executeCmdResponse(parsed);

      // 6. Log completion
      const summary = [
        result.taskUpdates && `${result.taskUpdates} task${result.taskUpdates > 1 ? "s" : ""} updated`,
        result.newTasks && `${result.newTasks} new task${result.newTasks > 1 ? "s" : ""} added`,
        result.clientUpdates && `${result.clientUpdates} client${result.clientUpdates > 1 ? "s" : ""} updated`,
      ].filter(Boolean).join(" · ");

      await logActivity({
        action: "CMD",
        detail: `CMD executed: ${summary || "no changes"} — "${message.slice(0, 60)}"`,
        source: "warboard",
      });

      res.status(200).json({
        message: parsed.message + (summary ? `\n\n${summary}` : ""),
        changes: result,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await logActivity({
        action: "CMD",
        detail: `CMD failed: ${errorMsg}`,
        source: "warboard",
      });
      res.status(500).json({ error: "Signal lost. Check connection." });
    }
  },
);
