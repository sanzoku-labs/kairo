import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Kairo',
  description: 'Clean Three-Pillar TypeScript Library - 23 methods, Configuration objects, Zero dependencies',
  cleanUrls: true,
  base: '/kairo/',

  head: [
    ['meta', { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/kairo/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#3c82f6' }],
    ['meta', { property: 'og:title', content: 'Kairo - Clean Three-Pillar TypeScript Library' }],
    ['meta', { property: 'og:description', content: '23 methods across SERVICE, DATA, and PIPELINE pillars. Configuration objects everywhere. Zero dependencies.' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:url', content: 'https://sanzoku-labs.github.io/kairo/' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'Kairo - Clean Three-Pillar TypeScript Library' }],
    ['meta', { name: 'twitter:description', content: '23 methods across SERVICE, DATA, and PIPELINE pillars. Configuration objects everywhere. Zero dependencies.' }],
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
    logo: '/logo.svg',
    siteTitle: 'Kairo',
    
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'API Reference', link: '/api/' },
      { text: 'Examples', link: '/examples/' },
      { text: 'Migration', link: '/migration/' },
      { text: 'GitHub', link: 'https://github.com/sanzoku-labs/kairo' },
    ],

    editLink: {
      pattern: 'https://github.com/sanzoku-labs/kairo/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },

    search: {
      provider: 'local'
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 Sovanaryth THORNG'
    },

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is Kairo?', link: '/guide/' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Quick Start', link: '/guide/quick-start' },
          ],
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Three-Pillar Architecture', link: '/guide/architecture' },
            { text: 'Configuration Objects', link: '/guide/configuration' },
            { text: 'Result Pattern', link: '/guide/result-pattern' },
            { text: 'Error Handling', link: '/guide/error-handling' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Result Pattern', link: '/api/result' },
            { text: 'Schema System', link: '/api/schema' },
          ],
        },
        {
          text: '🏛️ Three Pillars',
          collapsed: false,
          items: [
            {
              text: '🔗 SERVICE Pillar',
              items: [
                { text: 'Overview', link: '/api/service/' },
                { text: 'HTTP Methods', link: '/api/service/methods' },
                { text: 'Configuration', link: '/api/service/config' },
                { text: 'Utilities', link: '/api/service/utils' },
              ],
            },
            {
              text: '📊 DATA Pillar',
              items: [
                { text: 'Overview', link: '/api/data/' },
                { text: 'Schema & Validation', link: '/api/data/schema' },
                { text: 'Transformation', link: '/api/data/transform' },
                { text: 'Aggregation', link: '/api/data/aggregate' },
                { text: 'Serialization', link: '/api/data/serialize' },
              ],
            },
            {
              text: '⚡ PIPELINE Pillar',
              items: [
                { text: 'Overview', link: '/api/pipeline/' },
                { text: 'Composition', link: '/api/pipeline/compose' },
                { text: 'Data Flow', link: '/api/pipeline/flow' },
                { text: 'Branching', link: '/api/pipeline/branch' },
                { text: 'Parallel Processing', link: '/api/pipeline/parallel' },
              ],
            },
          ],
        },
        {
          text: '🔧 Utilities',
          collapsed: true,
          items: [
            { text: 'Functional Programming', link: '/api/fp-utils' },
            { text: 'Type Utilities', link: '/api/type-utils' },
          ],
        },
      ],
      '/examples/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Overview', link: '/examples/' },
            { text: 'Basic Usage', link: '/examples/basic-usage' },
            { text: 'Common Patterns', link: '/examples/common-patterns' },
          ],
        },
        {
          text: 'Real-World Examples',
          items: [
            { text: 'API Client', link: '/examples/api-client' },
            { text: 'Data Processing', link: '/examples/data-processing' },
            { text: 'Complex Workflows', link: '/examples/workflows' },
            { text: 'Cross-Pillar Integration', link: '/examples/integration' },
          ],
        },
        {
          text: 'Advanced Patterns',
          items: [
            { text: 'Error Recovery', link: '/examples/error-recovery' },
            { text: 'Performance Optimization', link: '/examples/performance' },
            { text: 'Testing Strategies', link: '/examples/testing' },
          ],
        },
      ],
      '/migration/': [
        {
          text: 'Migration Guide',
          items: [
            { text: 'Overview', link: '/migration/' },
            { text: 'From Axios', link: '/migration/from-axios' },
            { text: 'From Lodash', link: '/migration/from-lodash' },
            { text: 'From Zod', link: '/migration/from-zod' },
            { text: 'From RxJS', link: '/migration/from-rxjs' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/sanzoku-labs/kairo' },
    ],
  },
})
