# CapSpace Pro — Devpost Submission Details

---

## 🏷️ Project Title & Subtitle

* **Project Name:** CapSpace Pro
* **Subtitle / Short Headline:** Autonomous NBA Collective Bargaining Agreement (CBA) Multi-Team Trade Co-Pilot powered by WebMCP

---

## 🎙️ Elevator Pitch (Max 200 Characters)

### Selected (163 characters):
> **CapSpace Pro is a WebMCP-powered NBA CBA co-pilot that turns dead-end trade errors into autonomous, 100% legally compliant multi-team trade solutions in real time.**

#### Alternative Options:
* **Option B (170 characters):**  
  *CapSpace Pro connects WebMCP AI agents with an NBA CBA engine to autonomously solve complex multi-team trades, route salary exceptions, and guarantee 100% legal compliance.*
* **Option C (166 characters):**  
  *CapSpace Pro uses WebMCP to turn dead-end NBA trade errors into 100% legally compliant multi-team deals with real-time AI auto-balancing and salary exception routing.*

---

## 🏷️ Built With (25 Tags for Devpost)

### Copy-Paste Comma-Separated List (Exactly 25 Tags):
```text
webmcp, typescript, react, tailwindcss, vite, vitest, model-context-protocol, lucide-react, vercel, netlify, node.js, javascript, html5, css3, git, github, npm, json, postcss, autoprefixer, ws, clsx, tailwind-merge, esbuild, ai-agents
```

---

## 📸 Image Gallery (100% Real App Screenshots, 3:2 Ratio)

All files are located in the [`gallery/`](gallery/) folder:

| # | File Name | Exact Screen Shown | Suggested Devpost Caption |
| :-: | :--- | :--- | :--- |
| **1** | `01_interactive_trade_canvas.png` | 3-Column baseline trade canvas with live payrolls, tax badges, and TPE host panel. | *CapSpace Pro interactive 3-team trade canvas with real-time luxury tax and apron tracking.* |
| **2** | `02_cba_rule_violation_alert.png` | Real CBA violation state showing red violation banner ($46.8M excess) and glowing "Auto-Balance Deal" button. | *Deterministic CBA constraint solver detecting exact single-dollar salary match violations in real time.* |
| **3** | `03_blockbuster_3team_balanced_trade.png` | Active 3-team trade with Jericho Sims absorbed into Charlotte's TPE, draft pick compensation, and green "TRADE APPROVED" banner. | *Multi-team trade auto-balancing: Routing salary deficits into Charlotte's TPE with draft pick compensation.* |
| **4** | `04_webmcp_protocol_tools_modal.png` | WebMCP protocol documentation modal detailing all 8 registered tools and sample agent prompts. | *WebMCP architecture: Exposing 8 typed browser tools directly to external AI agents on navigator.modelContext.* |
| **5** | `05_general_manager_cba_guide_modal.png` | Built-in GM Walkthrough modal explaining the 5-step trade workflow and 2025–26 NBA CBA rules table. | *Built-in interactive guide explaining NBA CBA mechanics, tax aprons, and salary-matching rules.* |

---

## 🔗 Project Links & Metadata

