/**
 * Test script: Exercises the real ClickUp API client (functions/src/clickup/api.ts)
 * Run: npx tsx scripts/test-clickup-api.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env manually into process.env
const envPath = resolve(__dirname, "../.env");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  process.env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
}

// Stub firebase-admin to avoid initialization errors
// (the api.ts imports logActivity which imports firestore which needs admin)
const mockAdmin = {
  apps: [{}],
  firestore: () => ({
    collection: () => ({
      add: async (data: unknown) => {
        console.log("[mock-firestore] logActivity:", JSON.stringify(data).slice(0, 120));
        return { id: "mock_log_id" };
      },
      doc: () => ({
        get: async () => ({ exists: false, data: () => null }),
      }),
    }),
  }),
};
(mockAdmin.firestore as unknown as Record<string, unknown>).FieldValue = { serverTimestamp: () => new Date() };
(mockAdmin.firestore as unknown as Record<string, unknown>).Timestamp = { now: () => new Date() };
require.extensions; // ensure module system is ready
const Module = require("module");
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request: string, ...args: unknown[]) {
  if (request === "firebase-admin") return request;
  return origResolve.call(this, request, ...args);
};
require.cache["firebase-admin"] = {
  id: "firebase-admin",
  filename: "firebase-admin",
  loaded: true,
  exports: mockAdmin,
} as unknown as NodeModule;

// Now import the real API
async function main() {
  const { getTask, getTasksFromList, getAllTasks } = await import("../functions/src/clickup/api");

  console.log("=== ClickUp API Integration Test ===\n");

  // Test 1: getAllTasks
  console.log("--- Test 1: getAllTasks() ---");
  const all = await getAllTasks();
  console.log(`  Total tasks fetched: ${all.length}`);
  for (const t of all.slice(0, 5)) {
    console.log(`  [${t.id}] "${t.name}" — ${t.status.status} | ${t.folder.name} | assignees: ${t.assignees.map(a => a.username).join(", ") || "none"}`);
  }
  if (all.length > 5) console.log(`  ... and ${all.length - 5} more\n`);

  // Test 2: getTask (using first task ID from above)
  if (all.length > 0) {
    const taskId = all[0].id;
    console.log(`--- Test 2: getTask("${taskId}") ---`);
    const task = await getTask(taskId);
    console.log(`  Name: "${task.name}"`);
    console.log(`  Status: ${task.status.status}`);
    console.log(`  Priority: ${task.priority?.priority ?? "none"}`);
    console.log(`  Folder: ${task.folder.name}`);
    console.log(`  List: ${task.list.name}`);
    console.log(`  URL: ${task.url}\n`);
  }

  // Test 3: getTasksFromList (using first task's list ID)
  if (all.length > 0) {
    const listId = all[0].list.id;
    console.log(`--- Test 3: getTasksFromList("${listId}") ---`);
    const listTasks = await getTasksFromList(listId);
    console.log(`  Tasks in list: ${listTasks.length}`);
    for (const t of listTasks) {
      console.log(`  [${t.id}] "${t.name}" — ${t.status.status}`);
    }
  }

  console.log("\n=== All Tests Passed ===");
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
