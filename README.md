# CapSpace Pro 🏀⚡
### NBA Collective Bargaining Agreement (CBA) Multi-Team Trade Co-Pilot powered by WebMCP

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![WebMCP Standard](https://img.shields.io/badge/WebMCP-Enabled-orange.svg)](#webmcp-implementation)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg)](https://tailwindcss.com/)

> **Live Web App:** [https://capspace-pro.vercel.app](https://capspace-pro.vercel.app)  
> **GitHub Repository:** [https://github.com/sachinm207/capspace-pro](https://github.com/sachinm207/capspace-pro)  
> **Devpost Challenge Link:** [webmcp.devpost.com](https://webmcp.devpost.com)  
> **Testing Support:** Testable in the ChatGPT Desktop in-app browser or Chrome with `#enable-webmcp-testing` or built-in test client (`npm test`).

---

## 📖 Overview

In professional basketball, teams cannot simply trade players at will. Every franchise is bound by the strict **676-page NBA Collective Bargaining Agreement (CBA)**.

Under the 2025–26 NBA Season CBA rules:
* High-spending teams in the **Second Apron ($188.9M+)** are prohibited from aggregating outgoing salaries and cannot take back even $1 more than they send out.
* Trades must satisfy exact piecewise arithmetic matching brackets ($7.5M, $29M tiers, $250k buffers) down to the single dollar across all participating teams.
* Multi-team trades require matching Traded Player Exceptions (TPEs) and maintaining legal 14–15 player roster limits.

**CapSpace Pro** provides an interactive 30-team trade canvas coupled with high-speed deterministic constraint solving. By exposing the CBA rulebook as native **WebMCP tools**, AI agents and human journalists, fans,  General Managers can collaborate seamlessly with the app to restructure complex multi-contract trades in real time.

---

## 🎯 Devpost Submission Questions

### 1. Why is this use case a strong fit for WebMCP?
Raw LLMs struggle with multi-tier tax bracket arithmetic, 676-page rule memorization, and real-time combinatorial optimization across 30 rosters. WebMCP provides the exact bridge needed: the webpage hosts a deterministic, sub-millisecond mathematical rule engine, and exposes typed tools (`validate_cba_trade`, `find_facilitator_teams`, `auto_balance_trade`) to the AI agent. The agent handles natural language intent and team strategy, while the web application guarantees 100% mathematical and regulatory precision.

### 2. How does it create a better user experience?
Instead of a user spending hours calculating salary brackets or navigating cluttered spreadsheet tables, they simply talk to their AI assistant while watching the trade canvas. The user can visually lock their favorite superstar players or pin core trade anchors with a single click, and the agent uses WebMCP to discover 3rd-team facilitators, route salaries into active TPE vouchers, and instantly project a legally approved trade onto the canvas.

### 3. What can people and agents do together that was difficult or impossible before?
* **Zero-Hallucination Trade Machine:** The agent cannot propose an illegal trade because every step is validated by the client-side CBA engine.
* **Superstar Protection Guardrails:** The human sets strategic bounds (e.g. locking Steph Curry or Jayson Tatum), and the agent autonomously navigates the remaining roster assets to satisfy multi-million dollar salary deficits.
* **Bilateral In-Trade Core Anchors (🔒):** Humans pin their marquee trade targets while leaving bench assets flexible for the AI to dynamically balance.
* **Instant 3-Team Multi-Contract Routing:** Solves complex multi-team trades involving draft pick compensation and Trade Exceptions in under 1 millisecond.

### 4. How did you implement WebMCP?
CapSpace Pro implements the WebMCP standard via `modelContextBridge.ts`:
* Registers typed tools on `navigator.modelContext` and `document.modelContext`.
* Provides schemas and execution handlers for:
  * `list_all_teams`: Overview of all 30 NBA teams, payrolls, and apron tiers.
  * `get_team_cap_status`: Detailed breakdown of a team's tax apron status and allowable incoming salary.
  * `validate_cba_trade`: Client-side sub-millisecond CBA compliance checker returning detailed violation citations.
  * `find_facilitator_teams`: Identifies 3rd-party teams with available TPE vouchers or cap space.
  * `set_player_protection`: Locks/unlocks superstar untouchable status on any roster.
  * `route_salary_to_tpe`: Directly absorbs salary into a 3rd-party team's Traded Player Exception.
  * `auto_balance_trade`: Combinatorial constraint satisfaction algorithm that outputs balanced trade packages while strictly preserving human trade anchors.
  * `reset_trade`: Restores the trade board and roster locks to a clean canvas.

---

## 🛠️ WebMCP Tool Specifications (All 8 Tools)

| Tool Name | Type | Description |
| :--- | :---: | :--- |
| `list_all_teams` | `readOnly` | Lists all 30 NBA teams with total payrolls, tax apron tiers, and active TPE exceptions. |
| `get_team_cap_status` | `readOnly` | Returns a specific team's complete payroll breakdown, luxury tax distance, and allowable incoming brackets. |
| `validate_cba_trade` | `readOnly` | Evaluates multi-team trades against the official CBA rules and returns dollar-by-dollar compliance. |
| `find_facilitator_teams` | `readOnly` | Scans all 30 teams to find valid 3rd-party facilitators capable of absorbing contracts. |
| `set_player_protection` | `mutation` | Sets/clears superstar untouchable protection lock on any player. |
| `route_salary_to_tpe` | `mutation` | Routes specific player contract directly into a 3rd team's Traded Player Exception. |
| `auto_balance_trade` | `mutation` | Autonomously balances trade to 100% CBA legality while preserving human trade anchors. |
| `reset_trade` | `mutation` | Clears all trades and resets the board to a clean canvas. |

---

## 🚀 Quick Start & Local Development

### Prerequisites
* Node.js 18+
* npm or yarn

### Installation & Testing
```bash
# Clone the repository
git clone https://github.com/sachinm207/capspace-pro.git
cd capspace-pro

# Install dependencies (0 audit vulnerabilities)
npm install

# Run 38 unit & integration tests
npm test

# Start local development server
npm run dev
```

### Build for Production
```bash
npm run build
```

---

## 📚 Project Documentation & Gallery

* **[Beginner's Layman Guide](docs/BEGINNER_GUIDE.md):** Plain English guide to NBA salary caps, luxury tax aprons, and trade rules.
* **[Assumptions & Technical Architecture](docs/ASSUMPTIONS.md):** Detailed mathematical specification, data ingestion model, and CBA constants.
* **[Screenshot Gallery](gallery/):** 5 high-resolution (3:2 ratio) authentic screenshots of the live application.

---

## ⚖️ License & Trademark Compliance

* **Open Source:** Licensed under the [MIT License](LICENSE).
* **Security:** 0 npm audit vulnerabilities.
* **Trademark Safety:** Team identities use plain-text city names, standard statistical abbreviations (`BOS`, `LAL`, `NYK`), and generic sports iconography. No copyrighted NBA franchise logos or league silhouettes are included.