* **Live Web App:** [https://capspace-pro.vercel.app](https://capspace-pro.vercel.app)
* **GitHub Repository:** [https://github.com/sachinm207/capspace-pro](https://github.com/sachinm207/capspace-pro)

---

# About the project

## Inspiration

Every February around the NBA Trade Deadline, millions of sports fans, journalists, and front-office analysts flock to online trade machines (such as ESPN Trade Machine and Fanspo) to construct dream blockbuster trades. But with the introduction of the modern **676-page NBA Collective Bargaining Agreement (CBA)**, trading has become an unforgiving mathematical minefield:

* Teams spending in the **Second Apron ($188.93M+)** face severe trade freezes—they cannot aggregate multiple outgoing player salaries and cannot take back even **$1** more than they send out.
* Trades must satisfy exact piecewise arithmetic brackets ($7.5M tiers, $29M tiers, $250k buffers) across all participating franchises.
* Complex deals require multi-team routing through **Traded Player Exceptions (TPEs)** and strict 14–15 contract roster limits.

When a multi-team trade fails in current trade machines, the user is greeted by a dead-end red banner:  
❌ *"Trade Failed: Incoming salary exceeds allowed bracket by $3,450,000."*

Existing tools tell you **that** a trade failed, but never **how to fix it**. Fixing it manually requires opening 29 browser tabs, digging through TPE voucher lists, and spending 45 minutes calculating tax arithmetic. We built **CapSpace Pro** to turn the trade machine from a **dumb calculator that only says "NO"** into an **autonomous Human-AI Co-Pilot that says "HERE IS HOW WE FIX IT."**

---

## What it does

**CapSpace Pro** is a real-time, 30-team trade canvas and autonomous CBA constraint solver powered by **WebMCP**. It creates a seamless co-pilot experience between human General Managers and AI agents:

1. **Interactive Multi-Team Canvas:** Visualizes live payrolls, luxury tax tiers, First/Second Apron lines, draft pick assets, and available TPE vouchers for all 30 NBA franchises.
2. **Sub-Millisecond CBA Engine:** Evaluates trades against official CBA rules down to the single dollar in under 1 millisecond.
3. **Superstar Protection & In-Trade Anchors (🔒):**
   * **Roster Superstar Locks:** Protects franchise cornerstones (e.g., Steph Curry, Nikola Jokić) from ever being touched by automated solvers.
   * **Trade Card Anchors:** Lets humans pin marquee trade targets as immutable centerpieces, instructing the AI to only manipulate flexible bench contracts.
4. **Autonomous Multi-Team Balancing & Facilitator Routing:** The AI agent autonomously discovers 3rd-party facilitator teams with matching TPE vouchers or cap space to absorb excess salary, solving multi-million-dollar trade deficits automatically.
5. **Zero-Hallucination WebMCP Bridge:** Exposes 8 typed tools (`validate_cba_trade`, `find_facilitator_teams`, `auto_balance_trade`, etc.) directly on `navigator.modelContext`, letting browser-native agents inspect, validate, and restructure live trade boards with 100% mathematical precision.

---

## How we built it

We engineered CapSpace Pro as a modular, high-performance web application coupled with the new **WebMCP standard**:

```
 ┌────────────────────────────────────────────────────────┐
 │                     User GM / Fan                      │
 └───────────────────────────┬────────────────────────────┘
                             │  Natural Language & Visual Clicks (🔒)
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │            Browser-Native AI Agent (WebMCP)            │
 └───────────────────────────┬────────────────────────────┘
                             │  Typed JSON Tool Invocations
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │           CapSpace Pro WebMCP Protocol Bridge          │
 │        (navigator.modelContext.registerTool)           │
 └──────────────┬──────────────────────────┬──────────────┘
                │                          │
                ▼                          ▼
 ┌──────────────────────────┐   ┌─────────────────────────┐
 │   Deterministic CBA      │   │     Reactive React      │
 │   Constraint Engine      │   │   30-Team Canvas UI     │
 │   (TypeScript Math)      │   │   (Tailwind CSS 3.4)    │
 └──────────────────────────┘   └─────────────────────────┘
```

### 1. Deterministic CBA Mathematical Formulation
The mathematical engine models the exact piecewise salary-matching brackets defined under the 2023–2030 NBA CBA:

#### A. Non-Taxpaying Teams (Payroll < $170,814,000)
* **Tier 1 (Outgoing ≤ $7,500,000):**  
  `Allowed Incoming = (200% × Outgoing Salary) + $250,000`
* **Tier 2 ($7,500,000 < Outgoing ≤ $29,000,000):**  
  `Allowed Incoming = Outgoing Salary + $7,500,000`
* **Tier 3 (Outgoing > $29,000,000):**  
  `Allowed Incoming = (125% × Outgoing Salary) + $250,000`

#### B. Taxpaying Teams Below First Apron ($170,814,000 ≤ Payroll < $178,132,000)
* `Allowed Incoming = (110% × Outgoing Salary) + $250,000`

#### C. First & Second Apron Teams (Payroll ≥ $178,132,000)
* `Allowed Incoming = 100% × Outgoing Salary ($0 allowable surplus)`
* **Second Apron Freeze (≥ $188,931,000):** `Aggregation Allowed = FALSE` (prohibits combining multiple outgoing contracts).

#### D. Traded Player Exception (TPE) Absorption Condition
For an incoming contract to be legally absorbed into an existing TPE by facilitator team F:
* `Contract Incoming ≤ TPE Size + $250,000`
* `Roster Size(F) < 15 contracts`
* `Post-Trade Payroll(F) ≤ Hard Cap / Apron Ceiling`

---

### 2. Full Suite of 8 WebMCP Tools
Implemented via `modelContextBridge.ts` exposing both read-only and mutation interfaces:
* `list_all_teams` (`readOnly`)
* `get_team_cap_status` (`readOnly`)
* `validate_cba_trade` (`readOnly`)
* `find_facilitator_teams` (`readOnly`)
* `set_player_protection` (`mutation`)
* `route_salary_to_tpe` (`mutation`)
* `auto_balance_trade` (`mutation`)
* `reset_trade` (`mutation`)

### 3. Tech Stack
* **Frontend:** React 18, TypeScript 5.5, Vite, Lucide Icons
* **Styling & Design:** Tailwind CSS 3.4 with custom glassmorphic sports dark mode
* **Testing:** Vitest test suite with **38 unit and integration tests** passing with 0 vulnerabilities

---

## Challenges we ran into

1. **Second Apron Aggregation Constraints:** Under the new CBA, Second Apron teams cannot combine two $10M players to acquire a single $20M player. Enforcing this piecewise combinatorial rule while calculating multi-team exchanges required designing a recursive contract-matching validator.
2. **Preserving Human Intent during Autonomous Balancing:** Early versions of automated balancing would solve financial parity by arbitrarily moving superstar players. We solved this by creating a two-tier locking architecture: **Roster Superstar Protection** (protects franchise players from leaving) and **In-Trade Anchors** (pins the trade centerpiece so the AI only optimizes secondary bench assets).
3. **Sub-Millisecond Browser Execution for WebMCP:** We had to ensure that the combinatorial search across 30 rosters and dozens of active TPE vouchers executed synchronously in the browser sandbox without causing UI freezes or async lag during live agent conversations.

---

## Accomplishments that we're proud of

* **Zero-Hallucination Agent Governance:** By offloading mathematical logic to a deterministic TypeScript rule engine, the AI agent is physically incapable of proposing an illegal trade.
* **38/38 Passing Automated Tests:** Thorough test coverage verifying edge cases including Second Apron aggregation blocks, luxury tax bracket transitions, and 3-team TPE absorption.
* **Flawless WebMCP Integration:** Full compliance with the `navigator.modelContext` protocol with bidirectional state synchronization between natural language agent prompts and the interactive React canvas.
* **Clean, Accessible UX:** High information density displaying 30 teams, roster breakdowns, financial health bars, and interactive trade cards without clutter.

---

## What we learned

* **Why WebMCP is the Future of Domain-Specific AI:** Large Language Models excel at natural language understanding and strategic high-level reasoning, but struggle with strict multi-tier arithmetic. WebMCP acts as the ultimate symbiotic layer: the agent brings user empathy and strategic intent, while the browser tool engine provides mathematical certainty.
* **The Nuances of Modern Sports Finance:** Developing the constraint solver gave us a deep appreciation for the legal and financial engineering behind the NBA's new hard-apron economic landscape.

---

## What's next for CapSpace Pro

* **Stepien Rule & Draft Pick Matrix:** Integrating the Stepien Rule (forbidding teams from trading consecutive future first-round draft picks) into the automated validation pipeline.
* **Multi-Year Cap Projections:** Allowing GMs to simulate trades 2–3 seasons into the future to forecast luxury tax repeater penalties.
* **Multi-League Expansion:** Porting the WebMCP constraint engine to other complex salary cap leagues, such as the **NFL hard cap** and **NHL salary ceiling**.
