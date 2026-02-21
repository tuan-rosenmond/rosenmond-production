import { onRequest } from "firebase-functions/v2/https";
import Anthropic from "@anthropic-ai/sdk";
import { SCAN_SYSTEM_PROMPT } from "../prompts/system";
import { buildScanContext } from "../pipeline/context";
import { collections, serverTimestamp } from "../shared/firestore";
import { logActivity } from "../shared/logger";

const anthropic = new Anthropic();

interface ScanResult {
  health: { score: number; grade: string; summary: string };
  now: Array<{ title: string; reason: string; pid: string | null; tid: string | null }>;
  flags: Array<{
    severity: "RED" | "AMBER" | "INFO";
    category: "OPS" | "PM" | "CLIENT" | "CAPACITY" | "RISK" | "BILLING";
    title: string;
    detail: string;
    action: string;
    pid: string | null;
    tid: string | null;
  }>;
  message: string;
}

export const warboardScan = onRequest(
  { cors: true, region: "europe-west1", maxInstances: 3 },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      await logActivity({
        action: "SCAN",
        detail: "Field scan initiated from Warboard",
        source: "warboard",
      });

      // Build full board snapshot
      const ctx = await buildScanContext();

      // Build compact summary for Claude
      const boardSummary = ctx.allTasks.map(t =>
        `[${t.id}] "${t.name}" | ${t.status.status} | pri:${t.priority?.priority || "?"} | assignee:${t.assignees[0]?.username || "none"} | folder:${t.folder.name} | due:${t.due_date || "none"} | hours:${t.time_spent || 0}`
      ).join("\n");

      const teamSummary = ctx.team.map(m => {
        const tasks = ctx.allTasks.filter(t => t.assignees.some(a => a.username === m.id));
        const active = tasks.filter(t => t.status.status !== "done");
        const critical = active.filter(t => t.priority?.priority === "1");
        return `${m.name}: ${active.length} active, ${critical.length} critical`;
      }).join("\n");

      const clientSummary = ctx.clients.map(c => {
        const tasks = ctx.allTasks.filter(t => t.folder.name.toLowerCase().includes(c.id));
        return `${c.label} [${c.id}] | threat:${c.threat} | lead:${c.lead || "none"} | lead2:${c.lead2 || "none"} | tasks:${tasks.length}`;
      }).join("\n");

      const today = new Date().toISOString().slice(0, 10);
      const scanUserMsg = `Today: ${today}

BOARD SNAPSHOT:
${boardSummary}

TEAM LOAD:
${teamSummary}

CLIENTS:
${clientSummary}

STATS: total=${ctx.stats.total} | critical_open=${ctx.stats.criticalOpen} | unassigned=${ctx.stats.unassigned} | overdue=${ctx.stats.overdue} | done=${ctx.stats.done}`;

      // Claude call — prefill with { to enforce JSON
      const claudeRes = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8096,
        system: SCAN_SYSTEM_PROMPT,
        messages: [
          { role: "user", content: scanUserMsg },
          { role: "assistant", content: "{" },
        ],
      });

      const raw = "{" + (claudeRes.content[0].type === "text" ? claudeRes.content[0].text : "");

      let scanResult: ScanResult;
      try {
        const jsonEnd = raw.lastIndexOf("}") + 1;
        scanResult = JSON.parse(raw.slice(0, jsonEnd));
      } catch {
        scanResult = {
          health: { score: 0, grade: "?", summary: "Scan returned malformed JSON" },
          now: [],
          flags: [],
          message: "Scan parsing failed. Raw preview: " + raw.slice(0, 120),
        };
      }

      // Save to Firestore
      const scanDoc = await collections.scans().add({
        ts: serverTimestamp(),
        result: scanResult,
        thread: [{ role: "scan", text: scanResult.message, ts: serverTimestamp() }],
      });

      await logActivity({
        action: "SCAN",
        detail: `Field scan complete — Health: ${scanResult.health.grade} (${scanResult.health.score}%) · ${scanResult.flags.length} flags`,
        source: "warboard",
      });

      res.status(200).json({
        scanId: scanDoc.id,
        result: scanResult,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await logActivity({
        action: "SCAN",
        detail: `Scan failed: ${errorMsg}`,
        source: "warboard",
      });
      res.status(500).json({ error: "Scan failed. Check connection." });
    }
  },
);
