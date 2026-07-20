export const GUIDED_TOURS = {
  funnelguard: {
    repoLabel: 'Funnelguard',
    repoUrl: 'https://github.com/dallascrilley/funnelguard-demo',
    steps: [
      {
        label: 'Pick a sample funnel',
        body: 'Choose a sample marketing setup. Each one has real mistakes planted in campaigns, forms, lifecycle stages, and tracking tags.',
      },
      {
        label: 'Run the server check',
        body: 'Click “Run server check” to send the loaded setup to the live backend. You should see the same findings the browser already showed.',
      },
      {
        label: 'Follow the evidence',
        body: 'Open a finding to see severity, what broke, how to fix it, and jump to the matching object in the scanned config.',
      },
    ],
  },
} as const;
