# ROSENMOND — Unified System Spec v3
**Date:** 21 February 2026
**For:** Claude Code (Opus 4.6)
**Status:** Build-ready — do not deviate without Tuan approval

---

## The Objective

Five problems. One system to fix all of them.

1. **Work disappears** — Slack conversations, client requests, team mentions never become tasks
2. **Revenue leaks** — hourly work closes at zero hours, invoices go out wrong
3. **No full picture** — no live view of what's happening across all clients and team
4. **ClickUp is always wrong** — manual updates mean it can't be trusted
5. **Agency depends on people not systems** — Marija out = things stop

---

## What Gets Built

**ClickUp** is the source of truth. Every task lives here. The system writes to it. Nobody manually updates it.

**The AI PM** lives in Slack. It watches project channels, processes input from Tuan and the team, and writes to ClickUp automatically. It runs a morning check-in at 08:30, detects billing gaps, flags stalled work, coaches the team (with admin approval), and keeps ClickUp accurate without anyone touching it.

**The Warboard** is Tuan's command layer. A full-screen React app that reads live ClickUp data via a Firestore mirror. MAP view, BOARD view, SCAN intelligence, CMD voice input, activity LOG. Tuan can create and update tasks from here — it writes to ClickUp the same way the AI PM does.

**Firestore** is the AI PM's working memory and a read cache for the Warboard. It holds team profiles, channel mappings, scope data, coaching logs, processed messages, and a mirror of ClickUp tasks for fast reads.

---

## The One Funnel

One input pipeline. Multiple entry points. One destination: ClickUp.

```
Tuan — Slack DM         ──┐
Tuan — Warboard CMD     ──┤
Team — /task command    ──┼──→ AI Pipeline ──→ ClickUp (source of truth)
Team — #ai-ops drop     ──┤                         │
Slack project channels  ──┘                   ClickUp Webhook
(passive monitoring)                                 │
                                                     ▼
                                          Firestore Mirror
                                                     │
                                                     ▼
                                          Warboard reads live
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                           INPUTS                                 │
│  Tuan: Slack DM · Warboard CMD                                   │
│  Team: /task · #ai-ops drop · project channel messages           │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│              FIREBASE CLOUD FUNCTIONS (Node.js 20, TypeScript)   │
│                                                                  │
│  /warboard/cmd      /warboard/scan     /warboard/sync            │
│  /slack/events      /slack/commands    /slack/actions            │
│  /checkin/run       /clickup/webhook                             │
│                                                                  │
│                       Core Pipeline:                             │
│                       1. Receive input                           │
│                       2. Assemble context from Firestore         │
│                       3. Call Claude API                         │
│                       4. Parse structured decision               │
│                       5. Write to ClickUp                        │
│                       6. Post ClickUp comment (audit trail)      │
│                       7. Update Firestore mirror                 │
│                       8. Log to activity log                     │
└────────────────────────────┬─────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
        CLICKUP API                    FIRESTORE
        Source of truth                AI PM working memory
        All tasks live here            + Warboard read cache
        Webhooks out on every change   Team map, channel map
                                       Scope data, coaching log
                                       Mirror of ClickUp tasks
              │
              └──────────────────────────────────────────────┐
                                                              ▼
                                               WARBOARD FRONTEND
                                               React + Firebase Hosting
                                               Reads Firestore mirror
                                               Writes via Cloud Functions
                                               Tuan-only (Firebase Auth)
```

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite, Firebase Hosting |
| Backend | Firebase Cloud Functions, Node.js 20, TypeScript |
| Source of truth | ClickUp API v2 + Webhooks |
| Working memory + cache | Firestore |
| Auth | Firebase Auth — Google Sign-In, Tuan only |
| AI | Claude API `claude-sonnet-4-20250514`, 8096 max tokens |
| Slack | Events API + Slash Commands + Interactive Components |
| Voice | Google Cloud Speech-to-Text (Phase 3) |
| Scheduler | Firebase Cloud Scheduler |
| Cost | ~$20–50/month |

---

## Team

### Core Team (active in Slack + ClickUp)

| ID | Name | Role | Notes |
|---|---|---|---|
| `tuan` | Tuan | Founder / Commander | Strategy, dev/ops tasks |
| `kristina` | Kristina | PM / Creative Director | Projects + creative direction |
| `marija` | Marija | PM / Operations | Invoices, ops, boards — 116 tasks, overloaded |
| `bernardo` | Bernardo | Designer / Accounts | Design + client accounts |
| `belen` | Belén | Designer | |
| `karo` | Karo | Brand Designer | |
| `klaudia` | Klaudia | Designer | New or underutilized |
| `elizaveta` | Elizaveta | Art Director / Designer | |
| `bhavesh` | Bhavesh | Developer | 487 studio dev team |
| `diogo` | Diogo | 3D Motion Designer | |
| `dorottya` | Dorottya | PM | New Jan 2026, onboarding |
| `victoria` | Victoria | New | Role TBD |

