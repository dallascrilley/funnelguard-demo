export const GUIDED_TOURS = {
  funnelguard: {
    repoLabel: 'Funnelguard',
    repoUrl: 'https://github.com/dallascrilley/funnelguard-demo',
    steps: [
      {
        label: 'Pick a workspace config',
        body: 'Choose a synthetic HubSpot/GA4/ad-account scenario with planted UTM, form-binding, lifecycle, and attribution defects.',
      },
      {
        label: 'Check on the backend',
        body: 'Check on server posts the loaded config to the Cloudflare backend and returns byte-identical rule findings.',
      },
      {
        label: 'Follow the evidence',
        body: 'Findings point to the scanned config, severity, category, and downstream business risk so the defect is not just a warning label.',
      },
    ],
  },
} as const;
