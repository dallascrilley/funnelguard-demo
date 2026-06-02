# Funnelguard Architecture

## Stack

- **Astro 5** — static site generator
- **TypeScript** — vanilla TS, no framework; the UI is a findings + config-viewer review surface
- **One Cloudflare Pages Function** (`functions/funnelguard/check.js`, `POST /funnelguard/check`) running the same engine server-side
- **No API keys, no secrets, no environment variables, no external calls**

## Two code paths, one engine

The 13 rules exist as a pure function `runRules(config) → Finding[]`. It is shipped twice from identical logic:

- **Client** (`src/components/rules.ts`, TypeScript) — runs in the browser for instant, zero-egress linting of the loaded scenario.
- **Server** (`functions/funnelguard/check.js`, plain JS) — a Cloudflare Pages Function that runs the *same* logic on a real backend so the analysis is provably not a canned reel.

The two are byte-equivalent: the server port was lifted from the client engine with types stripped and zero logic changes. `tests/funnelguard-check.test.js` pins both — every rule (positive + clean) plus the three sample configs as fixtures. The live demo's **“Check on server”** button POSTs the loaded config to `/funnelguard/check` and renders the response, which is identical to the in-browser findings.

## Why deterministic rules instead of an LLM

This is the load-bearing architectural decision:

| Concern | LLM-as-auditor | Funnelguard (deterministic rules) |
|---|---|---|
| **Determinism** | Same config, different findings run to run. Can't gate a QBR. | Same config → byte-identical findings. Auditable. |
| **Latency** | 1–5s per pass, network round-trip. | Sub-millisecond, in-browser, no network. |
| **Data egress** | Funnel/CRM config leaves the building. | Config never leaves the tab (client path). |
| **Auditability** | "The model said so" — no rule to cite. | Every finding cites a rule ID + affected objects. |
| **Cost** | Per-token, scales with config size. | Zero marginal cost. |

The interview line: *"You don't put a non-deterministic black box on the report that goes to the board. You put deterministic rules there, and you reserve the LLM for the fuzzy stuff — explaining a finding, not deciding it."*

## Data model

```typescript
interface FunnelConfig {
  scenario: string;
  label: string;
  description: string;
  scannedObjectCount: number;
  utmTaxonomy: { validSources: string[]; validMediums: string[]; retiredCampaigns: string[] };
  campaigns: Campaign[];
  forms: Form[];
  lifecycleStages: string[];
  contacts: ContactSegment[];
  workflows: Workflow[];
}

interface Finding {
  id: string;                 // "FG-001"
  category: 'UTM Integrity' | 'Form Binding' | 'Lifecycle Logic' | 'Attribution Gap';
  severity: 'Critical' | 'Warning' | 'Info';
  headline: string;           // one sentence, practitioner voice
  detail: string;             // why it matters
  fix: string;                // exact actionable fix
  criticalContext?: string;   // "Critical because: ..." plain-English
  affectedObjects: string[];  // IDs of scanned objects implicated
}
```

The server endpoint returns `{ findings: Finding[], counts: { Critical, Warning, Info } }`.

## Scenarios

Three synthetic funnel configs (`public/data/*.json`), realistic in shape and fabricated in fact, each with a distinct bug profile:

| Scenario | Theme | Findings produced |
|---|---|---|
| `acme-q2` | Enterprise Q2 funnel audit | 16 — the full signature set across all four categories |
| `saas-post-series-a` | High-growth SaaS | 6 — unowned trial MQLs, Customers in lead nurture, orphaned retired workflow |
| `ecommerce-brand` | DTC e-commerce | 7 — retired-campaign attribution, wrong UTM medium, return-form lifecycle downgrade |

The findings are **whatever the engine produces** on each config — there is no precomputed list. The fixtures in the test suite pin the engine's output so any accidental drift (client or server) fails CI.

## Rule engine

Rules are plain functions `(config: FunnelConfig) => Finding[]`. Each handles one class of failure:

