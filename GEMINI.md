# CapSpace Pro - Project Context & Agent Instructions

## Overview
**CapSpace Pro** is an AI-augmented NBA Salary Cap & Multi-Team Trade Machine built for the **OpenAI WebMCP Devpost Challenge**. It bridges deterministic Collective Bargaining Agreement (CBA) financial calculations with Large Language Model (LLM) strategic reasoning using the browser-native **WebMCP** standard (`document.modelContext.registerTool`).

---

## Core Problem Solved
Existing trade machines (ESPN Trade Machine, Fanspo) are **dumb forward validators**: when a trade fails by $3.45M, they display a dead-end red error with no solution.

CapSpace Pro is an **intelligent reverse-solver**:
1. The user expresses natural GM intent (e.g. *"Acquire Mikal Bridges, protect Jalen Brunson, remain under the Second Apron"*).
2. The WebMCP Agent queries deterministic CBA tools in the browser.
3. The Agent autonomously discovers 3rd-team facilitators with matching Traded Player Exceptions (TPEs), routes minimum filler contracts, attaches fair draft compensation, and restructures the trade to **100% legal status in milliseconds**.

---

## Architecture & Tech Stack
- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + Lucide React Icons
- **State Management:** Lightweight React Context / Zustand for reactive UI updates
- **Protocol Standard:** WebMCP (`document.modelContext` / `window.modelContext`)
- **CBA Engine:** Deterministic TypeScript library modeling the 2023–2030 NBA CBA rules:
  - 100%–200% salary matching tiers for non-taxpayers
  - 100% hard matching for First Apron & Second Apron teams
  - Prohibition on salary aggregation for Second Apron teams
  - Traded Player Exception (TPE) absorption & expiration tracking
  - Roster minimums (14 standard) and maximums (15 standard contracts)
- **Testing:** Vitest for 100% unit-test coverage of CBA matching rules and WebMCP tool executions

---

## WebMCP Tool Specifications
The web application MUST register the following typed tools on `document.modelContext`:

1. `get_team_cap_status({ teamCode: string })`:
   Returns team payroll, distance to luxury tax line, 1st Apron ($178.1M), and 2nd Apron ($188.9M).

2. `validate_cba_trade({ tradePayload: TradeObject })`:
   Deterministically verifies if every participating team satisfies allowable incoming salary percentages and roster limits. Returns `{ isLegal: boolean, violations: string[] }`.

3. `find_facilitator_teams({ minCapRoomOrTpe: number, maxIncomingSalary: number })`:
   Scans all 30 NBA teams to return viable 3rd-party facilitator teams with open roster spots and matching TPEs.

4. `auto_balance_trade({ targetTeam: string, incomingPlayerId: string, protectedPlayerIds: string[] })`:
   Executes combinatorial resolution to find minimum filler salaries, exception activations, and pick compensations to balance the trade.

---

## Development & Code Invariants
1. **Zero External Backend API Dependency:** All contract data and CBA rules run client-side using bundled JSON (`src/data/nba_cba_2025.json`).
2. **Trademark Safety:** Use text abbreviations (`BOS`, `LAL`, `NYK`) and team color badges. Do not include copyrighted NBA silhouette logos.
3. **Open Source Compliance:** Must include a root `LICENSE` (MIT License) file.
4. **Clean Code:** Strictly typed TypeScript interfaces for all CBA domain models.
