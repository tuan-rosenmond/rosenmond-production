/**
 * Test script: reads all spaces, folders & lists from ClickUp via API.
 * Run: npx tsx scripts/test-clickup.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env manually
const envPath = resolve(__dirname, "../.env");
const envContent = readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
}

const TOKEN = env.CLICKUP_API_TOKEN;
const TEAM_ID = env.CLICKUP_TEAM_ID;

if (!TOKEN || !TEAM_ID) {
  console.error("Missing env vars. Need CLICKUP_API_TOKEN, CLICKUP_TEAM_ID in .env");
  process.exit(1);
}

const headers = { Authorization: TOKEN, "Content-Type": "application/json" };

async function api(path: string) {
  const url = `https://api.clickup.com/api/v2${path}`;
  console.log(`GET ${url}`);
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ClickUp API ${res.status}: ${body}`);
  }
  return res.json();
}

async function main() {
  console.log("=== ClickUp API Test ===");
  console.log(`Team ID: ${TEAM_ID}`);
  console.log();

  // 1. List all spaces in the team
  console.log("--- All Spaces ---");
  const spacesRes = await api(`/team/${TEAM_ID}/space`);
  const spaces = spacesRes.spaces || [];
  console.log(`Found ${spaces.length} spaces:\n`);

  for (const space of spaces) {
    console.log(`  SPACE: "${space.name}" (id: ${space.id})`);
    if (space.statuses?.length) {
      console.log(`    Statuses: ${space.statuses.map((s: { status: string }) => s.status).join(", ")}`);
    }
  }
  console.log();

  // 2. For each space, list folders and folderless lists
  for (const space of spaces) {
    console.log(`\n=== Space: "${space.name}" (${space.id}) ===`);

    // Folders
    const foldersRes = await api(`/space/${space.id}/folder`);
    const folders = foldersRes.folders || [];
    if (folders.length > 0) {
      console.log(`  Folders (${folders.length}):`);
      for (const folder of folders) {
        console.log(`    FOLDER: "${folder.name}" (id: ${folder.id})`);
        const lists = folder.lists || [];
        for (const list of lists) {
          console.log(`      LIST: "${list.name}" (id: ${list.id}) — ${list.task_count ?? "?"} tasks`);
        }
      }
    }

    // Folderless lists
    const listsRes = await api(`/space/${space.id}/list`);
    const folderlessLists = listsRes.lists || [];
    if (folderlessLists.length > 0) {
      console.log(`  Folderless Lists (${folderlessLists.length}):`);
      for (const list of folderlessLists) {
        console.log(`    LIST: "${list.name}" (id: ${list.id}) — ${list.task_count ?? "?"} tasks`);
      }
    }
  }

  // 3. Read tasks from PROJECTS-test space if found
  const testSpace = spaces.find((s: { name: string }) => s.name.toLowerCase().includes("projects"));
  if (testSpace) {
    console.log(`\n\n--- Reading tasks from "${testSpace.name}" ---`);
    const foldersRes = await api(`/space/${testSpace.id}/folder`);
    const folders = foldersRes.folders || [];
    const firstList = folders[0]?.lists?.[0];
    if (firstList) {
      console.log(`  Sampling from list: "${firstList.name}" (${firstList.id})`);
      const tasksRes = await api(`/list/${firstList.id}/task?include_closed=true`);
      const tasks = tasksRes.tasks || [];
      console.log(`  Found ${tasks.length} tasks:\n`);
      for (const t of tasks.slice(0, 10)) {
        console.log(`  [${t.id}] "${t.name}"`);
        console.log(`    status: ${t.status?.status} | priority: ${t.priority?.priority ?? "none"} | assignees: ${t.assignees?.map((a: { username: string }) => a.username).join(", ") || "none"}`);
      }
      if (tasks.length > 10) console.log(`  ... and ${tasks.length - 10} more`);
    } else {
      // Try folderless lists
      const listsRes = await api(`/space/${testSpace.id}/list`);
      const lists = listsRes.lists || [];
      if (lists[0]) {
        console.log(`  Sampling from folderless list: "${lists[0].name}" (${lists[0].id})`);
        const tasksRes = await api(`/list/${lists[0].id}/task?include_closed=true`);
        const tasks = tasksRes.tasks || [];
        console.log(`  Found ${tasks.length} tasks:\n`);
        for (const t of tasks.slice(0, 10)) {
          console.log(`  [${t.id}] "${t.name}"`);
          console.log(`    status: ${t.status?.status} | priority: ${t.priority?.priority ?? "none"} | assignees: ${t.assignees?.map((a: { username: string }) => a.username).join(", ") || "none"}`);
        }
      }
    }
  }

  console.log("\n=== Test Complete ===");
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