### External Dev Partners (Slack only, not in ClickUp task counts)

| Name | Role | Partner |
|---|---|---|
| Pavlo | Dev Lead | hulo.dev |
| Serhii | Developer | hulo.dev — taking over Formetta dev |
| Anubhav | Dev Lead | 487 studio |
| Ohm | Developer | 487 studio |
| Chandra Kiran | Developer | 487 studio |
| Chirag | Developer | 487 studio — new Apr 2025 |

### ⚠ Requires Action Before Go-Live
- **Angelina Mironova** — gone, still assigned to 12 tasks → reassign
- **Natalia Bugaj (old)** — gone, still assigned to 3 tasks → reassign
- **Natalia Bugaj (new)** — joined Oct 2025, Junior Designer → confirm active status

### Other Slack Members (roles to confirm)
Gauthier (Sales / CRM), Bayu (Motion), Maja, Polina, Tosan, Mian Ahmad Raza, David, Valeria Shershen, Hassan, Umair

---

## Clients

Active clients in PROJECTS space:
Noouri · Iräye · Praxis Hwang · Formetta · HSG · Pure Clinic · Dr. Noel · Dr. Liv · BrowTechnologies · YUUTH · Seven Springs · TCMD+

---

## ClickUp Structure

⚠ **ClickUp Business plan API access must be confirmed before any code is written. Free plan has limited API — hard blocker.**

⚠ **Nothing is ever deleted from ClickUp. Archive or set to Done only.**

### 5 Spaces

```
📁 PROJECTS     → All client work (restructured)
📁 OPERATIONS   → Merge: Kingdom Command + KT + Team Space + ROSENMOND internal
📁 FINANCE      → Keep as-is. Do not touch. Do not read. Do not write.
📁 CRM          → Gauthier's sales pipeline. Keep separate. Read only. Never write.
📁 ARCHIVE      → Renamed from Past Projects
```

### Client Folder Structure (PROJECTS space)

Every client folder identical:
```
📁 [CLIENT NAME]
  📋 Backlog       → New requests land here (status: New Request)
  📋 Active Work   → Tasks being worked on
  📋 Client Board  → Client-facing mirror (auto-synced from Active Work)
```

