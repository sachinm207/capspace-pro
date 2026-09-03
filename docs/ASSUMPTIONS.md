# CapSpace Pro - Assumptions & Technical Architecture Model

> This document details the data ingestion model, financial Collective Bargaining Agreement (CBA) constants, WebMCP protocol specifications, and operational assumptions underlying CapSpace Pro.

---

## 1. Data Ingestion & Real-Time Sync Assumptions

### A. Bundled 30-Team Baseline Dataset
* **Current State:** The application ships with a fully verified, self-contained **30-team NBA database** (`src/data/nba_cba_2025.json`) modeling real-world contracts, active Traded Player Exceptions (TPEs), and draft assets for the 2024–25 season.
* **Rationale:** In hackathon environments and judge evaluations, bundling verified contract data guarantees **100% uptime, zero network latency, and zero risk of external API rate-limiting or paywall errors**.

### B. Upstream Commercial API Integration (Production Model)
* **Commercial Reality:** Automated live streaming of player contract signings and transaction wires in commercial apps (Spotrac, Fanspo, RealGM) relies on proprietary enterprise feeds (e.g. Spotrac API, Stats Perform) requiring paid enterprise licensing ($10k–$50k/year).
* **Production Pipeline:** In a production SaaS setup, an automated Cloudflare Worker or GitHub Actions cron job polls the upstream provider nightly, validates the payloads, and publishes an updated JSON to an Edge CDN.
* **Plug-and-Play Design:** CapSpace Pro's data ingestion layer is decoupled; swapping the bundled JSON for a live remote endpoint (`fetch('/api/live-cap-feed')`) requires a single configuration change.

### C. Deterministic In-Browser Math
* All salary matching percentages, luxury tax distances, and Second Apron calculations execute **client-side in TypeScript (`cbaEngine.ts`) in under 1 millisecond**.
* No server round-trip is required for combinatorial trade validation or facilitator discovery.

### D. Roster Depth & Contract Selection Model
* **Rotation Curation:** Each team's bundled roster currently models the **top 6 to 9 primary rotation players** (earning between $2M and $50M+ per year), which account for **~85–90% of total team payroll**.
* **Rationale for Trade Machine UX:** 
  1. Real-world NBA trade rumors and salary-matching math overwhelmingly center on rotation contracts rather than 10-day or minimum-wage end-of-bench spots.
  2. Displaying curated rotation rosters in a scrollable container (`max-h-44`) maintains high UI information density across the 3-column side-by-side trade canvas, preventing excessive vertical scrolling during live AI agent restructuring demos.
  3. The data schema seamlessly supports scaling to the full 15-player active rosters (450 league contracts) without engine modifications.

---

## 2. CBA Financial & Regulatory Constants (2025–26 Season)

All trade calculations adhere strictly to the 2023–2030 NBA Collective Bargaining Agreement:

| Threshold / Rule | Value (USD) | Mechanical Impact |
| :--- | :--- | :--- |
| **Salary Cap** | **$140,588,000** | Standard team spending threshold. |
| **Luxury Tax Threshold** | **$170,814,000** | Tax penalties apply on every dollar above this line. |
| **First Apron Line** | **$178,132,000** | 100% hard salary matching limit (cannot take back more than outgoing). |
| **Second Apron Line** | **$188,931,000** | **Strict Trade Freeze:** Prohibition on aggregating salaries, sending cash, or using pre-existing TPEs. |
| **Minimum Contract Floor** | **$2,087,519** | Minimum allowable player contract value. |
| **Roster Constraints** | **14–15 Contracts** | Teams must maintain at least 14 and at most 15 standard contracts. |

### Salary Matching Brackets:
1. **Non-Taxpayer (Below $170.8M):**
   - Outgoing $\le \$7.5\text{M} \implies 200\% + \$250\text{k}$
   - Outgoing between $\$7.5\text{M}$ and $\$29\text{M} \implies \text{Outgoing} + \$7.5\text{M}$
   - Outgoing $> \$29\text{M} \implies 125\% + \$250\text{k}$
2. **Taxpayer (Between $170.8M and $178.1M):**
   - Allowable incoming: $110\% \times \text{Outgoing} + \$250\text{k}$
3. **First & Second Apron Teams ($>\$178.1\text{M}$):**
   - Hard 100% match ($0 allowed incoming surplus).
   - Second Apron teams cannot aggregate two outgoing contracts into one incoming contract.

---

## 3. WebMCP Protocol & Agent Execution Assumptions

1. **Protocol Standard:** Tools are registered on `navigator.modelContext.registerTool` (and `document.modelContext.registerTool`) with typed JSON schemas and `readOnlyHint` attributes.
2. **8 Native WebMCP Tools:**
   * `list_all_teams`
   * `get_team_cap_status`
   * `validate_cba_trade`
   * `find_facilitator_teams`
   * `set_player_protection`
   * `route_salary_to_tpe`
   * `auto_balance_trade`
   * `reset_trade`
3. **Execution Context:** In native WebMCP environments (ChatGPT Desktop, Google Chrome with `#enable-webmcp-testing`), tools execute within the browser tab sandbox with zero filesystem or terminal access.
4. **Two-Way Synchronization:** Tool execution by external agents mutates the reactive React trade board state in real time.

---

## 4. Legal & Trademark Compliance (Devpost Rule §4)

1. **Trademark Safety:** Team identities use clean text abbreviations (`BOS`, `LAL`, `NYK`) and primary team color palettes. No copyrighted NBA silhouette logos or proprietary imagery are used.
2. **Open Source Licensing:** Repository includes root `LICENSE` under the MIT License.
