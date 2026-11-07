# LoopTracker · Visual Concept Engine & Learning Loopbreaker

> **Escape Tutorial Hell**: A full-stack visual knowledge engine built with React, Vite, Express, React Flow (`@xyflow/react`), Tailwind CSS, and the `@google/genai` TypeScript SDK (Gemini 3.8 Flash & Gemini 3.8 Live API).

---

## 1. System Overview & The Core Problem

Self-directed engineers and job seekers frequently fall into **"Tutorial Hell"** and the **Learning-Forgetting Loop**:
1. You watch tutorials or study complex architecture (distributed systems, database internals, concurrency).
2. You take scattered notes across Notion, Apple Notes, or scratch files.
3. When you return after days or weeks, context is gone: you don't remember where you stopped, what tripped you up, or why concepts connect.
4. Frustrated, you restart the tutorial from zero.

**LoopTracker** breaks this cycle with an active cognitive canvas:
- **Zero-Friction Ingestion**: Speak messy voice memos or paste raw code snippets/stack traces.
- **Anti-Explosion Auto-Merging**: Macro concepts are extracted and merged into existing nodes rather than creating 50 duplicate micro-cards.
- **State of Mind Briefings**: Resuming study on any card answers three concrete questions:
  1. *Where you left off*
  2. *Exact stumbling block/friction point hit*
  3. *Concrete next step to take right now*
- **Daily Feynman Active Recall**: Identifies cold nodes (Mastery $\le 2$) and challenges you to explain mechanisms from first principles without jargon crutches.
- **Real-Time Gemini 3.8 Live Voice Coach**: Full-duplex 2-way audio voice mentor via WebSockets.

---

## 2. Design System Architecture

LoopTracker strictly implements a **Zero-Shadow, 1px Flat Border, Cold-Undertone Architecture** across two themes:

### A. Light Mode: Flat Vintage-Cold (Arctic Archive)
- **Baseline Substrate**: `#ECEFF1` (Weathered Chalk / Arctic Archive)
- **Cards & Containers**: `#D5DBDB` (Flat Muted Container)
- **Text & Structural Lines**: `#2E4053` / `#2C3E50` (Nordic Iron)
- **Core Accent**: `#4A6572` (Frost Teal)
- **Status Tones**: `#C0392B` (Cold Red), `#D35400` (Warm Amber), `#27AE60` (Mastered Green)

### B. Dark Mode: Flat Mystic Gothic (Lunar Eclipse)
- **Substrate (The Void)**: `#0B0F19` (Lunar Eclipse)
- **Cards & Containers**: `#161F30` (Midnight Iron)
- **Structural Lines & Borders**: `#2E3F59` (Wireframe Blue)
- **Spectral Text Accent**: `#E2E8F0` / `#F8FAFC` (Pale Moonbeam)
- **Status Tones**: `#EF4444` (Cold Red), `#F97316` (Warm Orange), `#10B981` (Mastered Emerald)

### C. Zero-Shadow Enforcement
- Global CSS rule: `*, *::before, *::after { box-shadow: none !important; }`
- Zero blurred dropshadows or gradient pills; 100% flat substrate contrast and 1px structural outlines.
- Viewport containment: Root layout bound to `100vw` / `100vh` with `overflow: hidden` to eliminate window scrolling. All modals use `max-h-[85vh]` with internal scrollbars.

---

## 3. Core Modules & Technical Specifications

### Module 1: Hybrid Voice & Markdown/Code Ingestion Pipeline
- **API Endpoint**: `POST /api/process-input`
- **Text Ingestion**: Supports Markdown headers, bullet points, and multi-language code snippets.
- **Audio Ingestion**: Transcribes audio blobs (`audio/webm`, `audio/mp4`, `audio/pcm`) using Gemini 3.8 multimodal audio processing.
- **Graceful Error Handling**: 400 Bad Request on blank notes; non-blocking recovery if microphone hardware permissions are denied.

### Module 2: AI Extraction & Anti-Explosion Auto-Merging
- **Macro Concept Resolution**: Submitting code dense with keywords (`SELECT`, `WHERE`, `JOIN`) extracts macro topics ("SQL Query Optimization & Indexes") rather than isolated micro-nodes.
- **Entity Resolution**: Submitting "postgres index optimization" against an existing "PostgreSQL Indexes" node resolves the existing node ID, updates the summary, appends raw notes, and refreshes the friction point without duplicating the node.

### Module 3: Visual Canvas (`@xyflow/react`) & State Persistence
- **Custom Concept Nodes**: Color-coded by mastery score:
  - Scores 1–2 (Cold): `#C0392B` / `#EF4444`
  - Score 3 (Progressing): `#D35400` / `#F97316`
  - Scores 4–5 (Mastered): `#27AE60` / `#10B981`
