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
      { text: 'Guide', link: '/guide/' },
      { text: 'API', link: '/api/' },
      { text: 'API Reference', link: '/api-reference/' },
      { text: 'Examples', link: '/examples/' },
      { text: 'GitHub', link: 'https://github.com/sovanaryththorng/sanzoku-labs/kairo' },
    ],

    sidebar: {
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
            { text: 'Basic Pipeline', link: '/examples/basic-pipeline' },
            { text: 'Data Fetching', link: '/examples/data-fetching' },
            { text: 'Contract Testing', link: '/examples/contract-testing' },
            { text: 'Business Rules', link: '/examples/business-rules' },
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
