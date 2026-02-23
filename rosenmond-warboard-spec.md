# ROSENMOND WARBOARD — Spec Document
**Version:** v7  
**Date:** 21 February 2026  
**Type:** Internal Operations Tool  
**Owner:** Tuan / ROSENMOND

---

## Overview

The ROSENMOND Warboard is a custom React-based tactical operations dashboard built to replace ClickUp. It gives Tuan and the ROSENMOND team a single interface to manage all client nodes, internal domains, tasks, team assignments, and field intelligence — with an embedded AI layer for voice-driven updates and autonomous field scans.

The board runs entirely in the browser as a single JSX artifact, persists all data via `window.storage`, and integrates directly with the Anthropic API for intelligence features.

---

## Architecture

- **Runtime:** React (JSX artifact, single file)
- **Storage:** `window.storage` key-value persistence — survives page reloads
- **AI:** Anthropic API (`claude-sonnet-4-20250514`) via direct fetch calls, 8096 max tokens
- **Styling:** Inline styles, system sans-serif font stack, JetBrains Mono for monospace elements
- **No external dependencies** beyond React and lucide-react

### Storage Keys

| Key | Contents |
|---|---|
| `rm-tasks` | All task data, keyed by project/client ID |
| `rm-clients` | Client node data including positions, threat, leads |
| `rm-team` | Team member roster |
| `rm-log` | Unlimited activity log entries |
| `rm-scans` | Full scan history (results + discussion threads) |

---

## Views

### MAP View
Spatial canvas showing all client nodes and ROSENMOND base domains plotted on a grid. Nodes are draggable — positions persist to storage via a dedicated debounce timer (separate from tasks to prevent race conditions).

**Three map modes:**
- **CLIENT** — nodes colored by threat level (CRITICAL red, HIGH amber, IN_PROGRESS purple, NORMAL green)
- **PRIORITY** — nodes grouped by priority distribution
- **DISCIPLINE** — nodes filtered by service discipline

**Base domains** are fixed to the bottom rail: Operations, Sales, Strategy, System, HQ.

Clicking any node opens the **Node Modal** (centered overlay, blurred backdrop, color-accented border).

### BOARD View
Flat task list with grouping, sorting, filtering, and inline editing.

**Group by:** Project · Priority · Status · Assignee · Discipline  
**Sort by:** Priority · Status · Task name · Assignee  
**Filter by:** Priority chips · Status chips · Assignee chips · Discipline chips · Text search  

**Grid columns:** `dot | CAT | PROJ | TASK | ASSIGNEE | STATUS | PRIORITY | DUE | ⊞`

All fields are inline-editable by clicking. The `⊞` button expands a detail panel with notes textarea and delete (with confirmation).

---

## Priority System

| Priority | Color | Meaning |
|---|---|---|
| FOCUS | `#a3e635` lime | Actively working on right now — pulsing dot indicator |
| CRITICAL | `#ef4444` red | Urgent, blocking |
| HIGH | `#f59e0b` amber | Important, near-term |
| NORMAL | `#60a5fa` blue | Standard work |

FOCUS tasks appear at the top of all sort orders and are counted separately in the topbar.

---

## Status System

OPEN · IN_PROGRESS · WAITING · DELEGATED · BLOCKED · PARKED · DONE

---

## Sidebar

Four tabs, always visible on the right.

### ◈ INTEL
Domain and client node list with task counts, threat indicators, critical task counts, lead/lead2 assignments, and discipline tags. Discipline filter. New client button.

### ◉ SQUAD
Team roster showing each member's task load, critical count, FOCUS count, color-coded load indicator (green/amber/red), and their lead/lead2 client assignments. Click to expand individual member view.

### ◷ LOG
Permanent, unlimited activity log. Every mutation auto-logs with:
- ISO timestamp
- Action type: `CREATE` · `UPDATE` · `DELETE` · `CLIENT` · `CMD`
- Project/client name
- Field changed with old → new values
- Short task ID (`#xxxxxx`)
- For CMD: original voice input + summary of changes

No clear button. Grows indefinitely, persisted in full.

### ⊕ SCAN
Field intelligence tab. See SCAN section below.

### ⌘ CMD
Voice/text protocol. Natural language input triggers an AI call that reads the full board state and applies structured changes: task updates, new tasks, client threat updates. Responds with a summary of what changed.

---

## SCAN — Field Intelligence

A full field scan sends the complete board snapshot to the AI with a three-role mandate.

### Mandate
- **COO** — operational health, team capacity, blockers, workflow contradictions
- **PM** — task hygiene, overdue items, undelegatable tasks, stale work, priority conflicts
- **Account Manager** — client health, threat level alignment, relationship risks, missing leads

### Trigger
`⊕ SCAN FIELD` button in the topbar. Auto-switches to the SCAN tab. Previous scan remains visible while the new one runs.

### Output Structure
- **Field Health** — letter grade (A–F), 0–100 score with visual bar, 1-2 sentence summary
- **▶ ACT NOW** — max 3 highest-leverage items for today, specific and ranked
- **Flags** — RED / AMBER / INFO cards with category (OPS / PM / CLIENT / CAPACITY / RISK), title, detail, and a concrete `→ action` line

### Scan History
All scans are saved with their full result and discussion thread. Timeline strip at the top of the SCAN tab shows past scans as grade+time buttons. Click any to view it. Each scan's follow-up conversation is scoped to that scan. Persisted to `rm-scans`.

### Follow-up Chat
After a scan, an input at the bottom lets Tuan respond to any flag, ask for drill-down, or instruct changes. Replies are contextual to the active scan's results.

---

## Node Modal (Client / Domain Detail)

Centered overlay modal triggered by clicking any map node or INTEL list item.

- Blurred backdrop, click outside to dismiss
- Color-accented top border matching node color
- Threat level selector (clients only)
- Lead / Lead 2 assignment
- Disciplines display
- Task list with inline editing, status/priority controls, notes, due dates
- Delete (with confirmation) inside detail panel only

---

## Topbar

Left: ROSENMOND wordmark + live stats (CRITICAL count, FOCUS count, OPEN count, DONE count)  
Right: Live clock (day + date + ticking time, updates every second) + MAP / BOARD toggle + `⊕ SCAN FIELD` button

---

## DUE Date Intelligence

Three visual states on the DUE column:

| State | Display | Color |
|---|---|---|
| Overdue (past due, not done) | `⚠ DD.MM` | Red `#f87171` |
| Due today | `● DD.MM` | Amber `#fbbf24` |
| Upcoming | `DD.MM` | Purple `#7B68EE` |
| No date | `—` | Dim |

---

## Team

Roles: Self (Tuan) · Kristina · Dorottya · Marija · (expandable via SQUAD tab)

---

## Client Nodes (Current)

Noouri · Iräye · Praxis Hwang · Formetta · HSG · Pure Clinic · Dr. Noel · Dr. Liv

---

## Internal Domains

Operations · Sales · Strategy · System · HQ

---

## Known Constraints

- Network disabled in artifact sandbox — AI calls require a live API key injected at runtime
- `window.storage` is session-scoped per artifact instance
- No multi-user sync — single-user tool
- Max 8096 tokens per AI call

---

## File

`rosenmond-warboard-v7.jsx` — single file, ~1700 lines