- **Real-Time Coordinate Persistence**: `onNodeDragStop` triggers `PUT /api/concepts/:id/position`, updating local state and syncing to Firebase Firestore if signed in.
- **Relationship Linking**: Connecting top/bottom/side node handles generates directional links (`depends_on`, `related_to`, `builds_upon`) and persists via `POST /api/relationships`.
- **Cascade Deletion**: Deleting a concept immediately cleans up all attached edges (`source_concept_id` / `target_concept_id`) and closes the inspector cleanly.

### Module 4: Context Resumption & State of Mind Briefing
- **API Endpoint**: `POST /api/concepts/:id/state-of-mind`
- When selecting any concept card, the inspector renders a 3-part synthesis:
  1. **Where you left off**: Synthesis of previous code traces and discussion.
  2. **Exact friction point hit**: Specific stumbling block (e.g. race condition, rebalance latency).
  3. **Suggested next step**: Concrete 15-minute action item to resume focus immediately.

### Module 5: Daily Feynman Warm-Up & Learning Audit Trail
- **API Endpoints**: `POST /api/feynman/question`, `POST /api/feynman/grade`, `GET /api/audit-trail`
- **Cold Node Detection**: Automatically queries concepts with `mastery_score <= 2` or those untouched for $> 7$ days.
- **Intuitive Recall Grading**: Evaluates user answers from first principles:
  - Flags buzzword/jargon crutches (e.g., reciting textbook definitions without causal explanation).
  - Highlights strong intuitions.
  - Generates updated mastery scores (1–5) and logs every transition to the `learning_states` audit table.

### Live Voice Coach (Gemini 3.8 Live API)
- **Protocol**: WebSocket connection to `ws://localhost:3000/live`.
- **Audio Pipeline**:
  - Browser mic: 16kHz 1-channel PCM streaming to server via `ScriptProcessorNode`.
  - Server bridge: Gemini 3.8 Live API bidirectional session (`gemini-3.8-live`).
  - Playback: 24kHz AudioContext buffer queue with real-time interruption handling (`interrupted: true` halts current audio playback immediately when user speaks).
  - Compact UI: 56px visualizer with dynamic volume ring, prompt suggestions, and strict `max-h-[85vh]` viewport constraint.

---

## 4. Edge Cases Handled & Failure Modes

| Edge Case / Failure Mode | Expected Behavior | Verification Status |
| :--- | :--- | :--- |
| **Browser Locker Behavior** | Calling `window.confirm()`, `window.alert()`, or `window.prompt()` crashes sandboxed iframes. LoopTracker completely eliminated all modal locker calls in favor of immediate action or inline toasts. | ✅ Passed |
| **Node Deletion (User Request)** | When a user requests note deletion, it deletes immediately without blocking modal prompts, purging the node and all connected edges from disk and state. | ✅ Passed |
| **Self-Loop Invariant** | Connecting a node's handle to itself is rejected with a 400 Bad Request (`source <> target`). | ✅ Passed |
| **Blank / Whitespace Note** | Submitting empty text or blank whitespace returns a graceful 400 response with informative error toast, without crashing the server. | ✅ Passed |
| **Deleted Node Lookup** | Requesting `/api/concepts/:deletedId` returns clean 404 JSON instead of hanging or returning HTML. | ✅ Passed |
| **Audio Hardware Blocked** | When mic access is denied in browser settings, the modal falls back to prefilled text templates without unhandled exceptions. | ✅ Passed |
| **Low Viewport Heights** | On low-height screens ($< 700\text{px}$), modals and slide-overs shrink gracefully with internal scrollbars (`min-h-0 flex-1 overflow-y-auto`). | ✅ Passed |
| **Network Disconnection in Live Voice** | If the WebSocket connection drops, an inline "Reconnect" button is shown; audio context is cleaned up to prevent audio memory leaks. | ✅ Passed |

---

## 5. Automated Verification & Testing Suites

LoopTracker includes two comprehensive testing suites in the codebase:

### Suite 1: `server/qa_test_suite.js` (Modules 1–5 QA Checklist)
Runs 12 automated checks across the 5 core modules:
```bash
node server/qa_test_suite.js
```
**Output**:
```
===============================================================
🚀 LOOPTRACKER QA TEST SUITE: MODULES 1 - 5
===============================================================
--- [Module 1] Hybrid Input & Audio Pipeline ---
  ✅ [PASS] Test 1.1: Raw Markdown & Code Snippet Input parsed without crashing
  ✅ [PASS] Test 1.2: Empty / Invalid audio payload caught with graceful 400 error
--- [Module 2] AI Extraction & Auto-Merging (Anti-Explosion) ---
  ✅ [PASS] Test 2.1: Entity Resolution matches and updates existing "Raft Consensus Algorithm" node without duplicate ID
  ✅ [PASS] Test 2.2: Granularity control extracted macro concepts (1 nodes created/updated, prevented micro-node explosion)
--- [Module 3] Visual Canvas & State Persistence ---
  ✅ [PASS] Test 3.1: Concepts maintain valid 1-5 mastery scores with visual color-mapping
  ✅ [PASS] Test 3.2: Node drag coordinates persisted to (358, 107)
  ✅ [PASS] Test 3.3: 3-Part "State of Mind" briefing (where left off, friction point, next step) generated
--- [Module 4] Context Resumption & Feynman Warm-Up ---
  ✅ [PASS] Test 4.1: Cold nodes correctly query concepts with mastery <= 2 or overdue review (5 cold nodes detected)
  ✅ [PASS] Test 4.2: Feynman evaluation graded explanation (Score: 3/5, state_of_mind updated)
  ✅ [PASS] Test 4.3: Learning states audit trail recorded transaction with score transition
--- [Module 5] Security & Multi-Tenant Isolation ---
  ✅ [PASS] Test 5.1: Invariant guard blocked self-loop relationship (source == target)
  ✅ [PASS] Test 5.2: Path variable lookup safely returns 404 for unmapped IDs
===============================================================
📊 SUMMARY: 12 PASSED, 0 FAILED
===============================================================
```

