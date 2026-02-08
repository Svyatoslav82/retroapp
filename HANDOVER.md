# Sprint Retrospective App — Handover Document

## What Was Built

A real-time Sprint Retrospective web application for internal bank use (intranet). No database — all data is stored in JSON/CSV files.

### Tech Stack
- **Backend:** Node.js + Express + Socket.io + TypeScript
- **Frontend:** Aurelia 2 (beta.21) + TypeScript 5.4 + Webpack 5
- **Storage:** JSON files for state, CSV for export
- **Real-time:** Socket.io (WebSockets with polling fallback)

### Application Flow
1. **Scrum Master (SM)** opens the app and creates a new retro (enters sprint name + timer duration)
2. SM gets an admin token (stored in sessionStorage) and a shareable join link
3. **Team members** follow the link (use a different browser or incognito to avoid getting SM's admin token), enter their name, and join the virtual room
4. SM controls phase transitions. The phases in order:

| # | Phase | What Happens |
|---|-------|-------------|
| 1 | **Lobby** | Waiting room. SM shares the join link. |
| 2 | **What Went Well** | Everyone adds ideas via a dialog. Timer available (visual only). |
| 3 | **Vote: What Went Well** | One vote per person per item. Votes are visible (not anonymous). |
| 4 | **What Could Be Better** | Same as phase 2 — plain idea cards, no vote UI. |
| 5 | **Vote: What Could Be Better** | Same as phase 3. |
| 6 | **Brainstorming** | SM selects top-voted improvement items. After confirmation, selected items are shown as a read-only list. SM then advances to action points. |
| 7 | **Action Points** | Action points are grouped by brainstorm item. Participants select which item an action point relates to, enter the action text, then assign owners via dropdown. |
| 8 | **Closed** | Summary view (grouped by brainstorm items) + CSV export. |

---

## How to Run

### Development (two terminals)

```bash
# Terminal 1 — Server (port 3000)
cd C:\Programming\retroapp\server
npx ts-node src/index.ts

# Terminal 2 — Client dev server (port 9000, proxies API to 3000)
cd C:\Programming\retroapp\client
npx webpack serve --mode development
```

Open browser at: `http://localhost:9000`

### Production (single server)

```bash
# Build the client
cd C:\Programming\retroapp\client
npx webpack --mode production

# Start the server (serves static client files from client/dist)
cd C:\Programming\retroapp\server
npx tsc
node dist/index.js
```

Open browser at: `http://localhost:3000`

### Using the root convenience script

```bash
cd C:\Programming\retroapp
npm run dev          # runs both server and client concurrently
npm run client:build # production build of client
npm run server:build # compile server TypeScript
```

### Resetting / cleaning up a stuck retro

Delete the active retro file and restart the server:
```bash
del C:\Programming\retroapp\server\data\active-retro.json
```

---

## Project Structure

```
retroapp/
├── server/
│   ├── src/
│   │   ├── index.ts              # Express + Socket.io bootstrap
│   │   ├── routes.ts             # REST API: POST /api/retro, GET /api/retro/:id, GET /api/retro/:id/export, GET /api/retros
│   │   ├── socket-handlers.ts    # All WebSocket event handlers
│   │   ├── retro-manager.ts      # Business logic + phase state machine
│   │   ├── file-storage.ts       # JSON read/write + CSV generation
│   │   └── types.ts              # All TypeScript interfaces/enums
│   ├── config/
│   │   └── default.json          # port, defaultTimerDuration, dataDir, corsOrigin
│   ├── data/                     # Runtime data (created automatically)
│   │   ├── active-retro.json     # Current retro state (auto-saved on every change)
│   │   └── retros/               # Archived retros (JSON + CSV per retro)
│   ├── package.json
│   └── tsconfig.json
├── client/
│   ├── src/
│   │   ├── main.ts               # Aurelia bootstrap + DI registration (singletons)
│   │   ├── my-app.ts / .html     # Root component + route definitions
│   │   ├── global.d.ts           # HTML module declarations for *.html imports
│   │   ├── styles.css            # All application styles
│   │   ├── index.ejs             # HTML template
│   │   ├── services/
│   │   │   ├── socket-service.ts # Socket.io client wrapper
│   │   │   └── retro-service.ts  # Retro state + API calls + socket event listeners
│   │   ├── pages/
│   │   │   ├── home/             # Create retro / join active / view past retros
│   │   │   ├── join/             # Enter name to join
│   │   │   └── retro-room/       # Main retro workspace (all 8 phases)
│   │   └── models/
│   │       └── interfaces.ts     # Client-side type definitions (mirrors server types.ts)
│   ├── package.json
│   ├── tsconfig.json             # Targets ES2022, NO experimentalDecorators (uses TC39 standard)
│   └── webpack.config.js
└── package.json                  # Root scripts (concurrently)
```

---

## Key Architecture Decisions

1. **No database.** Active retro state is persisted to `server/data/active-retro.json` on every mutation. Completed retros are archived as both JSON and CSV in `server/data/retros/`.

2. **Admin auth is a simple token.** When SM creates a retro, the server returns an `adminToken` (UUID). The SM stores it in `sessionStorage`. SM-only socket events (change phase, start timer, select brainstorm items) check this token server-side.

3. **One retro at a time.** The `RetroManager` holds a single active session. Creating a new retro while one is in progress will fail.

4. **Aurelia 2 uses TC39 standard decorators** (not `experimentalDecorators`). The tsconfig targets ES2022 with TypeScript 5.4. DI is done via `resolve()` in field initializers. Services are registered as singletons in `main.ts`.

5. **Webpack dev server proxies** `/api` and `/socket.io` to the Express server (port 3000). In production, Express serves the built client files directly.

6. **Voting:** One vote per person per item, unlimited total votes. Votes are visible (shows who voted). Click to toggle vote/unvote.

7. **Action points are linked to brainstorm items.** Each action point has an `itemId` referencing the improvement item it addresses. The UI groups action points under their parent brainstorm item. Participants select which brainstorm item an action point relates to before adding it, then assign owners via a dropdown of participants.

8. **Brainstorming is selection-only.** SM selects which improvement items to carry forward. After confirmation, all participants see a read-only list of selected items. There is no discussion/comment sub-phase — the team proceeds directly to action points.

---

## Configuration

Edit `server/config/default.json`:

```json
{
  "port": 3000,                  // Server port
  "defaultTimerDuration": 300,   // Default timer in seconds (5 min)
  "dataDir": "./data",           // Where JSON/CSV files are stored
  "corsOrigin": "http://localhost:9000"  // Client origin for CORS (dev only)
}
```

For production on intranet, change `corsOrigin` to match your server's hostname, or remove CORS entirely since the server serves the client.

---

## Socket.io Events Reference

### Client → Server
| Event | Payload | Auth |
|-------|---------|------|
| `retro:join` | `{ retroId, participantName, adminToken? }` | Anyone |
| `retro:add-item` | `{ text, category }` | Anyone (correct phase) |
| `retro:vote` | `{ itemId }` | Anyone (voting phase) |
| `retro:unvote` | `{ itemId }` | Anyone (voting phase) |
| `retro:change-phase` | `{}` | SM only |
| `retro:start-timer` | `{ duration }` | SM only |
| `retro:select-brainstorm-items` | `{ itemIds[] }` | SM only |
| `retro:add-action-point` | `{ text, assignee, itemId }` | Anyone |
| `retro:assign-action-point` | `{ actionPointId, assignee }` | Anyone |

### Server → Client
| Event | Payload |
|-------|---------|
| `retro:state` | Full session (on join) |
| `retro:participant-joined` | Participant object |
| `retro:participant-left` | `{ name }` |
| `retro:item-added` | RetroItem object |
| `retro:vote-updated` | `{ itemId, votes[] }` |
| `retro:phase-changed` | `{ phase }` |
| `retro:timer-started` | `{ endsAt }` |
| `retro:brainstorm-items-selected` | `{ itemIds[] }` |
| `retro:action-point-added` | ActionPoint object |
| `retro:action-point-updated` | ActionPoint object (after assign/reassign) |
| `retro:closed` | `{ closedAt }` |
| `retro:error` | `{ message }` |

---

## REST API Reference

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/retro` | Create retro. Body: `{ sprintName, timerDuration }`. Returns `{ retroId, adminToken }` |
| `GET` | `/api/retro/:id` | Get retro state (without adminToken) |
| `GET` | `/api/retro/:id/export` | Download CSV file |
| `GET` | `/api/retros` | List active + past retros |

---

## Bugs Fixed During Development

1. **`loading` property name conflict** — Aurelia router-lite reserves `loading` as a lifecycle hook. Using `loading: boolean` on a routed component breaks routing. Renamed to `isLoading` on all pages.

2. **Browser globals in templates** — `navigator.clipboard.writeText()` and `window.location.origin` cannot be called directly in Aurelia template expressions. Moved to component methods (`copyJoinLink()`, `joinLink` getter).

3. **Reactivity on phase changes** — Aurelia couldn't detect changes to `retroService.session.phase` (nested property on a non-Aurelia service). Fixed by copying all session state into local `@observable` properties on the retro-room component via a `syncState()` method called on every socket event.

4. **Decorator format** — Aurelia 2 beta.21 uses TC39 standard decorators, not experimental. Removed `experimentalDecorators` from tsconfig, set target to ES2022.

5. **Getter-based `if.bind` not re-evaluating** — Using computed getters like `isItemPhase` / `isVotingPhase` in `if.bind` caused stale rendering (e.g. "What Could Be Better" phase showed both the items section and the voting section simultaneously). Fixed by replacing getter references with inline phase string comparisons directly in the template (e.g. `if.bind="phase === 'good_items' || phase === 'improve_items'"`).

6. **Method calls in template bindings not reactive** — Aurelia 2 beta.21 does not re-evaluate method calls like `isBrainstormSelected(item.id)` or `isEditingAssignee(ap.id)` in `if.bind` or class interpolations when the underlying state changes. Fixed by replacing method calls with direct property comparisons (e.g. `editingAssigneeId === ap.id`) and switching from `Set<string>` to `string[]` for brainstorm selection (arrays are observable, Sets are not).

7. **Assign button on action points not working** — Clicking "Assign" did nothing because `isEditingAssignee(ap.id)` method call in `if.bind` was not reactive. Fixed as part of bug #6 above.

8. **Brainstorm comments not appearing** — The brainstorming discussion sub-phase (add suggestions per item) was broken. Removed this sub-phase entirely as it was unnecessary — brainstorming now only serves as the SM's item selection step, then the team proceeds directly to action points.

---

## Known Limitations / Future Improvements

1. **No reconnection handling.** If a participant's browser refreshes, they need to re-enter their name on the join page. The session data (name) is in `sessionStorage` so it survives within the same tab but the socket reconnects fresh.

2. **SM token is per-tab.** If SM opens the join link in the same browser tab, they keep their admin token. Team members should use a **different browser or incognito window** to avoid inheriting SM privileges.

3. **No participant removal by SM.** SM cannot kick participants.

4. **Timer is visual only** — does not lock input when expired (by design).

5. **No HTTPS.** For intranet use this is fine. If needed, put behind a reverse proxy (nginx/IIS) with TLS.

6. **Single-server only.** No clustering/load balancing. Socket.io state is in-memory. Fine for a single team's retro.

7. **CSV export** is available from both the closed retro summary and the home page (past retros list). Action points in CSV now include a `RelatedItem` column showing which brainstorm item they belong to.

8. **No tests yet.** Could add unit tests for `RetroManager` and integration tests for socket handlers.

9. **No global installs required.** Everything runs via `npx` and local `node_modules`.

---

## Data Model Reference

### ActionPoint
```typescript
{
  id: string;
  text: string;
  assignee: string;    // participant name, or '' if unassigned
  createdBy: string;   // who added it
  itemId: string;      // links to the brainstorm RetroItem this action addresses
}
```

### RetroItem
```typescript
{
  id: string;
  text: string;
  author: string;
  votes: string[];           // array of voter names
  category: 'good' | 'improve';
  createdAt: string;
}
```

### BrainstormComment (legacy, no longer used in UI)
```typescript
{
  id: string;
  itemId: string;
  text: string;
  author: string;
  createdAt: string;
}
```

---

## For the Next Agent

- All source files are in `C:\Programming\retroapp`
- **Do not use `experimentalDecorators`** — Aurelia 2 beta.21 requires TC39 standard decorators (ES2022 target, TypeScript 5.4)
- **Do not name component properties `loading`** — it conflicts with the Aurelia router-lite lifecycle hook. Use `isLoading` or similar.
- **Do not call browser globals in templates** — `window.*`, `navigator.*`, `document.*` must go through component methods
- **Do not use getter-based conditions in `if.bind`** — Aurelia 2 beta.21 does not reliably re-evaluate computed getters. Use inline expressions that directly reference `@observable` properties (e.g. `phase === 'good_items'` instead of `isItemPhase`)
- **Do not use method calls in `if.bind` or class interpolations** — Methods like `isSelected(id)` are not reactive. Use direct property comparisons (e.g. `editingAssigneeId === ap.id`) or array `.includes()` on observable arrays
- **Do not use `Set` for observable state** — Aurelia 2 cannot observe Set mutations. Use plain arrays instead and create new array references on mutation (e.g. `this.arr = this.arr.filter(...)` or `this.arr = [...this.arr, newItem]`)
- **Reactivity pattern:** The retro-room component uses a `syncState()` method to copy `retroService.session` data into local `@observable` properties. Any new data added to the session must also be copied in `syncState()` and the corresponding socket listener must be added in `retro-service.ts`
- Server types and client types are duplicated (`server/src/types.ts` and `client/src/models/interfaces.ts`) — keep them in sync if modifying data models
- The retro-room page (`client/src/pages/retro-room/retro-room.ts` + `.html`) is the most complex component — it handles all 8 phases in a single view using `if.bind` blocks
- Aurelia 2 DI: services are registered as singletons in `main.ts` via `Registration.instance()`, resolved in components via `resolve()` in field initializers
- The `RetroManager` class (`server/src/retro-manager.ts`) is the single source of truth for all business logic — all socket handlers and routes delegate to it
- File storage auto-saves on every state mutation via `RetroManager.save()`
- To reset a stuck retro: delete `server/data/active-retro.json` and restart the server
- `BrainstormComment` type and server-side `addBrainstormComment()` still exist but are unused by the UI — kept for backward compatibility with any archived retro data
