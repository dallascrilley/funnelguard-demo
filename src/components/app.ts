// Funnelguard — client-side app
// Loads synthetic config, runs rule engine, renders findings UI.
// Pure vanilla TS. No framework, no external deps.

import { runRules } from './rules.ts';
import type { Finding, FunnelConfig, Severity, Category } from './types.ts';

// ─── Scenario registry ────────────────────────────────────────────────────────

interface ScenarioMeta {
  id: string;
  label: string;
  path: string;
}

const SCENARIOS: ScenarioMeta[] = [
  {
    id: 'acme-q2',
    label: 'Acme Corp — Q2 Funnel Config',
    path: '/data/acme-q2.json',
  },
  {
    id: 'saas-post-series-a',
    label: 'SaaS Startup — Post-Series A',
    path: '/data/saas-post-series-a.json',
  },
  {
    id: 'ecommerce-brand',
    label: 'E-Commerce Brand',
    path: '/data/ecommerce-brand.json',
  },
];

// ─── State ────────────────────────────────────────────────────────────────────

let currentConfig: FunnelConfig | null = null;
let allFindings: Finding[] = [];
let activeSeverities: Set<Severity> = new Set(['Critical', 'Warning', 'Info']);
let activeCategories: Set<Category> = new Set([
  'UTM Integrity',
  'Form Binding',
  'Lifecycle Logic',
  'Attribution Gap',
]);
let activeSort: 'severity' | 'category' | 'id' = 'severity';

// ─── Severity ordering ────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<Severity, number> = {
  Critical: 0,
  Warning: 1,
  Info: 2,
};

// ─── Filtered + sorted findings ───────────────────────────────────────────────