### Suite 2: `server/full_system_test.js` (End-to-End Stress & Cascade Test)
Runs 12 end-to-end integration checks including direct note deletion and cascade verification:
```bash
node server/full_system_test.js
```
**Output**:
```
[PASS] Seed reset API -> Loaded 8 concepts
[PASS] Fetch Graph API -> 8 nodes retrieved
[PASS] Note Ingestion & Creation -> Created/Updated node
[PASS] Update Concept Details -> Mastery updated to 4/5
[PASS] Add Graph Relationship -> Connected nodes
[PASS] Delete Note Directly (No Locker/Confirm) -> Deleted note directly
[PASS] Verify Node & Relationship Cascaded Removal -> Node and connected edges completely purged
[PASS] Edge Case: 404 on Deleted Node -> Status 404
[PASS] Edge Case: Graceful 400 on Blank Note -> Returned status 400
[PASS] Edge Case: Prevent Self-Loop Relationship -> Blocked self-connection with 400
[PASS] State of Mind 3-Part Briefing -> Briefing generated
[PASS] Feynman Question & Active Recall Grading -> Question generated and explanation scored 1-5
===============================================================
Final Result: 12/12 tests passed.
===============================================================
```

---

## 6. Bugs & Issues Found During Testing (and Resolutions)

1. **`Uncaught Error: Breaking Browser Locker Behavior detected`**:
   - **Root Cause**: `window.confirm()` in `ConceptSlideOver.tsx` and `App.tsx`, and `window.alert()` in `InputDrawer.tsx` triggered sandbox security exceptions in the browser iframe.
   - **Resolution**: Removed all `confirm()` and `alert()` calls. Clicking delete now executes the deletion immediately without freezing or crashing the iframe, satisfying the user requirement *"if note need to be delete then delete right"*.

2. **Viewport Vertical Overflow on Live Voice Modal**:
   - **Root Cause**: The Live Voice dialog exceeded smaller window heights ($< 768\text{px}$), causing dialog controls to clip.
   - **Resolution**: Set `max-h-[85vh]` on the modal container with flex column structure, made the visualizer compact (56px), and set the suggestion chips container to internal scrolling (`flex-1 overflow-y-auto min-h-0`).

3. **Collision Between Warm-Up Toast and React Flow Controls**:
   - **Root Cause**: The cold-node Feynman toast was fixed to `bottom-6 right-6`, overlapping React Flow zoom/pan controls and the quick input drawer.
   - **Resolution**: Relocated the toast to `top-3 right-3` as a compact, non-intrusive alert with flat 1px borders and direct dismiss/action buttons.

4. **Missing Single-Concept Route on Backend**:
   - **Root Cause**: `GET /api/concepts/:id` was not registered on the Express router, falling back to Vite's index.html and returning HTML instead of JSON.
   - **Resolution**: Added `app.get('/api/concepts/:id', ...)` in `server.ts` returning 404 for non-existent IDs and JSON for active concepts.

---

## 7. Further Recommended Adjustments & Future Roadmap

1. **Audio File Import**:
   - Currently, voice notes are recorded live via the browser microphone or simulated. Adding a drag-and-drop `.mp3` / `.m4a` / `.wav` upload option would benefit users with offline voice memos from phone voice recorders.
2. **Keyboard Shortcut Navigation**:
   - Add shortcut keys (e.g. `Ctrl+K` for search, `Space` for quick brain dump, `D` for Feynman drill) to enable faster navigation without touching the mouse.
3. **Automated Spaced Repetition Scheduling (SM-2 Algorithm)**:
   - Expand the `next_review_at` field with SuperMemo-2 (SM-2) intervals so that concepts move from daily drill to 3-day, 7-day, and 30-day recall intervals based on historical Feynman grades.
4. **Graph Cluster Auto-Layout**:
   - Add a force-directed layout toggle (e.g. D3-force or Dagre) so users can auto-arrange complex 50+ node graphs hierarchically with a single click.
