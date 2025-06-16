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
          items: [{ text: 'Overview', link: '/api/' }],
        },
        {
          text: '🚀 Core Foundation',
          items: [{ text: 'Result Pattern', link: '/api/result' }],
        },
        {
          text: '🔗 INTERFACE Pillar',
          items: [
            { text: 'Resource API', link: '/api/resource' },
            { text: 'Contract Testing', link: '/api/contract' },
          ],
        },
        {
          text: '⚡ PROCESS Pillar',
          items: [
            { text: 'Pipeline API', link: '/api/pipeline' },
            { text: 'Business Rules API', link: '/api/rules' },
            { text: 'Workflow API', link: '/api/workflow' },
          ],
        },
        {
          text: '🛡️ DATA Pillar',
          items: [
            { text: 'Native Schema API', link: '/api/schema' },
            { text: 'Transform API', link: '/api/transform' },
            { text: 'Repository API', link: '/api/repository' },
          ],
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
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/sovanaryththorng/sanzoku-labs/kairo' },
    ],
  },
})