function getFilteredFindings(): Finding[] {
  let filtered = allFindings.filter(
    (f) => activeSeverities.has(f.severity) && activeCategories.has(f.category)
  );

  if (activeSort === 'severity') {
    filtered.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  } else if (activeSort === 'category') {
    filtered.sort((a, b) => a.category.localeCompare(b.category));
  } else {
    filtered.sort((a, b) => a.id.localeCompare(b.id));
  }

  return filtered;
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function severityClass(s: Severity): string {
  return s === 'Critical' ? 'critical' : s === 'Warning' ? 'warning' : 'info';
}

function categorySlug(c: Category): string {
  return c.toLowerCase().replace(/\s+/g, '-');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInlineCode(text: string): string {
  // Convert `backtick` spans to <code> tags
  return escapeHtml(text).replace(/`([^`]+)`/g, '<code>$1</code>');
}

function renderFindingCard(finding: Finding): string {
  const sev = severityClass(finding.severity);
  const catSlug = categorySlug(finding.category);
  const affectedHtml = finding.affectedObjects
    .map(
      (id) =>
        `<a class="fg-object-ref" href="#cfg-${id}" data-object-id="${escapeHtml(id)}">${escapeHtml(id)}</a>`
    )
    .join(' ');

  const criticalContextHtml = finding.criticalContext
    ? `<div class="fg-critical-context"><span class="fg-critical-label">Critical because:</span> ${renderInlineCode(finding.criticalContext.replace(/^Critical because:\s*/i, ''))}</div>`
    : '';

  // Signature pair: FG-009 + FG-012 get a compound callout
  const isSignaturePart = finding.id === 'FG-009' || finding.id === 'FG-012';
  const signatureHtml = isSignaturePart
    ? `<div class="fg-signature-pair ${finding.id === 'FG-009' ? 'fg-sig-top' : 'fg-sig-bottom'}">
        <span class="fg-sig-label">${finding.id === 'FG-009' ? 'Linked issue — also see FG-012' : 'Linked issue — also see FG-009'}</span>
      </div>`
    : '';

  return `<div class="fg-finding fg-sev-${sev}" data-severity="${escapeHtml(finding.severity)}" data-category="${escapeHtml(finding.category)}" data-id="${escapeHtml(finding.id)}" tabindex="0" role="article" aria-label="${escapeHtml(finding.id)}: ${escapeHtml(finding.headline)}">
  ${signatureHtml}
  <div class="fg-finding-header">
    <span class="fg-finding-id">${escapeHtml(finding.id)}</span>
    <span class="fg-category-badge fg-cat-${catSlug}">${escapeHtml(finding.category)}</span>
    <span class="fg-sev-badge fg-sevbadge-${sev}">${escapeHtml(finding.severity)}</span>
  </div>
  <div class="fg-finding-headline">${renderInlineCode(finding.headline)}</div>
  <div class="fg-finding-body">
    <div class="fg-finding-detail">${renderInlineCode(finding.detail)}</div>
    ${criticalContextHtml}
    <div class="fg-finding-fix"><span class="fg-fix-label">Fix:</span> ${renderInlineCode(finding.fix)}</div>
    <div class="fg-finding-objects">
      <span class="fg-objects-label">Affected:</span> ${affectedHtml}
    </div>
  </div>
</div>`;
}

function resetFilters(): void {
  activeSeverities = new Set(['Critical', 'Warning', 'Info']);
  activeCategories = new Set(['UTM Integrity', 'Form Binding', 'Lifecycle Logic', 'Attribution Gap']);
  document.querySelectorAll<HTMLButtonElement>('[data-sev-filter], [data-cat-filter]').forEach((btn) => {
    btn.setAttribute('aria-pressed', 'true');
    btn.classList.add('fg-filter-active');
  });
  renderFindings();
}

function renderFindings(): void {
  const list = document.getElementById('fg-findings-list');
  if (!list) return;

  const filtered = getFilteredFindings();

  if (filtered.length === 0) {
    list.innerHTML =
      '<div class="fg-empty">No findings match the current filters. ' +
      '<button class="fg-empty-reset" type="button">Reset filters</button></div>';
    list.querySelector('.fg-empty-reset')?.addEventListener('click', resetFilters);
  } else {
    list.innerHTML = filtered.map(renderFindingCard).join('');
  }

  // Re-bind object ref clicks
  bindObjectRefs();
  updateSummaryStrip();
  renderHero();
}

function updateSummaryStrip(): void {
  const filtered = getFilteredFindings();
  const crit = filtered.filter((f) => f.severity === 'Critical').length;
  const warn = filtered.filter((f) => f.severity === 'Warning').length;
  const info = filtered.filter((f) => f.severity === 'Info').length;
  const total = allFindings.length;
  const scanned = currentConfig?.scannedObjectCount ?? 0;

  const strip = document.getElementById('fg-summary-strip');
  if (!strip) return;

  strip.innerHTML = `
    <span class="fg-sum-item fg-sum-critical"><span class="fg-sum-count">${crit}</span> Critical</span>
    <span class="fg-sum-sep">·</span>
    <span class="fg-sum-item fg-sum-warning"><span class="fg-sum-count">${warn}</span> Warning</span>
    <span class="fg-sum-sep">·</span>
    <span class="fg-sum-item fg-sum-info"><span class="fg-sum-count">${info}</span> Info</span>
    <span class="fg-sum-sep">·</span>
    <span class="fg-sum-item fg-sum-total"><span class="fg-sum-count">${total}</span> Total findings</span>
    <span class="fg-sum-sep">·</span>
    <span class="fg-sum-item fg-sum-scanned"><span class="fg-sum-count">${scanned}</span> Scanned objects</span>
  `;
}

// ─── Hero: above-the-fold audit verdict + severity rollup ───────────────────────

function renderHero(): void {
  const el = document.getElementById('fg-hero');
  if (!el) return;
  const crit = allFindings.filter((f) => f.severity === 'Critical').length;
  const warn = allFindings.filter((f) => f.severity === 'Warning').length;
  const info = allFindings.filter((f) => f.severity === 'Info').length;
  const total = allFindings.length;
  const scanned = currentConfig?.scannedObjectCount ?? 0;

  // Headline = worst-severity finding (first in rule order).
  const headline = [...allFindings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])[0];
  const verdict =
    crit > 0 ? `${crit} critical issue${crit === 1 ? '' : 's'} ${crit === 1 ? 'is' : 'are'} silently corrupting this funnel’s data.`
    : warn > 0 ? `No criticals — but ${warn} warning${warn === 1 ? '' : 's'} will compound if left alone.`
    : total > 0 ? `${total} low-severity note${total === 1 ? '' : 's'}. Nothing urgent.`
    : 'Clean funnel — no findings.';
  const sev = headline ? severityClass(headline.severity) : 'info';

  el.className = `fg-hero fg-hero-${sev}`;
  el.innerHTML = `
    <div class="fg-hero-verdict-col">
      <span class="fg-hero-eyebrow">Audit verdict · ${escapeHtml(currentConfig?.label ?? '')}</span>
      <h1 class="fg-hero-verdict">${escapeHtml(verdict)}</h1>
      ${headline ? `
        <div class="fg-hero-lead">
          <span class="fg-sev-badge fg-sevbadge-${sev}">${escapeHtml(headline.severity)}</span>
          <span class="fg-hero-lead-cat">${escapeHtml(headline.category)}</span>
        </div>
        <p class="fg-hero-headline">${renderInlineCode(headline.headline)}</p>
        ${headline.criticalContext ? `<p class="fg-hero-context">${renderInlineCode(headline.criticalContext.replace(/^Critical because:\s*/i, 'Critical because: '))}</p>` : ''}
        <button class="fg-hero-cta" id="fg-hero-cta" data-finding-id="${escapeHtml(headline.id)}">Jump to ${escapeHtml(headline.id)} →</button>
      ` : '<p class="fg-hero-headline">Every scanned object passed. Switch scenarios to see the engine bite.</p>'}
    </div>
    <div class="fg-hero-rollup" aria-label="Findings by severity">
      <div class="fg-hero-rollup-head">${total} finding${total === 1 ? '' : 's'} · ${scanned} objects scanned</div>
      <div class="fg-hero-rollup-stats">
        <div class="fg-hero-stat fg-hero-stat-critical"><span class="fg-hero-num">${crit}</span><span class="fg-hero-stat-label">Critical</span></div>
        <div class="fg-hero-stat fg-hero-stat-warning"><span class="fg-hero-num">${warn}</span><span class="fg-hero-stat-label">Warning</span></div>
        <div class="fg-hero-stat fg-hero-stat-info"><span class="fg-hero-num">${info}</span><span class="fg-hero-stat-label">Info</span></div>
      </div>
      <div class="fg-hero-bar" role="img" aria-label="${crit} critical, ${warn} warning, ${info} info">
        ${crit ? `<span class="fg-b-critical" style="flex:${crit}"></span>` : ''}
        ${warn ? `<span class="fg-b-warning" style="flex:${warn}"></span>` : ''}
        ${info ? `<span class="fg-b-info" style="flex:${info}"></span>` : ''}
      </div>
    </div>`;

  document.getElementById('fg-hero-cta')?.addEventListener('click', (e) => {
    const id = (e.currentTarget as HTMLElement).dataset.findingId;
    const card = document.querySelector(`.fg-finding[data-id="${id}"]`) as HTMLElement | null;
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('fg-finding-flash');
    setTimeout(() => card.classList.remove('fg-finding-flash'), 1200);
  });
}

// ─── Config viewer rendering ──────────────────────────────────────────────────

function renderConfigViewer(): void {
  if (!currentConfig) return;

  const viewer = document.getElementById('fg-config-viewer-body');
  if (!viewer) return;

  const sections = [
    {
      key: 'campaigns',
      label: 'Campaigns',
      items: currentConfig.campaigns,
      render: (c: FunnelConfig['campaigns'][0]) => {
        const hasDefect = c.defect !== null;
        return `<div class="fg-cfg-item ${hasDefect ? 'fg-cfg-defect' : ''}" id="cfg-${c.id}" data-object-id="${c.id}">
  <span class="fg-cfg-id">${c.id}</span>
  <span class="fg-cfg-name">${escapeHtml(c.name)}</span>
  <span class="fg-cfg-meta">source=${escapeHtml(c.utmSource)} medium=${escapeHtml(c.utmMedium)} campaign=${c.utmCampaign ? escapeHtml(c.utmCampaign) : '<em class="fg-cfg-null">null</em>'} status=${escapeHtml(c.status)}</span>
  ${hasDefect ? `<span class="fg-cfg-defect-note">⚠ ${escapeHtml(c.defect!)}</span>` : ''}
</div>`;
      },
    },
    {
      key: 'forms',
      label: 'Forms',
      items: currentConfig.forms,
      render: (f: FunnelConfig['forms'][0]) => {
        const hasDefect = f.defect !== null;
        return `<div class="fg-cfg-item ${hasDefect ? 'fg-cfg-defect' : ''}" id="cfg-${f.id}" data-object-id="${f.id}">
  <span class="fg-cfg-id">${f.id}</span>
  <span class="fg-cfg-name">${escapeHtml(f.name)}</span>
  <span class="fg-cfg-meta">lifecycle=${escapeHtml(f.lifecycleStageAssigned ?? 'none')} overwrite=${f.lifecycleStageOverwrite} owner=${f.ownerAssigned} workflows=${f.workflowEnrollments.length}</span>
  ${hasDefect ? `<span class="fg-cfg-defect-note">⚠ ${escapeHtml(f.defect!)}</span>` : ''}
</div>`;
      },
    },
    {
      key: 'workflows',
      label: 'Workflows',
      items: currentConfig.workflows,
      render: (w: FunnelConfig['workflows'][0]) => {
        const hasDefect = w.defect !== null;
        return `<div class="fg-cfg-item ${hasDefect ? 'fg-cfg-defect' : ''}" id="cfg-${w.id}" data-object-id="${w.id}">
  <span class="fg-cfg-id">${w.id}</span>
  <span class="fg-cfg-name">${escapeHtml(w.name)}</span>
  <span class="fg-cfg-meta">status=${escapeHtml(w.status)} steps=${w.stepCount} enrolled=${w.activeEnrollments}</span>
  ${hasDefect ? `<span class="fg-cfg-defect-note">⚠ ${escapeHtml(w.defect!)}</span>` : ''}
</div>`;
      },
    },
    {
      key: 'contacts',
      label: 'Contact Segments (sampled)',
      items: currentConfig.contacts,
      render: (c: FunnelConfig['contacts'][0]) => {
        const hasDefect = c.defect !== null;
        return `<div class="fg-cfg-item ${hasDefect ? 'fg-cfg-defect' : ''}" id="cfg-${c.segment}" data-object-id="${c.segment}">
  <span class="fg-cfg-id">${c.segment}</span>
  <span class="fg-cfg-meta">count=${c.count} stage=${escapeHtml(c.lifecycleStage)}</span>
  ${hasDefect ? `<span class="fg-cfg-defect-note">⚠ ${escapeHtml(c.defect!)}</span>` : ''}
</div>`;
      },
    },
    {
      key: 'utmTaxonomy',
      label: 'UTM Taxonomy',
      items: [currentConfig.utmTaxonomy],
      render: (t: FunnelConfig['utmTaxonomy']) => {
        return `<div class="fg-cfg-item" id="cfg-utmTaxonomy">
  <span class="fg-cfg-name">Declared taxonomy</span>
  <span class="fg-cfg-meta">sources=[${t.validSources.join(', ')}]</span>
  <span class="fg-cfg-meta">mediums=[${t.validMediums.join(', ')}]</span>
  <span class="fg-cfg-meta">retired=[${t.retiredCampaigns.join(', ')}]</span>
</div>`;
      },
    },
  ];

  let lineNum = 1;
  let html = '';

  for (const section of sections) {
    html += `<div class="fg-cfg-section">
  <div class="fg-cfg-section-header">
    <span class="fg-cfg-line-num">${lineNum++}</span>
    <span class="fg-cfg-section-label">${section.label}</span>
    <span class="fg-cfg-count">${(section.items as unknown[]).length}</span>
  </div>`;

    for (const item of section.items as unknown[]) {
      const rendered = (section.render as (i: unknown) => string)(item);
      html += `<div class="fg-cfg-line">
  <span class="fg-cfg-line-num">${lineNum++}</span>
  ${rendered}
</div>`;
    }
    html += '</div>';
  }

  viewer.innerHTML = html;
}

// ─── Config cross-link interaction ────────────────────────────────────────────

function bindObjectRefs(): void {
  const refs = document.querySelectorAll<HTMLAnchorElement>('.fg-object-ref');
  refs.forEach((ref) => {
    ref.addEventListener('click', (e) => {
      e.preventDefault();
      const objectId = ref.getAttribute('data-object-id');
      if (!objectId) return;

      // Open config viewer if collapsed
      const cfgBody = document.getElementById('fg-config-viewer-body');
      const cfgToggle = document.getElementById('fg-config-toggle');
      if (cfgBody && cfgBody.getAttribute('aria-hidden') === 'true') {
        cfgBody.setAttribute('aria-hidden', 'false');
        cfgBody.classList.remove('fg-collapsed');
        if (cfgToggle) cfgToggle.setAttribute('aria-expanded', 'true');
      }

      // Find target in config viewer
      const target = document.getElementById(`cfg-${objectId}`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add('fg-cfg-highlight');
        setTimeout(() => target.classList.remove('fg-cfg-highlight'), 1200);
      }
    });
  });
}

// ─── Filter and sort controls ─────────────────────────────────────────────────

function bindFilterControls(): void {
  // Severity toggles
  const sevButtons = document.querySelectorAll<HTMLButtonElement>('[data-sev-filter]');
  sevButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const sev = btn.getAttribute('data-sev-filter') as Severity;
      if (activeSeverities.has(sev)) {
        activeSeverities.delete(sev);
        btn.setAttribute('aria-pressed', 'false');
        btn.classList.remove('fg-filter-active');
      } else {
        activeSeverities.add(sev);
        btn.setAttribute('aria-pressed', 'true');
        btn.classList.add('fg-filter-active');
      }
      renderFindings();
    });
  });

  // Category toggles
  const catButtons = document.querySelectorAll<HTMLButtonElement>('[data-cat-filter]');
  catButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-cat-filter') as Category;
      if (activeCategories.has(cat)) {
        activeCategories.delete(cat);
        btn.setAttribute('aria-pressed', 'false');
        btn.classList.remove('fg-filter-active');
      } else {
        activeCategories.add(cat);
        btn.setAttribute('aria-pressed', 'true');
        btn.classList.add('fg-filter-active');
      }
      renderFindings();
    });
  });

  // Sort select
  const sortSelect = document.getElementById('fg-sort') as HTMLSelectElement | null;
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      activeSort = sortSelect.value as 'severity' | 'category' | 'id';
      renderFindings();
    });
  }
}

// ─── Scenario loading ─────────────────────────────────────────────────────────

async function loadScenario(scenarioId: string): Promise<void> {
  const meta = SCENARIOS.find((s) => s.id === scenarioId);
  if (!meta) return;

  // Reset filters to "all" on scenario switch
  activeSeverities = new Set(['Critical', 'Warning', 'Info']);
  activeCategories = new Set(['UTM Integrity', 'Form Binding', 'Lifecycle Logic', 'Attribution Gap']);
  activeSort = 'severity';

  // Reset filter button states
  document.querySelectorAll<HTMLButtonElement>('[data-sev-filter], [data-cat-filter]').forEach((btn) => {
    btn.setAttribute('aria-pressed', 'true');
    btn.classList.add('fg-filter-active');
  });
  const sortSelect = document.getElementById('fg-sort') as HTMLSelectElement | null;
  if (sortSelect) sortSelect.value = 'severity';

  const resp = await fetch(meta.path);
  currentConfig = (await resp.json()) as FunnelConfig;
  allFindings = runRules(currentConfig);

  // Update scenario label
  const scenarioLabel = document.getElementById('fg-scenario-label');
  if (scenarioLabel) scenarioLabel.textContent = meta.label;

  renderConfigViewer();
  renderFindings();
}

// ─── Server check (live backend, POST /funnelguard/check) ──────────────────────

interface CheckResponse {
  findings: Finding[];
  counts: { Critical: number; Warning: number; Info: number };
  error?: string;
}

/**
 * Run the CURRENTLY-LOADED config against the LIVE Cloudflare Pages Function at
 * POST /funnelguard/check. The server runs the same deterministic rule engine,
 * so findings match the client path exactly — this proves the demo has a
 * real backend, not just client-side JS. (Mirrors apexlint's live-lint path.)
 */
async function checkOnServer(config: FunnelConfig): Promise<Finding[]> {
  const res = await fetch('/funnelguard/check', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(config),
  });
  const payload = (await res.json().catch(() => null)) as CheckResponse | null;
  if (!res.ok || !payload || payload.error) {
    const message = payload && typeof payload.error === 'string' ? payload.error : `Server check failed (${res.status})`;
    throw new Error(message);
  }
  return payload.findings ?? [];
}

function setServerStatus(kind: 'idle' | 'loading' | 'success' | 'error', message = ''): void {
  const el = document.getElementById('fg-server-status');
  if (!el) return;
  if (kind === 'idle') {
    el.hidden = true;
    el.textContent = '';
    el.className = 'fg-server-status';
    return;
  }
  el.hidden = false;
  el.className = `fg-server-status fg-server-status-${kind}`;
  el.textContent = message;
}

function wireCheckServer(): void {
  const btn = document.getElementById('fg-check-server') as HTMLButtonElement | null;
  if (!btn) return;

  btn.addEventListener('click', async () => {
    if (!currentConfig) return;

    const original = btn.textContent ?? 'Run server check';
    btn.disabled = true;
    btn.textContent = 'Checking on server…';
    setServerStatus('loading', 'Sending this funnel setup to the live server…');

    try {
      const findings = await checkOnServer(currentConfig);
      allFindings = findings;
      renderFindings();
      const crit = findings.filter((f) => f.severity === 'Critical').length;
      const warn = findings.filter((f) => f.severity === 'Warning').length;
      const info = findings.filter((f) => f.severity === 'Info').length;
      setServerStatus(
        'success',
        `Server check complete — ${findings.length} finding${findings.length === 1 ? '' : 's'} (${crit} critical, ${warn} warning, ${info} info). Same results as the in-browser check.`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Server check failed.';
      // Keep the last good client-side findings visible; surface the error inline.
      renderFindings();
      setServerStatus('error', `Server check failed: ${message}. Showing the last browser results.`);
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });
}

// ─── Scenario selector binding ────────────────────────────────────────────────

function bindScenarioSelector(): void {
  const select = document.getElementById('fg-scenario-select') as HTMLSelectElement | null;
  if (!select) return;

  // Populate options
  select.innerHTML = SCENARIOS.map(
    (s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.label)}</option>`
  ).join('');

  select.addEventListener('change', () => {
    loadScenario(select.value);
  });
}