| Rule ID | Category | Severity | Detection |
|---|---|---|---|
| FG-001 | UTM Integrity | Critical | Retired campaign is the attribution source for live contacts |
| FG-002 | UTM Integrity | Critical / Warning | Organic/social channel tagged `cpc`, or an undeclared `utm_source` |
| FG-003 | UTM Integrity | Warning | Active campaign with `utm_campaign = null` |
| FG-004 | Form Binding | Warning | Ebook/content form creates a Lead with no workflow |
| FG-005 | Form Binding | Critical | MQL/SQL intent form (pricing/trial) with no owner and no workflow |
| FG-006 | Form Binding | Warning | Partner form with no list and no workflow |
| FG-007 | Form Binding | Critical | Workflow trigger form-ID ≠ actual form ID (zero enrollments ever) |
| FG-008 | Form Binding | Warning | Thank-you redirect returns 404 |
| FG-009 | Form Binding | Critical | Form overwrites lifecycle to Lead/MQL, demoting Customers |
| FG-010 | Form Binding | Info | Form with no CRM integration — data goes nowhere |
| FG-011 | Lifecycle Logic | Critical | MQL contacts with `owner = null` |
| FG-012 | Lifecycle Logic | Critical | Customer-stage contacts enrolled in lead-acquisition nurture |
| FG-013 | Lifecycle Logic | Warning | SQL contacts untouched 90+ days with no open opportunity |
| FG-014 | Attribution Gap | Warning | Contacts first-touch attributed to a retired campaign |
| FG-015 | Attribution Gap | Warning | Active workflow on a retired trigger campaign, zero enrollments |
| FG-016 | Attribution Gap | Warning | Owner-assign workflow missing the highest-intent form trigger |

## Key design decisions

### 1. Cross-object findings
The engine reasons across object types — FG-005 (pricing form has no owner), FG-011 (unowned MQLs going cold), and FG-016 (owner-assign workflow missing the pricing form) are the *same root cause* surfaced from three angles. FG-009 + FG-012 are a deliberate compounding pair: a form demotes Customers, a workflow catches them on the way down.

### 2. Config viewer cross-linking
The raw config is rendered alongside findings. Clicking an affected-object reference in a finding scrolls the config viewer to that node and highlights it. This demonstrates familiarity with the data structures MarTech teams actually manage.

### 3. Severity-weighted summary
The sticky summary strip shows counts by severity and category, updating as filters change — the situational awareness required when triaging a real funnel audit.

### 4. Shared engine, two surfaces
The same rules run client-side (instant) and on the live backend (provably real). The "Check on server" button re-runs the loaded config through `POST /funnelguard/check`; the findings match the in-browser pass exactly.

## File map

| File | Responsibility |
|---|---|
| `src/pages/index.astro` | Shell: nav, banner, toolbar (scenario/filters/"Check on server"), findings, config viewer, about |
| `src/components/app.ts` | Bootstrap, scenario loading, findings rendering, filter wiring, live-backend check |
| `src/components/rules.ts` | All 13 rule implementations + `runRules` dispatcher (client) |
| `functions/funnelguard/check.js` | Same engine as a Cloudflare Pages Function (`POST /funnelguard/check`) + body validation |
| `tests/funnelguard-check.test.js` | `node --test`: all 13 rules (positive + clean) + 3 sample fixtures + `check()` validation |
| `src/components/types.ts` | Shared interfaces |
| `src/styles/funnelguard.css` | Dashboard layout, severity chips, config viewer |

## What was cut for scope

- **Real CRM connection** — no HubSpot/Salesforce/Marketo/GA4 API. The backend lints a config snapshot you submit; it does not read from your stack (that needs server-side OAuth).
- **Auto-fix** — findings include an exact fix paragraph; a human applies it.
- **Historical trend analysis** — single-snapshot audit only.
- **Custom rule authoring UI** — rules are hardcoded.

## How to extend to production

A production version would need:
1. CRM connectors (HubSpot, Salesforce, Marketo) to pull live config via OAuth
2. A rule registry (YAML/JSON) so teams add org-specific rules without recompiling
3. Scheduled audits with trend dashboards and Slack/Teams alerts on Critical findings
4. A CLI (`funnelguard --config=./funnel.json`) for CI integration

## Performance

- Full pass: sub-millisecond for the sample configs (no I/O, pure functions)
- Bundle: ~28 KB (8 KB gzipped) app script, no external deps
