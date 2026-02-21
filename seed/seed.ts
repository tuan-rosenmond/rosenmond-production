import * as admin from "firebase-admin";
import * as path from "path";
import * as fs from "fs";

// Connects to emulator if FIRESTORE_EMULATOR_HOST is set, otherwise production
admin.initializeApp({ projectId: "rosenmond-production" });
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
