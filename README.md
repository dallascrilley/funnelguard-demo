# Funnelguard

> **Your funnel is lying to you.**

Funnelguard is a **deterministic linter** for marketing-funnel configuration — the HubSpot/GA4/ad-account layer where RevOps mistakes silently corrupt attribution. It runs **13 deterministic rules** over a `FunnelConfig` you submit (campaigns, forms, lifecycle stages, contact segments, workflows, declared UTM taxonomy) and flags broken UTM taxonomy, orphaned forms, lifecycle-stage contradictions, and attribution gaps before they reach a QBR. No LLM, no model call, no data leaving to a third party.

The same engine runs two ways: **client-side in the browser** (instant, zero-egress) and on a **live Cloudflare Pages Function** (`POST /funnelguard/check`) so the analysis is provably real, not a canned reel. Both code paths share one rule engine and produce byte-identical findings.

**Live demo:** [demos.dallascrilley.com/funnelguard](https://demos.dallascrilley.com/funnelguard) — load a synthetic scenario instantly, or hit **“Check on server”** to re-run the loaded config through the live backend.

## Real vs. synthetic — the honest boundary

| Capability | Source |
| --- | --- |
| Run 13 deterministic rules over a `FunnelConfig` you submit | **Real** — actual analysis of your config object, client-side and on the live backend |
| `POST /funnelguard/check` server endpoint returning `{ findings, counts }` | **Real** — a deployed Cloudflare Pages Function running the same engine |
| Findings cite a rule ID (FG-001 … FG-016), category, severity, the affected objects, and a fix | **Real** — emitted deterministically per rule |
| Pre-loaded sample funnel configs (the three scenarios shown on load) | Synthetic — `public/data/*.json`, realistic in shape, fabricated in fact (no real CRM data) |
| Live HubSpot / GA4 / Salesforce / Bizible / Dreamdata connection that pulls *from your stack* | Out of scope — that needs server-side OAuth; you submit a config snapshot, the backend lints it |
| Auto-fix / one-click remediation | Out of scope — Funnelguard surfaces the finding and an exact fix; a human applies it |

The synthetic scenarios let a reviewer try it instantly. The config is a **point-in-time snapshot you submit**, not a live connection to your marketing stack — the rules are genuine, the data is yours.

## The rules

13 rule functions emit findings under IDs FG-001 … FG-016, grouped into four categories:

**UTM Integrity:** FG-001 retired campaign still attributing contacts · FG-002 wrong `utm_medium` (organic/social tagged `cpc`) or undeclared `utm_source` · FG-003 missing `utm_campaign`.

**Form Binding:** FG-004 ebook lead with no workflow · FG-005 unowned MQL/SQL intent form (pricing/trial) · FG-006 partner lead invisible to automation · FG-007 workflow form-ID mismatch (zero-yield trigger) · FG-008 thank-you 404 · FG-009 lifecycle-downgrade form (support/return/cancel/contact-sales demoting Customers) · FG-010 form with no CRM integration.

**Lifecycle Logic:** FG-011 unowned MQLs going cold · FG-012 Customers enrolled in lead-acquisition nurture · FG-013 stale SQLs (90+ days untouched).

**Attribution Gap:** FG-014 contacts attributed to a retired campaign · FG-015 orphaned workflow on a retired trigger campaign · FG-016 owner-assign workflow missing the highest-intent form.

The signature finding is the **FG-009 + FG-012 compounding failure**: a form demotes Customers to Lead, and a nurture workflow catches them on the way down. Every rule has positive + clean coverage in `tests/funnelguard-check.test.js`.

## The backend

`functions/funnelguard/check.js` is a Cloudflare Pages Function exposing `POST /funnelguard/check`:

```bash
curl -s https://demos.dallascrilley.com/funnelguard/check \
  -H 'content-type: application/json' \
  --data-binary @public/data/acme-q2.json
# → {"findings":[{"id":"FG-001",...},...],"counts":{"Critical":7,"Warning":8,"Info":1}}
```

It reads a `FunnelConfig` JSON body, runs the engine, and returns `{ findings, counts }`. Malformed input (non-JSON, missing `utmTaxonomy`, or a non-array `campaigns`/`forms`/`contacts`/`workflows`) returns HTTP 400 with a message. No secrets, no external calls, no LLM. The pure `runRules` / `check` / per-rule helpers are exported so they unit-test without a network.

## Run locally

```bash
pnpm install
pnpm test                                    # node --test — all 13 rules (positive + clean) + 3 sample fixtures
pnpm build                                   # static site → ./dist
npx wrangler pages dev dist                  # serve site + POST /funnelguard/check locally (port 8788)
pnpm dev                                     # static UI only — http://localhost:4321 (scenarios, no backend)
```

The backend (`/funnelguard/check`) is available under `wrangler pages dev`; `pnpm dev` serves the client-side UI alone (the three scenarios still lint instantly in-browser).

## What it proves

- **MarTech / RevOps systems fluency** — UTM taxonomy, form-to-CRM handoffs, lifecycle-stage logic, and campaign-to-revenue attribution, reviewed with engineering rigor.
- **Deterministic guardrail design** — every finding is reproducible and CI-gateable; knowing *when not to use an LLM* is the senior signal.
- **Cross-object reasoning** — findings link forms, campaigns, contacts, and workflows into one coherent story (FG-009 ↔ FG-012, FG-005 ↔ FG-011 ↔ FG-016).
- **Honest system boundaries** — the real/synthetic and "no live CRM, you submit the config" lines are explicit in the UI banner, the API response, and this README.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the rule-engine structure, the client/server shared-engine design, and tradeoffs.

## License

MIT
