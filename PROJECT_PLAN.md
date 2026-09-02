# CapSpace Pro - Development Plan & Roadmap

## 1. Project Objectives
1. Build a high-performance, beautiful web app that allows users to construct 2-team, 3-team, and 4-team NBA trades.
2. Implement 100% deterministic CBA matching logic for the 2024–25 NBA season (including 1st and 2nd Apron rules).
3. Expose standard **WebMCP** tools on `document.modelContext` so any AI agent (ChatGPT, Chrome with WebMCP flag) can inspect, audit, and restructure trades.
4. Provide an embedded AI Co-Pilot drawer with one-click GM prompts and visual before/after salary diffs.
5. Create an interactive "Beginner's Guide" tab explaining the real-world problem and human-AI collaboration in plain English.

---

## 2. Technical Milestones

### Milestone 1: Data Architecture & CBA Engine (`src/data/`, `src/engine/`)
- [x] Create `nba_cba_2025.json` with 30 NBA teams, ~150 key player contracts, active TPEs, draft picks, and Apron thresholds.
- [x] Implement `cbaEngine.ts`:
  - `calculateTeamPayroll(team)`
  - `getAllowableIncomingSalary(outgoingSalary, teamTaxBracket)`
  - `checkSecondApronRestrictions(team, trade)`
  - `validateTradeLegality(tradePayload)`
  - `findFacilitators(tpeNeeded, rosterSlotsNeeded)`
- [x] Write comprehensive unit tests (`tests/cbaEngine.test.ts`) covering:
  - Non-taxpayer 175% + $100k matching
  - Taxpayer 100% matching
  - Second Apron aggregation ban
  - TPE absorption mechanics

### Milestone 2: WebMCP Tool Layer (`src/webmcp/`)
- [x] Create `modelContextBridge.ts`:
  - Polyfill / check for `document.modelContext` or `window.modelContext`
  - Register `get_team_cap_status`, `validate_cba_trade`, `find_facilitator_teams`, `auto_balance_trade`
  - Ensure compatibility with Chrome WebMCP flag and ChatGPT in-app browser

### Milestone 3: Interactive UI Components (`src/components/`)
- [x] **Header:** Live CBA Legal / Disallowed badge, team payroll counters, and tab switcher.
- [x] **Trade Board Canvas (`TradeBoard.tsx`):**
  - Interactive multi-column team cards (NYK, PHX, CHA, etc.)
  - Roster list with player salary badges and "🔒 Protect" toggle switches
  - Visual Second Apron progress bar gauge with color-coded warning zones (Green $\rightarrow$ Yellow $\rightarrow$ Red)
  - Incoming vs Outgoing salary breakdown cards
- [x] **WebMCP Agent Co-Pilot (`AgentSidebar.tsx`):**
  - Tool execution logs showing `document.modelContext` calls
  - One-click GM strategy prompts ("Fix trade for Knicks", "Dump salary into TPE")
  - Custom natural language instruction input
- [x] **Explanation Tab (`BeginnersGuide.tsx`):**
  - Plain-English, non-developer breakdown answering:
    - What is the real-world problem?
    - Why do existing trade machines fail?
    - How does the AI Co-Pilot solve the puzzle?

### Milestone 4: Test Harness & Quality Assurance (`tests/`)
- [x] 100% pass on CBA rules unit tests
- [x] Verification of zero console errors
- [x] Verification of responsive layout (desktop & tablet)

---

## 3. Verification & Demo Criteria
- **Demo Scenario 1 (The Blockbuster Dilemma):** User proposes trading for Mikal Bridges to NYK ($23.3M) sending only Bogdanović ($19.0M) $\rightarrow$ Tool flags $4.3M deficit $\rightarrow$ User prompts agent $\rightarrow$ Agent routes Jericho Sims ($2.1M) + 2nd pick to Charlotte's TPE $\rightarrow$ Trade becomes 100% legal.
- **Demo Scenario 2 (Second Apron Aggregation):** Phoenix (over 2nd Apron) attempts to aggregate two players for one $\rightarrow$ Tool highlights Second Apron restriction $\rightarrow$ Agent finds legal alternative single-player swap.
