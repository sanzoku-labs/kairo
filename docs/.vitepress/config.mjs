import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Kairo',
  description: 'A functional, composable TypeScript library that eliminates glue code',
  cleanUrls: true,
  
  head: [
    ['meta', { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }]
  ],
  
  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    lineNumbers: true,
    languages: ['typescript', 'javascript', 'bash', 'json']
  },
  
  vite: {
    server: {
      host: true,
      port: 5173
    }
  },
  
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'API', link: '/api/' },
      { text: 'Examples', link: '/examples/' },
      { text: 'GitHub', link: 'https://github.com/sovanaryththorng/kairo' }
    ],
    
    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is Kairo?', link: '/guide/' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Core Concepts', link: '/guide/concepts' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Pipeline', link: '/api/pipeline' },
            { text: 'Result', link: '/api/result' },
            { text: 'Schema', link: '/api/schema' }
          ]
        },
        {
          text: 'Reactive Primitives',
          items: [
            { text: 'Signal', link: '/api/signal' },
            { text: 'Task', link: '/api/task' },
            { text: 'Form', link: '/api/form' }
          ]
        },
        {
          text: 'Resource Management',
          items: [
            { text: 'Resource', link: '/api/resource' }
          ]
        }
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Overview', link: '/examples/' },
            { text: 'Basic Pipeline', link: '/examples/basic-pipeline' },
            { text: 'Data Fetching', link: '/examples/data-fetching' },
            { text: 'Reactive State', link: '/examples/reactive-state' }
          ]
        }
      ]
    },
    
    socialLinks: [
      { icon: 'github', link: 'https://github.com/sovanaryththorng/kairo' }
    ]
  }
})