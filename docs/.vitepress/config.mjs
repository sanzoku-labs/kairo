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
      { text: 'GitHub', link: 'https://github.com/sovanaryththorng/kairo' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is Kairo?', link: '/guide/' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Core Concepts', link: '/guide/concepts' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'Core Foundation',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Result', link: '/api/result' },
            { text: 'Schema', link: '/api/schema' },
          ],
        },
        {
          text: 'Pillar 1: Resources',
          items: [
            { text: 'Resource', link: '/api/resource' },
            { text: 'Contract Testing', link: '/api/contract' },
          ],
        },
        {
          text: 'Pillar 2: Pipelines',
          items: [{ text: 'Pipeline', link: '/api/pipeline' }],
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
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/sovanaryththorng/kairo' }],
  },
})
