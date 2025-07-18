# Installation

This guide covers how to install and set up Kairo in your TypeScript project.

## Prerequisites

- **Node.js** 16.0.0 or higher
- **TypeScript** 4.8.0 or higher (for full type inference)
- **Package Manager** npm, yarn, or bun

## Installation

### Basic Installation

::: code-group

```bash [npm]
npm install kairo
```

```bash [yarn]
yarn add kairo
```

```bash [bun]
bun add kairo
```

:::

### Development Dependencies

For the best development experience, also install:

::: code-group

```bash [npm]
npm install --save-dev typescript @types/node
```

```bash [yarn]
yarn add --dev typescript @types/node
```

```bash [bun]
bun add --dev typescript @types/node
```

:::

## TypeScript Configuration

Kairo works best with modern TypeScript settings. Update your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "lib": ["ES2020", "DOM"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Import Styles

Kairo supports multiple import styles:

### Named Imports (Recommended)

```typescript
import { service, data, pipeline, Result } from 'kairo'

// Use the pillars
const users = await service.get('/api/users')
const schema = data.schema({ name: { type: 'string' } })
const processor = pipeline.compose([...])
```

### Selective Imports

```typescript
// Import only what you need
import { service, Result } from 'kairo'

// Or import specific pillars
import { data } from 'kairo'
import type { DataValidationOptions } from 'kairo'
```

### Type-Only Imports

```typescript
// For type annotations only
import type { 
  ServiceResult, 
  DataResult, 
  PipelineResult,
  Schema,
  InferSchema
} from 'kairo'
```

## Bundle Size Optimization

Kairo is designed to be tree-shakable. Modern bundlers will only include what you use:

```typescript
// Only includes service pillar code
import { service } from 'kairo'

// Only includes specific utilities
import { Result } from 'kairo'
```

### Bundle Analysis

With webpack-bundle-analyzer:

```bash
npm install --save-dev webpack-bundle-analyzer
```

Expected bundle sizes:
- **Full library**: ~15KB gzipped
- **Service only**: ~5KB gzipped  
- **Data only**: ~8KB gzipped
- **Pipeline only**: ~6KB gzipped

## Framework Integration

### Node.js

```typescript
// server.ts
import { service, data, pipeline, Result } from 'kairo'

const app = express()

app.get('/api/users', async (req, res) => {
  const result = await service.get('https://api.example.com/users')
  
  if (Result.isOk(result)) {
    res.json(result.value)
  } else {
    res.status(500).json({ error: result.error.message })
  }
})
```

### React

```typescript
// hooks/useApi.ts
import { service, Result } from 'kairo'
import { useState, useEffect } from 'react'

export const useApi = <T>(url: string) => {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const result = await service.get(url)
      
      if (Result.isOk(result)) {
        setData(result.value)
        setError(null)
      } else {
        setError(result.error.message)
      }
      
      setLoading(false)
    }

    fetchData()
  }, [url])

  return { data, loading, error }
}
```

### Vue 3

```typescript
// composables/useApi.ts
import { service, Result } from 'kairo'
import { ref, computed } from 'vue'

export const useApi = <T>(url: string) => {
  const data = ref<T | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  const fetchData = async () => {
    loading.value = true
    const result = await service.get(url)
    
    if (Result.isOk(result)) {
      data.value = result.value
      error.value = null
    } else {
      error.value = result.error.message
    }
    
    loading.value = false
  }

  const isLoading = computed(() => loading.value)
  const hasError = computed(() => error.value !== null)

  return { data, loading: isLoading, error: hasError, fetchData }
}
```

### Next.js

```typescript
// pages/api/users.ts
import { service, Result } from 'kairo'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const result = await service.get('https://api.example.com/users', {
    timeout: 5000,
    retry: { attempts: 3 }
  })

  if (Result.isOk(result)) {
    res.status(200).json(result.value)
  } else {
    res.status(500).json({ error: result.error.message })
  }
}
```

## Environment Setup

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Type checking
npm run type-check
```

### Production

```bash
# Build for production
npm run build

# Run production server
npm start
```

## Common Issues

### TypeScript Errors

**Issue**: `Cannot find module 'kairo'`
**Solution**: Ensure TypeScript can resolve the module:

```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true
  }
}
```

**Issue**: Type inference not working
**Solution**: Update TypeScript to 4.8.0 or higher:

```bash
npm update typescript
```

### Bundle Issues

**Issue**: Large bundle size
**Solution**: Use tree-shaking compatible bundler and import only what you need:

```typescript
// ✅ Good - tree-shakable
import { service } from 'kairo'

// ❌ Bad - imports everything
import * as kairo from 'kairo'
```

**Issue**: Module not found in browser
**Solution**: Ensure your bundler supports ESM:

```javascript
// webpack.config.js
module.exports = {
  resolve: {
    extensions: ['.ts', '.js', '.mjs']
  }
}
```

## Verification

Verify your installation works:

```typescript
// test-install.ts
import { service, data, pipeline, Result } from 'kairo'

// Test basic functionality
const testSchema = data.schema({
  test: { type: 'string' }
})

const testPipeline = pipeline.compose([
  (data) => pipeline.map(data, x => x.toUpperCase())
])

console.log('✅ Kairo installed successfully!')
console.log('Schema:', testSchema)
console.log('Pipeline:', testPipeline)
```

Run the test:

```bash
npx ts-node test-install.ts
```

## Next Steps

Now that Kairo is installed:

1. **[Quick Start](/guide/quick-start)** - Build your first application
2. **[Architecture](/guide/architecture)** - Understand the three pillars
3. **[Examples](/examples/)** - Explore real-world usage patterns
4. **[API Reference](/api/)** - Complete method documentation

## Getting Help

If you encounter issues:

- **GitHub Issues**: [Report bugs or request features](https://github.com/sanzoku-labs/kairo/issues)
- **Discussions**: [Community support](https://github.com/sanzoku-labs/kairo/discussions)
- **Documentation**: [Full API reference](/api/)

## Version Compatibility

| Kairo Version | Node.js | TypeScript | Status |
|---------------|---------|------------|---------|
| 1.x           | >=16.0  | >=4.8      | ✅ Active |
| 0.x           | >=14.0  | >=4.5      | ⚠️ Legacy |

Always use the latest version for the best experience and security updates.