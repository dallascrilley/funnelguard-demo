// Single-origin engine entry for EXTERNAL consumers (e.g. the demo-lab storefront).
//
// funnelguard-demo is the canonical source of the rule engine. The standalone app
// imports the local source directly; this barrel is the published surface other
// repos depend on (via the package `exports` map) so the engine has ONE origin and
// can no longer drift between the storefront and the standalone repo.
export { runRules } from './rules.ts';
export type { Finding, FunnelConfig, Severity, Category } from './types.ts';