**Backlog → Active Work transition:**
Task lands in Backlog as "New Request." When status moves to "Planning" (admin approves in #ai-ops or PM manually moves it), Firebase detects the ClickUp webhook, moves the task to Active Work via API.

### Universal Status Pipeline

```
New Request → Planning → In Progress → Internal Review → Sent to Client → Revision → Done
```

No numbered statuses. No [des] or [dev] prefixes. Use Discipline custom field to filter.

### Custom Fields (every project task)

| Field | Type | Values |
|---|---|---|
| Project | Dropdown (per client) | e.g. Quiz, Science Page, Brand Presentation |
| Discipline | Multi-select | Design / Development / Marketing / Ops / Content |
| Client Billing | Dropdown | Fixed / Hourly |
| Team Billing | Dropdown | Fixed / Hourly |
| Billable | Checkbox | Yes / No |

### Project Structure

Projects are custom field dropdowns — not separate lists. One client = one Active Work list, tasks filtered by Project field.

Milestones = parent tasks. Deliverables = subtasks.

```
📋 Active Work (Formetta)
  🔹 [Quiz] Design Phase          ← parent task (milestone)
     └─ Quiz UI components         ← subtask
     └─ Brand presentation mockup  ← subtask
     └─ Responsive variants        ← subtask
  🔹 [Quiz] Development Phase
     └─ Implement quiz logic
     └─ Shopify integration
```

### Client Board Auto-Sync

Full mirror of Active Work with simplified statuses. Client sees everything from task creation, not just when it's sent to them.

```
Active Work status      →   Client Board status
New Request             →   Received
Planning                →   In Progress
In Progress             →   In Progress
Internal Review         →   In Progress
Sent to Client          →   Awaiting Your Review
Revision                →   In Revision
Done                    →   Complete
```

Handled by Firebase via ClickUp webhooks — not ClickUp native automations.

### Warboard Status → ClickUp Mapping

The Warboard uses its own status vocabulary. Map to ClickUp on write.

```
Warboard → ClickUp Active Work
OPEN        → New Request
IN_PROGRESS → In Progress
WAITING     → Sent to Client
DELEGATED   → In Progress
DONE        → Done
PARKED      → Planning
BLOCKED     → In Progress
```

---

## Billing Model

Every task has two independent billing dimensions.

```
                    CLIENT BILLING
                Fixed           Hourly
           ┌──────────────┬──────────────┐
  Fixed    │ Fixed/Fixed  │ Hourly/Fixed │
TEAM       │ Time track   │ Time track   │
BILLING    │ encouraged   │ for client   │
           │ not required │ invoice REQD │
           ├──────────────┼──────────────┤
  Hourly   │ Fixed/Hourly │ Hourly/Hourly│
           │ Time track   │ Time track   │
           │ for team pay │ for BOTH     │
           │ REQUIRED     │ REQUIRED     │
           └──────────────┴──────────────┘
```

**AI billing rules:**
- Hourly task → Done with 0h logged → flag immediately → revenue leak
- Work happening in Slack on hourly task, no timer → flag
- Fixed client + hourly team → warn when hours approach budget
- Daily digest includes: all hourly tasks completed, hours logged, gaps

---

## Firestore Data Model

### `/tasksMirror/{taskId}`
Read cache of ClickUp tasks. Updated by webhooks.

```typescript
{
  clickupTaskId: string,
  projectId: string,            // maps to client/domain id
  task: string,
  assignee: string | null,      // team member id
  status: string,               // Warboard status vocabulary
  priority: string,
  disciplines: string[],
  notes: string,
  dueDate: string | null,
  hoursLogged: number,
  clientBilling: "fixed" | "hourly" | null,
  teamBilling: "fixed" | "hourly" | null,
  billable: boolean,
  project: string | null,       // project dropdown value
  parentTaskId: string | null,  // for subtasks
  lastSyncedAt: Timestamp
}
```

### `/clients/{clientId}`
Warboard-owned state. Threat level and map position don't exist in ClickUp.

```typescript
{
  id: string,                   // "noouri", "formetta", etc.
  label: string,
  threat: "CRITICAL" | "HIGH" | "NORMAL" | "IN_PROGRESS",
  disciplines: string[],
  lead: string | null,          // team member id
  lead2: string | null,
  x: number,                    // map position 0-100
  y: number,
  clickupFolderId: string | null,
  updatedAt: Timestamp
}
```

### `/team/{memberId}`
```typescript
{
  id: string,
  name: string,
  role: string,
  color: string,
  avatar: string,
  slackUserId: string | null,
  clickupUserId: string | null,
  disciplines: string[],
  defaultBilling: "fixed" | "hourly",
  rate: number | null,
  clients: {
    [clientId: string]: {
      billing: "fixed" | "hourly",
      projectFee?: number
    }
  },
  active: boolean
}
```

### `/domains/{domainId}`
```typescript
{
  id: string,                   // "operations", "sales", "strategy", "system", "hq"
  label: string,
  sub: string,
  color: string,
  x: number,
  y: number,
  clickupListId: string | null
}
```

### `/channelMap/{channelId}`
```typescript
{
  channelId: string,
  channelName: string,
  client: string,               // client id
  primaryDiscipline: string,
  project: string | null,       // project dropdown value, null = AI infers
  clickupFolderId: string,
  clickupListId: string,        // Active Work list
  monitored: boolean
}
```

### `/projects/{clientId}/{projectId}`
```typescript
{
  name: string,
  scopeSummary: string | null,
  scopeFileUrl: string | null,
  budgetType: "fixed" | "hourly",
  budgetAmount: number | null,
  estimatedHours: number | null,
  milestones: Array<{ name: string, status: string }>,
  deliverables: Array<{ name: string, taskId: string | null, status: string }>,
  clientBilling: "fixed" | "hourly",
  startDate: string | null,
  deadline: string | null
}
```

### `/activityLog/{entryId}`
```typescript
{
  ts: Timestamp,
  action: "CREATE" | "UPDATE" | "DELETE" | "CLIENT" | "CMD" | "SCAN" | "SLACK" | "CLICKUP",
  detail: string,
  projectId: string | null,
  taskId: string | null,
  source: "warboard" | "slack" | "clickup-webhook" | "scheduler"
}
```

### `/scans/{scanId}`
```typescript
{
  ts: Timestamp,
  result: {
    health: { score: number, grade: string, summary: string },
    now: Array<{ title: string, reason: string, projectId: string|null, taskId: string|null }>,
    flags: Array<{
      severity: "RED" | "AMBER" | "INFO",
      category: "OPS" | "PM" | "CLIENT" | "CAPACITY" | "RISK" | "BILLING",
      title: string,
      detail: string,
      action: string
    }>,
    message: string
  },
  thread: Array<{ role: "scan" | "user", text: string, ts: Timestamp }>
}
```

### `/checkins/{checkinId}`
```typescript
{
  date: string,
  status: "running" | "complete" | "skipped",
  transcript: Array<{ role: "ai" | "tuan", text: string, ts: Timestamp }>,
  changesApplied: number,
  startedAt: Timestamp,
  completedAt: Timestamp | null
}
```

### `/pendingSuggestions/{suggestionId}`
```typescript
{
  ts: Timestamp,
  source: "slack-channel" | "slack-dm" | "slash-command",
  channelId: string,
  rawText: string,
  classification: "NEW_TASK" | "STATUS_UPDATE" | "QUESTION" | "CHATTER",
  confidence: "HIGH" | "MEDIUM" | "LOW",
  suggestedAction: object,
  status: "pending" | "approved" | "rejected" | "auto-executed",
  slackMessageTs: string | null,
  resolvedBy: string | null,
  resolvedAt: Timestamp | null
}
```

### `/coachingLog/{userId}/{date}`
```typescript
{
  nudgesSent: number,
  nudgesAccepted: number,
  types: string[]
}
```

### `/clientBoardSync/{activeWorkTaskId}`
```typescript
{
  clientBoardTaskId: string,
  lastSyncedStatus: string
}
```

---

## Shared Constants

Define once in `shared/constants.ts`. Import everywhere — frontend and backend must be identical.

```typescript
export const DISCIPLINES = ["Design", "Development", "Marketing", "Ops", "Content"];

export const DISC_COLOR = {
  Design: "#f472b6", Development: "#34d399", Marketing: "#f97316",
  Ops: "#7B68EE", Content: "#a78bfa"
};

export const PRIORITIES = ["FOCUS", "CRITICAL", "HIGH", "NORMAL"];

export const PRI_COLOR = {
  FOCUS: "#a3e635", CRITICAL: "#ef4444", HIGH: "#f59e0b", NORMAL: "#60a5fa"
};

export const THREAT_LEVELS = ["CRITICAL", "HIGH", "NORMAL", "IN_PROGRESS"];

export const THREAT_COLOR = {
  CRITICAL: "#ef4444", HIGH: "#f59e0b", NORMAL: "#34d399", IN_PROGRESS: "#7B68EE"
};

export const WARBOARD_STATUSES = [
  "OPEN", "IN_PROGRESS", "DELEGATED", "WAITING", "DONE", "PARKED", "BLOCKED"
];

export const STATUS_CFG = {
  IN_PROGRESS: { label:"IN PROGRESS", color:"#fbbf24", bg:"rgba(251,191,36,0.10)",  border:"rgba(251,191,36,0.25)"  },
  DELEGATED:   { label:"DELEGATED",   color:"#22d3ee", bg:"rgba(34,211,238,0.10)",  border:"rgba(34,211,238,0.25)"  },
  OPEN:        { label:"OPEN",        color:"#60a5fa", bg:"rgba(96,165,250,0.10)",  border:"rgba(96,165,250,0.25)"  },
  WAITING:     { label:"WAITING",     color:"#f472b6", bg:"rgba(244,114,182,0.10)", border:"rgba(244,114,182,0.25)" },
  DONE:        { label:"DONE",        color:"#34d399", bg:"rgba(52,211,153,0.10)",  border:"rgba(52,211,153,0.25)"  },
  PARKED:      { label:"PARKED",      color:"#9ca3af", bg:"rgba(156,163,175,0.10)", border:"rgba(156,163,175,0.2)"  },
  BLOCKED:     { label:"BLOCKED",     color:"#f87171", bg:"rgba(248,113,113,0.10)", border:"rgba(248,113,113,0.25)" },
};

export const CLICKUP_TO_WARBOARD: Record<string, string> = {
  "new request":     "OPEN",
  "planning":        "OPEN",
  "in progress":     "IN_PROGRESS",
  "internal review": "IN_PROGRESS",
  "sent to client":  "WAITING",
  "revision":        "IN_PROGRESS",
  "done":            "DONE"
};

export const WARBOARD_TO_CLICKUP: Record<string, string> = {
  OPEN:        "New Request",
  IN_PROGRESS: "In Progress",
  WAITING:     "Sent to Client",
  DELEGATED:   "In Progress",
  DONE:        "Done",
  PARKED:      "Planning",
  BLOCKED:     "In Progress"
};

export const WARBOARD_TO_CLIENT_BOARD: Record<string, string> = {
  OPEN:        "Received",
  IN_PROGRESS: "In Progress",
  WAITING:     "Awaiting Your Review",
  DELEGATED:   "In Progress",
  DONE:        "Complete",
  PARKED:      "In Progress",
  BLOCKED:     "In Progress"
};

export const CLIENTS = [
  "noouri", "iraye", "praxis", "formetta", "hsg", "pureclinic",
  "drnoel", "drliv", "browtech", "yuuth", "sevensprings", "tcmd"
];
```

---

## Channel → ClickUp Mapping (seed into Firestore)

```
Channel                              → Client / Discipline / Project
─────────────────────────────────────────────────────────────────────
project-formetta-dev                 → Formetta / Development
project-formetta-webdesign           → Formetta / Design
project-formetta-science-page        → Formetta / Design+Dev / Science Page
project-formetta-brand-presentation  → Formetta / Design / Brand Presentation
project-formetta-design-retainer     → Formetta / Design / Design Retainer
project-formetta-design              → Formetta / Design
project-browtech-dev                 → BrowTechnologies / Development
project-browtechnologies-design      → BrowTechnologies / Design
project-browtechnologies-webdesign   → BrowTechnologies / Design
project-noouri-dev                   → Noouri / Development
project-tcmd-dev                     → TCMD+ / Development
project-tcmd-design                  → TCMD+ / Design
project-tcmd2                        → TCMD+ / Development (confirm purpose)
project-yuuth-development            → YUUTH / Development
project-seven-springs-dev            → Seven Springs / Development
project-pureclinic-dev               → Pure Clinic / Development
project-praxis-hwang-development     → Praxis Hwang / Development
project-praxis-hwang-design          → Praxis Hwang / Design
project-dr-noel-development          → DR. NOEL / Development
project-iraye-dev2                   → IRAYE / Development
mngmt-team-formetta                  → Formetta / Ops
```

**Not monitored:** general, mngmt-sales, mngmt-sales-team, partner-digiffic, 487, 1-sales-*, cf-*

---

## Cloud Functions

### `POST /warboard/cmd`
Natural language command from Warboard CMD tab.

**Request:** `{ "message": "mark HSG rapidmail as done, set pure clinic scope creep to focus" }`

**Behavior:**
1. Pull relevant tasks from ClickUp
2. Call Claude API with context + message
3. Parse structured response
4. Write to ClickUp
5. Post ClickUp comment on each changed task (audit trail)
6. ClickUp webhook updates Firestore mirror
7. Write to `/activityLog`

**Response:** `{ "message": "Done. 2 tasks updated.", "changes": { "taskUpdates": 2 } }`

---

### `POST /warboard/scan`
Full field scan against live ClickUp data.

**Behavior:**
1. Pull all tasks from ClickUp
2. Compute: overdue, unassigned, billing gaps, stalled, hourly with 0h
3. Pull client data from Firestore `/clients`
4. Call Claude API — COO / PM / AM mandate
5. Save to `/scans`
6. Write to `/activityLog`

---

### `POST /warboard/sync`
Force-sync ClickUp → Firestore mirror. Called on Warboard load.

---

### `POST /slack/events`
Slack Events API. Handles:
- `message.im` — DM to bot (Tuan's dumps and queries)
- `message.channels` — passive monitoring of mapped project channels
- `app_mention` — @ai-pm mentions

**Behavior:** Assemble context from Firestore → classify → if actionable post to #ai-ops → if chatter log silently.

---

### `POST /slack/commands`
`/task [description]` — works everywhere in Slack including DMs and private channels.

**Behavior:** Parse → extract task data → post to #ai-ops with approve/edit/reject buttons.

---

### `POST /slack/actions`
Button clicks from #ai-ops.

Actions: `approve_task` · `approve_status_update` · `reject_suggestion` · `edit_before_create` · `send_coaching_nudge` · `snooze_nudge`

On `approve_task`: create in ClickUp → post audit comment → log → confirm in #ai-ops.

---

### `POST /checkin/run`
Cloud Scheduler, 08:30 daily, Europe/Zurich.

**Behavior:**
1. Pull from ClickUp: overdue, stalled 5+ days, due this week, hourly with 0h, unassigned, Sent to Client with no update 3+ days
2. DM Tuan in Slack — client by client, skip clean ones with one-line summary
3. Tuan replies by voice or text
4. Apply updates to ClickUp in real time
5. Save transcript to `/checkins`

---

### `POST /clickup/webhook`
ClickUp webhook events.

- `taskStatusUpdated` → update `/tasksMirror` + trigger Client Board sync + trigger Backlog→Active Work move if status = Planning
- `taskCreated` → add to `/tasksMirror` + log
- `taskTimeTracked` → update hours + flag if hourly task
- `taskUpdated` → update `/tasksMirror`

---

## Task Audit Trail (ClickUp Comments)

Every AI action posts a comment on the affected ClickUp task. This creates a full, timestamped activity history visible to anyone inside ClickUp.

**Logged as comments:**
- Task created (source channel, message context, who approved)
- Status changes (trigger source, who approved)
- Billing flags (missing time, scope creep)
- Coaching nudges sent about this task
- Client Board sync events
- Follow-up nudges triggered and resolved

**Format:**
```
🤖 AI Activity Log

[Feb 12, 10:45] Task created from Slack
  Channel: #project-iraye-dev2
  Message: Bhavesh — "scammer fix is deployed"
  Approved by: Tuan

[Feb 12, 14:20] Status → In Progress
  Source: Slack — Bhavesh
  Approved by: Kristina

[Feb 14, 09:00] ⚠ Billing flag
  Hourly task, 0h logged after 2 days in progress

[Feb 15, 11:30] Status → Done
  Time logged: 4.5h
  Approved by: Marija

[Feb 15, 11:30] Client Board synced → Complete
```

---

## #ai-ops Channel

Private Slack channel: Tuan, Kristina, Marija, Dorottya.

Everything the AI wants to do flows here first. Only actionable items post — ~10-20 per day. QUESTION and CHATTER are logged silently to Firestore, viewable via `@ai-pm show log`.

### What posts to #ai-ops

```
[10:45] #project-iraye-dev2 — Bhavesh: "scammer fix is deployed"
  → STATUS_UPDATE (HIGH) — Move "Scammer Issue" → Done
  [✅ Update]  [❌ Skip]

[11:02] #project-browtech-dev — Tuan: "@Ohm please handle the SSL cert renewal"
  → NEW_TASK (HIGH) — "SSL cert renewal" | BrowTech | Dev | Ohm
  [✅ Create]  [✏️ Edit]  [❌ Ignore]

[14:20] COACHING — Bhavesh moved "Scammer Issue" to Done, 0h logged (hourly task)
  [✅ Send nudge]  [Already handled]  [Not billable]
```

### Approval Tiers

```
AUTO-EXECUTE (no approval):
- Logging and classifying messages
- Client Board sync on status change
- Backlog → Active Work move on Planning status
- Daily digest generation
- Check-in updates (approved real-time by Tuan)

#AI-OPS APPROVAL (button click):
- Creating new tasks from channel monitoring
- Updating task status from channel monitoring
- Sending coaching nudges to team members
- Flagging scope creep
- Suggesting task reassignment
- Posting digest to #mngmt-rosenmond

TUAN-ONLY (DM confirmation):
- Modifying billing rates
- Changing project budgets
- Overriding scope boundaries
```

### @ai-pm Commands

```
@ai-pm status [client]          → All active tasks for a client
@ai-pm who's overloaded         → Team capacity report
@ai-pm what's stuck             → Stalled tasks across all clients
@ai-pm billing report [client]  → Hours tracked vs budget, gaps flagged
@ai-pm create project [client]  → Start new project setup flow
@ai-pm upload scope             → Trigger scope ingestion
@ai-pm mute [type] [person]     → Stop a coaching nudge type
@ai-pm show log                 → Recent classified messages incl. QUESTION/CHATTER
@ai-pm checkin                  → Start morning check-in manually
```

---

## AI Classification — Claude System Prompt

```
You are an AI Project Manager for ROSENMOND, a creative agency run by Tuan in Zurich.

YOUR THREE MANDATES:
- COO: operational health, team capacity, blockers, contradictions
- PM: task hygiene, overdue, billing gaps, priority conflicts, stalled work
- Account Manager: client health, relationship risks, scope creep, follow-ups

TEAM: {team_context_from_firestore}
CLIENTS: {client_context_from_firestore}
CHANNEL CONTEXT: {channel_map_lookup}
RECENT CLICKUP TASKS: {relevant_tasks_from_clickup}
SCOPE DATA: {project_scope_if_available}

CLASSIFICATION RULES:
- "I'll do X", "can you handle X", "@person please X" → NEW_TASK
- "done", "shipped", "sent to client", "blocked by X" → STATUS_UPDATE
- Link shared with context about what needs to happen → NEW_TASK
- "should we...", "what do you think..." → QUESTION
- Casual conversation → CHATTER
- When unsure → QUESTION with confidence LOW
- NEVER create duplicate tasks — search existing tasks first
- Client channel messages from non-team members → almost always NEW_TASK

BILLING RULES:
- If either client billing OR team billing is Hourly → time tracking REQUIRED
- Hourly task moving to Done with 0h logged → flag as revenue leak
- Fixed client + hourly team approaching budget → flag margin risk

SCOPE RULES:
- Compare new work against known deliverables
- Work not matching any deliverable → flag as potential scope creep
- Fixed-fee project + new work → flag immediately

RESPOND IN JSON:
{
  "classification": "NEW_TASK | STATUS_UPDATE | QUESTION | CHATTER",
  "confidence": "HIGH | MEDIUM | LOW",
  "task_title": "string or null",
  "task_project": "string or null",
  "task_disciplines": ["Design"] or null,
  "task_assignee_slack_id": "string or null",
  "task_priority": "normal | high | urgent",
  "task_due_date": "ISO date or null",
  "existing_task_match": "clickup_task_id or null",
  "status_update_to": "new status or null",
  "client_billing": "fixed | hourly",
  "team_billing": "fixed | hourly",
  "time_tracking_required": true | false,
  "billing_flag": "string or null",
  "scope_flag": "string or null",
  "reasoning": "1 sentence"
}
```

---

## Proactive Intelligence

Runs daily via Cloud Scheduler. All findings post to #ai-ops for admin review.

### Billing Gap Detection (real-time via webhook)
Hourly task → Done with 0h → immediate flag to #ai-ops.

### Daily Risk Detection (08:00, before check-in)
```
📊 Risk Detection — Feb 12

OVERLOADED:
👤 Marija — 14 active tasks, 6 due this week
   Suggest: Reassign "Cookie app transfer" → Dorottya

STALLED:
🔴 "Formetta Science Page" — no update in 14 days

BILLING GAPS:
💰 "Google Business Profile" (IRAYE, hourly) — 0h logged, In Progress
💰 Bernardo: 6h on Pure Clinic (fixed client, hourly team) — check timesheet

UNASSIGNED:
⚠ 4 tasks in Backlog with no assignee (3 are client requests)
```

### Follow-up Nudges (triggered)
Task moves to "Sent to Client" → 3 business day timer → no response → flag to #ai-ops.

### Daily Digest (09:00 → #ai-ops first, admin approves → #mngmt-rosenmond)
Overdue, needs attention, due this week, billing summary, completed yesterday.

### Team Coaching (admin-approved, max 3 nudges/person/day)
Missing time entries, skipped workflow steps, stalled tasks, capacity imbalances.

---

## The Warboard Frontend

The Warboard v7 prototype (`rosenmond-warboard-v7.jsx`) is the complete visual and UX specification. **Rebuild pixel-for-pixel. Do not redesign anything.**

### What changes

| Prototype | Production |
|---|---|
| `window.storage` | Firestore real-time listeners |
| Inline Anthropic API calls | Cloud Function calls |
| Hardcoded seed data | Firestore + ClickUp mirror |
| Single JSX file | Component-based React app |
| No auth | Firebase Auth, Google Sign-In, Tuan only |

### What stays identical

Every color, layout, animation, interaction. Every component. The design is final.

### Real-time Listeners

```typescript
onSnapshot(collection(db, "tasksMirror"), updateTasks);
onSnapshot(collection(db, "clients"), updateClients);
onSnapshot(query(collection(db, "scans"), orderBy("ts","desc"), limit(20)), updateScans);
onSnapshot(query(collection(db, "activityLog"), orderBy("ts","desc"), limit(500)), updateLog);
```

### Component Map

| Prototype component | Production file |
|---|---|
| Main app state | `App.tsx` + hooks |
| MAP view | `MapView.tsx` |
| BOARD view | `BoardView.tsx` |
| Drawer modal | `NodeModal.tsx` |
| BoardTaskList | `BoardTaskList.tsx` |
| INTEL tab | `Sidebar/IntelTab.tsx` |
| SQUAD tab | `Sidebar/SquadTab.tsx` |
| LOG tab | `Sidebar/LogTab.tsx` |
| SCAN tab | `Sidebar/ScanTab.tsx` |
| CMD tab | `Sidebar/CmdTab.tsx` |
| Topbar | `Topbar.tsx` |

---

## Scope Ingestion (Phase 2+)

`@ai-pm upload scope` in #ai-ops → Claude parses PDF/doc → generates structured task breakdown with milestones and subtasks → posts to #ai-ops for approval → creates in ClickUp on confirm.

Also enables real-time scope creep detection: new work mentioned in project channels checked against loaded deliverables.

---

## Project File Structure

```
rosenmond/
├── shared/
│   └── constants.ts                  ← Single source for all constants
│
├── frontend/                         ← Warboard React app
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── firebase.ts
│   │   ├── components/
│   │   │   ├── Topbar.tsx
│   │   │   ├── MapView.tsx
│   │   │   ├── BoardView.tsx
│   │   │   ├── NodeModal.tsx
│   │   │   ├── BoardTaskList.tsx
│   │   │   └── Sidebar/
│   │   │       ├── IntelTab.tsx
│   │   │       ├── SquadTab.tsx
│   │   │       ├── LogTab.tsx
│   │   │       ├── ScanTab.tsx
│   │   │       └── CmdTab.tsx
│   │   └── hooks/
│   │       ├── useTasks.ts
│   │       ├── useClients.ts
│   │       ├── useScans.ts
│   │       └── useActivityLog.ts
│   ├── package.json
│   └── vite.config.ts
│
├── functions/                        ← Cloud Functions backend
│   ├── src/
│   │   ├── index.ts
│   │   ├── warboard/
│   │   │   ├── cmd.ts
│   │   │   ├── scan.ts
│   │   │   └── sync.ts
│   │   ├── slack/
│   │   │   ├── events.ts
│   │   │   ├── commands.ts
│   │   │   └── actions.ts
│   │   ├── pipeline/
│   │   │   ├── classify.ts
│   │   │   ├── context.ts            ← Assembles ClickUp + Firestore context
│   │   │   └── execute.ts            ← Writes decisions to ClickUp
│   │   ├── clickup/
│   │   │   ├── api.ts
│   │   │   ├── webhook.ts
│   │   │   └── clientboard.ts
│   │   ├── checkin/
│   │   │   ├── scheduler.ts
│   │   │   └── questions.ts
│   │   ├── intelligence/
│   │   │   ├── scan.ts
│   │   │   ├── billing.ts
│   │   │   ├── capacity.ts
│   │   │   ├── stalled.ts
│   │   │   └── digest.ts
│   │   ├── prompts/
│   │   │   └── system.ts
│   │   └── shared/
│   │       ├── constants.ts          ← Re-exports from /shared/constants.ts
│   │       ├── firestore.ts
│   │       └── logger.ts             ← Writes to /activityLog + ClickUp comments
│   ├── package.json
│   └── tsconfig.json
│
├── seed/
│   ├── clients.json                  ← Initial client data
│   ├── team.json                     ← Team profiles with billing rates
│   ├── domains.json                  ← Internal domain data
│   ├── channelMap.json               ← Full channel → ClickUp mapping
│   └── seed.ts                       ← Run once on first deploy
│
├── firestore.rules
├── firestore.indexes.json
├── firebase.json
└── .env.example
```

---

## Environment Variables

```bash
# Firebase
FIREBASE_PROJECT_ID=rosenmond-production

# Claude
CLAUDE_API_KEY=sk-ant-...

# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_AI_OPS_CHANNEL_ID=...
SLACK_MGMT_CHANNEL_ID=...
SLACK_TUAN_USER_ID=...

# ClickUp
CLICKUP_API_TOKEN=pk_...
CLICKUP_TEAM_ID=...
CLICKUP_PROJECTS_SPACE_ID=...
CLICKUP_OPERATIONS_SPACE_ID=...

# App
WARBOARD_ALLOWED_EMAIL=tuan@rosenmond.com
TIMEZONE=Europe/Zurich
CHECKIN_TIME=08:30

# Phase 3
GOOGLE_CLOUD_SPEECH_KEY=...

# Phase 4
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
```

---

## Build Order

### Step 0 — ClickUp cleanup (manual, before any code)

⚠ Confirm ClickUp Business plan API access first. Hard blocker.

1. Reassign Angelina's 12 tasks and old Natalia's 3 tasks
2. Create OPERATIONS space
3. Move Kingdom Command, KT, Team Space, ROSENMOND internal → OPERATIONS
4. Standardize all client folders: Backlog, Active Work, Client Board
5. Apply universal status pipeline across all lists
6. Add custom fields: Project, Discipline, Client Billing, Team Billing, Billable
7. Rename Account Management → Active Work per client folder
8. Move Rapport (39 tasks, KT inside Projects) → OPERATIONS
9. Archive old spaces after active tasks moved
10. Note all space/folder/list IDs → needed for env vars and channel map
11. Create #ai-ops private Slack channel (Tuan, Kristina, Marija, Dorottya)

### Step 1 — Backend foundation

- Firebase project init, Firestore + Cloud Functions enabled
- `/warboard/cmd` end-to-end: ClickUp read → Claude → ClickUp write → audit comment
- `/warboard/scan` end-to-end: ClickUp read → Claude → save to Firestore
- `/clickup/webhook` receiving and updating Firestore mirror
- Activity log writing on every action
- Seed script: populate all Firestore collections

### Step 2 — Warboard frontend

- React app on Firebase Hosting
- Firebase Auth gate (Google Sign-In, Tuan only)
- All Firestore real-time listeners
- CMD → `/warboard/cmd`
- SCAN → `/warboard/scan`
- Full visual rebuild from `rosenmond-warboard-v7.jsx` — pixel-for-pixel
- Deploy

**Milestone: Warboard works against real ClickUp data.**

### Step 3 — Slack pipeline

- Slack app with correct scopes
- `/slack/events`, `/slack/commands`, `/slack/actions`
- Classification pipeline
- #ai-ops approval messages with buttons
- `/task` slash command
- Passive channel monitoring for mapped channels

**Milestone: Work stops disappearing. Team input is captured.**

### Step 4 — Intelligence layer

- Cloud Scheduler → 08:30 check-in DM to Tuan
- Dynamic check-in (client by client, skip clean ones)
- Proactive detection: billing gaps, stalled, overloaded, unassigned
- Daily digest → #ai-ops → #mngmt-rosenmond
- Client Board auto-sync
- Follow-up nudges
- Team coaching (admin-approved)

**Milestone: Revenue stops leaking. Nothing is missed.**

### Step 5 — Voice (Phase 3)
Google Cloud Speech-to-Text. Voice in Slack DM → transcribe → same pipeline.

### Step 6 — Email (Phase 4)
Gmail API + Google Pub/Sub. Logic to be defined.

---

## Hard Rules

- FINANCE space — do not touch, do not read, do not write
- CRM space — read only if needed, never write
- Nothing deleted from ClickUp — archive or Done only
- Team never accesses the Warboard — Slack only
- Activity log permanent — no truncation
- ClickUp comments on every AI action — no exceptions
- Warboard design is final — rebuild exactly, no redesign
- All Claude calls: `claude-sonnet-4-20250514`, 8096 max tokens
- Everything writes to ClickUp first — Firestore is always downstream
- Nothing goes to any team member without #ai-ops approval first

---

## Reference Files

- `rosenmond-warboard-v7.jsx` — Warboard prototype, visual + UX spec for frontend rebuild
- `rosenmond-ai-pm-master-plan.md` — AI PM background and original decisions
- `rosenmond-system-analysis-v2.md` — Full team, ClickUp state, and business context
- `rosenmond-warboard-spec.md` — Warboard v7 feature spec
