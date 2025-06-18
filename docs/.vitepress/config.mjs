import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Kairo',
  description: 'A functional, composable TypeScript library that eliminates glue code',
  cleanUrls: true,

  head: [
    ['meta', { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
  ],

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
    lineNumbers: true,
    languages: ['typescript', 'javascript', 'bash', 'json'],
  },

  vite: {
    server: {
      host: true,
      port: 5173,
    },
  },

  themeConfig: {
    nav: [
      { text: 'Get Started', link: '/getting-started/' },
      { text: 'Learning Paths', link: '/learning-paths/' },
      { text: 'Examples', link: '/examples/' },
      { text: 'API Reference', link: '/api-reference/' },
      { text: 'GitHub', link: 'https://github.com/sovanaryththorng/sanzoku-labs/kairo' },
    ],

    sidebar: {
      '/getting-started/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Choose Your Path', link: '/getting-started/' },
            { text: 'Your First App', link: '/getting-started/your-first-app' },
            { text: 'Building APIs', link: '/getting-started/building-apis' },
            { text: 'Managing Data', link: '/getting-started/managing-data' },
            { text: 'Processing Data', link: '/getting-started/processing-data' },
          ],
        },
        {
          text: 'Quick Solutions',
          items: [
            { text: 'Common Patterns', link: '/examples/common-patterns' },
            { text: 'Decision Tree', link: '/examples/decision-tree' },
            { text: 'Troubleshooting', link: '/troubleshooting/' },
          ],
        },
      ],
      '/learning-paths/': [
        {
          text: 'Learning Paths',
          items: [
            { text: 'Overview', link: '/learning-paths/' },
            { text: 'Foundation Path', link: '/learning-paths/foundation-path' },
            { text: 'Application Path', link: '/learning-paths/application-path' },
          ],
        },
        {
          text: 'Progress & Assessment',
          items: [
            { text: 'Advancement Criteria', link: '/learning-paths/advancement-criteria' },
            { text: 'Interactive Exercises', link: '/learning-paths/interactive-exercises' },
            { text: 'Progress Tracking', link: '/learning-paths/progress-tracking' },
          ],
        },
      ],
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is Kairo?', link: '/guide/' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Three-Pillar Architecture', link: '/guide/architecture' },
            { text: 'Core Concepts', link: '/guide/concepts' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Result Pattern', link: '/api/core/result' },
          ],
        },
        {
          text: '🏛️ Core APIs (~20KB)',
          collapsed: false,
          items: [
            {
              text: '🔗 INTERFACE Pillar',
              items: [
                { text: 'Resource API', link: '/api/core/resource' },
                { text: 'Contract Verification', link: '/api/core/contracts' },
              ],
            },
            {
              text: '⚡ PROCESS Pillar',
              items: [
                { text: 'Pipeline API', link: '/api/core/pipeline' },
                { text: 'Business Rules API', link: '/api/core/rules' },
              ],
            },
            {
              text: '🛡️ DATA Pillar',
              items: [
                { text: 'Native Schema API', link: '/api/core/schema' },
                { text: 'Transform API', link: '/api/core/transform' },
                { text: 'Repository API', link: '/api/core/repository' },
              ],
            },
          ],
        },
        {
          text: '⚡ Extensions (~30KB)',
          collapsed: true,
          items: [
            { text: 'Event-Driven Architecture', link: '/api/extensions/events' },
            { text: 'Transaction Management', link: '/api/extensions/transactions' },
            { text: 'Advanced Caching', link: '/api/extensions/cache' },
            { text: 'Complex Workflows', link: '/api/extensions/workflow' },
            { text: 'Plugin System', link: '/api/extensions/plugins' },
          ],
        },
        {
          text: '🧪 Testing Framework',
          collapsed: true,
          items: [{ text: 'Testing Guide', link: '/testing-guide' }],
        },
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Overview', link: '/examples/' },
            { text: 'Common Patterns', link: '/examples/common-patterns' },
            { text: 'Decision Tree', link: '/examples/decision-tree' },
            { text: 'Basic Pipeline', link: '/examples/basic-pipeline' },
            { text: 'Data Fetching', link: '/examples/data-fetching' },
            { text: 'Contract Testing', link: '/examples/contract-testing' },
            { text: 'Business Rules', link: '/examples/business-rules' },
          ],
        },
      ],
      '/troubleshooting/': [
        {
          text: 'Troubleshooting',
          items: [
            { text: 'Common Issues', link: '/troubleshooting/' },
            { text: 'Error Enhancement', link: '/troubleshooting/error-enhancement' },
          ],
        },
      ],
      '/api-reference/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api-reference/' },
            { text: 'Modules', link: '/api-reference/modules' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/sovanaryththorng/sanzoku-labs/kairo' },
    ],
  },
})
