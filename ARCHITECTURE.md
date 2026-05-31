# Funnelguard Architecture

## Stack

- **Astro 5** — static site generator
- **TypeScript** — vanilla TS, no framework
- **No backend, no API keys, no environment variables**

## Data model

```typescript
interface FunnelConfig {
  utmTaxonomy: { validSources: string[]; validMediums: string[]; requiredParams: string[] };
  campaigns: Campaign[];
  forms: Form[];
  lifecycleStages: LifecycleStage[];
  contacts: Contact[];
  workflows: Workflow[];
}

interface Finding {
  id: string;
  severity: 'Critical' | 'Warning' | 'Info';
  category: string;
  message: string;
  fix: string;
  objectRef?: string;
}
```

## Scenarios

Three synthetic funnel configs with distinct bug profiles:

| Scenario | Theme | Key findings |
|---|---|---|
| `saas-post-series-a` | High-growth SaaS | Missing UTM parameters, orphaned landing-page forms, lifecycle-stage contradictions |
| `ecommerce-brand` | DTC e-commerce | Campaign-to-product mismatches, duplicate UTMs, expired promo codes |
| `acme-q2` | Enterprise QBR prep | Broken attribution chains, missing cost-per-lead data, funnel stage gaps |

## Rule categories

Rules are grouped by domain:

- **UTM taxonomy** — valid source/medium/campaign combinations, required parameters, duplication
- **Form integrity** — orphaned forms (no workflow), missing hidden fields, duplicate IDs
- **Lifecycle logic** — stage transitions that skip required states, dead-end stages, contradictory assignment rules
- **Campaign attribution** — budget-to-revenue mismatches, missing tracking pixels, expired creative
- **Workflow health** — empty branches, infinite loops, missing error paths

## Key design decisions

### 1. Scenario-based narrative
Each scenario tells a story ("Q2 funnel audit for the board meeting"). This makes the findings memorable and credible — a hiring manager sees not just a list of rules, but a consultant's report.

### 2. Config viewer cross-linking
The raw JSON config is rendered alongside findings. Clicking an object reference in a finding scrolls the config viewer to that node. This demonstrates deep familiarity with the data structures MarTech teams actually manage.

### 3. Severity-weighted summary
The sticky summary strip shows counts by severity and category, updating as filters change. This gives instant situational awareness — the same skill required when triaging a real funnel audit.

## File map

| File | Responsibility |
|---|---|
| `src/pages/index.astro` | Shell: nav, banner, toolbar, findings, config viewer, about |
| `src/components/app.ts` | Bootstrap, scenario loading, findings rendering, filter wiring |
| `src/components/rules.ts` | Rule engine: all domain rules + dispatcher |
| `src/components/types.ts` | Shared interfaces |
| `src/styles/funnelguard.css` | Dashboard layout, severity chips, config viewer |

## What was cut for scope

- **Real CRM sync** — no HubSpot/Salesforce API
- **Auto-fix suggestions** — finds only; no automated remediation
- **Historical trend analysis** — single-snapshot audit only

## How to extend to production

A production version would need:
1. CRM connectors (HubSpot, Salesforce, Marketo) to pull live config
2. A rule authoring UI for custom org-specific checks
3. Scheduled audits with trend dashboards
4. Slack/Teams notifications for Critical findings
5. A CLI for CI integration (`funnelguard --config=./funnel.json`)
