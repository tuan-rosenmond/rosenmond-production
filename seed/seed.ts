import * as admin from "firebase-admin";
import * as path from "path";
import * as fs from "fs";

// Connects to emulator if FIRESTORE_EMULATOR_HOST is set, otherwise production
admin.initializeApp({ projectId: "rosenmond-produc" });
const db = admin.firestore();

interface Doc { id: string; [key: string]: unknown }

function loadJson<T>(filename: string): T {
  const filePath = path.join(__dirname, filename);
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

async function seedCollection(name: string, items: Doc[]): Promise<void> {
  const batch = db.batch();
  for (const item of items) {
    const { id, ...data } = item;
    batch.set(db.collection(name).doc(id), {
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  console.log(`  ✓ ${name}: ${items.length} docs`);
}

async function main(): Promise<void> {
  console.log("\nROSENMOND — Seed Script");
  console.log("========================\n");

  const clients    = loadJson<Doc[]>("clients.json");
  const team       = loadJson<Doc[]>("team.json");
  const domains    = loadJson<Doc[]>("domains.json");
  const channelMap = loadJson<Doc[]>("channelMap.json");

  // Use channelId as the doc ID for channelMap
  const channelMapWithIds = channelMap.map(c => ({
    ...c,
    id: (c as { channelId: string }).channelId,
  }));

  await seedCollection("clients", clients);
  await seedCollection("team", team);
  await seedCollection("domains", domains);
  await seedCollection("channelMap", channelMapWithIds);

  // Seed tasks into tasksMirror (prototype data until ClickUp is connected)
  const tasksByProject = loadJson<Record<string, Array<Doc & { task: string; assignee: string | null; status: string; priority: string; disciplines: string[]; notes: string; dueDate: string | null }>>>("tasks.json");
  let taskCount = 0;
  for (const [projectId, tasks] of Object.entries(tasksByProject)) {
    if (!tasks.length) continue;
    const batch = db.batch();
    for (const t of tasks) {
      const { id, ...data } = t;
      batch.set(db.collection("tasksMirror").doc(id), {
        ...data,
        projectId,
        clickupTaskId: null,
        hoursLogged: 0,
        clientBilling: null,
        teamBilling: null,
        billable: false,
        project: null,
        parentTaskId: null,
        lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      taskCount++;
    }
    await batch.commit();
  }
  console.log(`  ✓ tasksMirror: ${taskCount} tasks across ${Object.keys(tasksByProject).filter(k => (tasksByProject[k] as unknown[]).length > 0).length} projects`);

  // Initial activity log entry
  await db.collection("activityLog").add({
    ts: admin.firestore.FieldValue.serverTimestamp(),
    action: "SYSTEM",
    detail: "Seed data loaded",
    projectId: null,
    taskId: null,
    source: "system",
  });
  console.log("  ✓ activityLog: initial entry\n");

  console.log("Seed complete.\n");
  process.exit(0);
}

main().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
