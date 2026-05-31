# Funnelguard

> **Your funnel is lying to you.**

Funnelguard is a client-side linter for marketing funnel configuration. It catches broken UTM taxonomy, orphaned forms, lifecycle-stage contradictions, and attribution gaps before they corrupt your QBR data. Three synthetic scenarios, 20+ rules, zero backend.

**Live demo:** [demos.dallascrilley.com/funnelguard](https://demos.dallascrilley.com/funnelguard)

## What it proves

- **MarTech systems fluency** — understands UTM taxonomy, form-to-CRM handoffs, lifecycle-stage logic, and campaign-to-revenue attribution.
- **Deterministic rule design** — every finding is reproducible and auditable, not a model guess.
- **Config-as-code review** — treats marketing ops config with the same rigor as infrastructure-as-code.
- **Cross-object reasoning** — flags that link forms, campaigns, contacts, and lifecycle stages into a single coherent finding.

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:4321`. Choose a scenario from the selector to load synthetic funnel config.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for design decisions, rule categories, and tradeoffs.

## Honest limits

- **No live CRM connection** — does not connect to HubSpot, Salesforce, or Marketo.
- **Synthetic scenarios only** — pre-authored config with planted bugs.
- **No auto-fix** — surfaces findings; a human decides the remediation.
- **Rule coverage is bounded** — covers the most common attribution and lifecycle gaps, not every edge case.

## License

MIT