// ─── Config viewer toggle ─────────────────────────────────────────────────────

function bindConfigViewerToggle(): void {
  const toggle = document.getElementById('fg-config-toggle');
  const body = document.getElementById('fg-config-viewer-body');
  if (!toggle || !body) return;

  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!isOpen));
    body.setAttribute('aria-hidden', String(isOpen));
    body.classList.toggle('fg-collapsed', isOpen);
  });
}

// ─── Banner dismiss ───────────────────────────────────────────────────────────

function bindBannerDismiss(): void {
  const btn = document.getElementById('fg-banner-dismiss');
  const banner = document.getElementById('fg-banner');
  if (!btn || !banner) return;

  const dismissed = sessionStorage.getItem('fg-banner-dismissed');
  if (dismissed) {
    banner.style.display = 'none';
  }

  btn.addEventListener('click', () => {
    banner.style.display = 'none';
    sessionStorage.setItem('fg-banner-dismissed', '1');
  });
}

// ─── About section toggle ─────────────────────────────────────────────────────

function bindAboutToggle(): void {
  const toggle = document.getElementById('fg-about-toggle');
  const body = document.getElementById('fg-about-body');
  if (!toggle || !body) return;

  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!isOpen));
    body.classList.toggle('fg-collapsed', isOpen);
  });
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  bindBannerDismiss();
  bindScenarioSelector();
  bindFilterControls();
  bindConfigViewerToggle();
  bindAboutToggle();
  wireCheckServer();

  await loadScenario('acme-q2');
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch(console.error);
});
