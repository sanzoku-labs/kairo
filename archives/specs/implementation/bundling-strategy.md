# Bundling Strategy ✅ IMPLEMENTED

> **Tree-shaking, entry points, and bundle optimization for Kairo V2**  
> **Status: ✅ Bundle architecture implemented and optimized**

## Overview ✅ Implementation Complete

Kairo V2 is designed for maximum tree-shaking efficiency, allowing developers to import only the functionality they need. This document outlines the bundling strategy, entry points, and optimization techniques.

**Implementation Status**: ✅ **Bundle architecture implemented with optimal tree-shaking**

## ✅ Bundle Architecture Goals - ACHIEVED

### **✅ Size Targets - ACHIEVED**

```
Individual Pillars:
├─ SERVICE only:     <15KB gzipped
├─ DATA only:        <20KB gzipped
├─ PIPELINE only:    <10KB gzipped
└─ Core utilities:   <5KB gzipped

Combined Usage:
├─ Any two pillars:  <30KB gzipped
├─ All three pillars: <45KB gzipped
└─ Full featured:    <50KB gzipped (including advanced features)

Development vs Production:
├─ Development:      Include debug utilities, type checking
├─ Production:       Optimized, minified, tree-shaken
└─ Critical path:    <10KB for essential operations
```

## Entry Point Strategy

### **Package.json Configuration**

```json
{
  "name": "kairo",
  "version": "2.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.esm.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.esm.js",
      "require": "./dist/index.cjs.js",
      "types": "./dist/index.d.ts"
    },
    "./service": {
      "import": "./dist/service/index.esm.js",
      "require": "./dist/service/index.cjs.js",
      "types": "./dist/service/index.d.ts"
    },
    "./data": {
      "import": "./dist/data/index.esm.js",
      "require": "./dist/data/index.cjs.js",
      "types": "./dist/data/index.d.ts"
    },
    "./pipeline": {
      "import": "./dist/pipeline/index.esm.js",
      "require": "./dist/pipeline/index.cjs.js",
      "types": "./dist/pipeline/index.d.ts"
    },
    "./core": {
      "import": "./dist/core/index.esm.js",
      "require": "./dist/core/index.cjs.js",
      "types": "./dist/core/index.d.ts"
    },
    "./types": {
      "types": "./dist/types/index.d.ts"
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "sideEffects": false
}
```

### **Import Patterns**

```typescript
// Full library import (not recommended for production)
import { service, data, pipeline } from 'kairo'

// Pillar-specific imports (recommended)
import { service } from 'kairo/service'
import { data } from 'kairo/data'
import { pipeline } from 'kairo/pipeline'

// Method-specific imports (most optimized)
import { get, post } from 'kairo/service'
import { validate, transform } from 'kairo/data'
import { map, filter } from 'kairo/pipeline'

// Core utilities only
import { Result } from 'kairo/core'
import type { ServiceError, ValidationError } from 'kairo/types'

// Advanced/optional features (lazy loaded)
import { aggregate } from 'kairo/data/aggregation'
import { stream } from 'kairo/service/streaming'
import { parallel } from 'kairo/pipeline/advanced'
```

## Build Configuration

### **Rollup Configuration**

```javascript
// rollup.config.js
import { defineConfig } from 'rollup'
import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

const createConfig = (input, outputDir, format) => ({
  input,
  output: {
    dir: `dist/${outputDir}`,
    format,
    entryFileNames: format === 'es' ? '[name].esm.js' : '[name].cjs.js',
    chunkFileNames: format === 'es' ? '[name]-[hash].esm.js' : '[name]-[hash].cjs.js',
    sourcemap: true,
  },
  plugins: [
    nodeResolve(),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.build.json',
      outDir: `dist/${outputDir}`,
      declaration: format === 'es', // Only generate types for ESM
      declarationDir: format === 'es' ? `dist/${outputDir}` : undefined,
    }),
    terser({
      compress: {
        pure_getters: true,
        unsafe: true,
        unsafe_comps: true,
        warnings: false,
      },
    }),
  ],
  external: [], // No external dependencies
  treeshake: {
    moduleSideEffects: false,
    propertyReadSideEffects: false,
    unknownGlobalSideEffects: false,
  },
})

export default defineConfig([
  // Main entry point
  createConfig('src/index.ts', '.', 'es'),
  createConfig('src/index.ts', '.', 'cjs'),

  // Individual pillars
  createConfig('src/service/index.ts', 'service', 'es'),
  createConfig('src/service/index.ts', 'service', 'cjs'),
  createConfig('src/data/index.ts', 'data', 'es'),
  createConfig('src/data/index.ts', 'data', 'cjs'),
  createConfig('src/pipeline/index.ts', 'pipeline', 'es'),
  createConfig('src/pipeline/index.ts', 'pipeline', 'cjs'),

  // Core utilities
  createConfig('src/core/index.ts', 'core', 'es'),
  createConfig('src/core/index.ts', 'core', 'cjs'),

  // Advanced features (separate bundles)
  createConfig('src/data/aggregation/index.ts', 'data/aggregation', 'es'),
  createConfig('src/service/streaming/index.ts', 'service/streaming', 'es'),
  createConfig('src/pipeline/advanced/index.ts', 'pipeline/advanced', 'es'),
])
```

### **TypeScript Configuration**

```json
// tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": true,
    "importHelpers": false,
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "lib": ["ES2020", "DOM"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src/**/*"],
  "exclude": [
    "src/**/*.test.ts",
    "src/**/*.spec.ts",
    "src/**/__tests__/**/*",
    "src/**/__fixtures__/**/*"
  ]
}
```

## Source Code Structure for Optimal Bundling

### **Directory Organization**

```
src/
├── index.ts                 # Main entry (re-exports all pillars)
├── core/                    # Core utilities (shared across pillars)
│   ├── index.ts            # Core exports
│   ├── result.ts           # Result type (reused from V1)
│   ├── errors.ts           # Error types
│   └── types.ts            # Common type definitions
├── service/                 # SERVICE pillar
│   ├── index.ts            # Main service exports
│   ├── core/               # Core HTTP functionality
│   │   ├── client.ts       # HTTP client
│   │   ├── cache.ts        # Caching logic
│   │   └── retry.ts        # Retry logic
│   ├── methods/            # HTTP methods
│   │   ├── get.ts
│   │   ├── post.ts
│   │   ├── put.ts
│   │   ├── patch.ts
│   │   └── delete.ts
│   ├── advanced/           # Advanced features (separate bundle)
│   │   ├── index.ts
│   │   ├── batch.ts
│   │   └── upload.ts
│   └── streaming/          # Streaming (separate bundle)
│       ├── index.ts
│       └── stream.ts
├── data/                    # DATA pillar
│   ├── index.ts            # Main data exports
│   ├── core/               # Core validation
│   │   ├── schema.ts       # Schema creation
│   │   ├── validate.ts     # Validation logic
│   │   └── transform.ts    # Transformation
│   ├── aggregation/        # Aggregation (separate bundle)
│   │   ├── index.ts
│   │   ├── aggregate.ts
│   │   ├── group.ts
│   │   └── pivot.ts
│   └── analysis/           # Analysis (separate bundle)
│       ├── index.ts
│       └── analyze.ts
├── pipeline/               # PIPELINE pillar
│   ├── index.ts            # Main pipeline exports
│   ├── core/               # Core transformations
│   │   ├── map.ts
│   │   ├── filter.ts
│   │   ├── reduce.ts
│   │   └── flatMap.ts
│   ├── compose/            # Composition logic
│   │   ├── compose.ts
│   │   └── chain.ts
│   └── advanced/           # Advanced features (separate bundle)
│       ├── index.ts
│       ├── parallel.ts
│       ├── branch.ts
│       └── retry.ts
└── types/                  # Type definitions only
    ├── index.ts            # All type exports
    ├── service.ts          # Service types
    ├── data.ts             # Data types
    └── pipeline.ts         # Pipeline types
```

### **Entry Point Files**

```typescript
// src/index.ts - Main entry
export * from './service'
export * from './data'
export * from './pipeline'
export * from './core'

// src/service/index.ts - SERVICE pillar entry
export { get, post, put, patch, delete as del } from './methods'
export { configure, create } from './core'
export type { ServiceOptions, ServiceError } from './types'

// Individual method exports for tree-shaking
export { get } from './methods/get'
export { post } from './methods/post'
// ... etc

// src/data/index.ts - DATA pillar entry
export { schema, validate, partial, transform } from './core'
export { serialize, deserialize } from './serialization'
export type { ValidationOptions, ValidationError } from './types'

// Core methods only (aggregation in separate bundle)
export { validate } from './core/validate'
export { transform } from './core/transform'
// ... etc

// src/pipeline/index.ts - PIPELINE pillar entry
export { map, filter, reduce, flatMap } from './core'
export { compose, chain } from './compose'
export type { PipelineOptions, PipelineError } from './types'

// Individual exports
export { map } from './core/map'
export { filter } from './core/filter'
// ... etc
```

## Tree-Shaking Optimization

### **Function-Level Exports**

```typescript
// ✅ Good: Individual function exports for optimal tree-shaking
// src/service/methods/get.ts
export const get = async <T>(
  url: string,
  options?: ServiceOptions
): Promise<Result<ServiceError, T>> => {
  // Implementation
}

// src/service/methods/post.ts
export const post = async <T, U>(
  url: string,
  body: T,
  options?: ServiceOptions
): Promise<Result<ServiceError, U>> => {
  // Implementation
}

// ❌ Bad: Object exports (harder to tree-shake)
// src/service/methods/index.ts
export const methods = {
  get: async () => {
    /* ... */
  },
  post: async () => {
    /* ... */
  },
  put: async () => {
    /* ... */
  },
}
```

### **Conditional Feature Loading**

```typescript
// Dynamic imports for optional features
export const loadAggregation = async () => {
  const { aggregate, groupBy, pivot } = await import('./aggregation')
  return { aggregate, groupBy, pivot }
}

export const loadStreaming = async () => {
  const { stream } = await import('./streaming')
  return { stream }
}

// Usage with lazy loading
const processLargeDataset = async (data: unknown[]) => {
  if (data.length > 10000) {
    const { aggregate } = await loadAggregation()
    return aggregate(data, { groupBy: ['category'] })
  } else {
    // Use regular processing for small datasets
    return pipeline.map(data, transform)
  }
}
```

### **Side-Effect-Free Code**

```typescript
// ✅ Good: Pure functions with no side effects
export const validateUser = (input: unknown): Result<ValidationError, User> => {
  // Pure validation logic
  return data.validate(input, UserSchema)
}

// ✅ Good: Side effects clearly marked
export const setupGlobalErrorHandler = (): void => {
  // Side effect: Global setup
  window.addEventListener('unhandledrejection', handleError)
}

// ❌ Bad: Hidden side effects
export const createUserSchema = () => {
  // Hidden side effect: Global registration
  globalSchemaRegistry.register('user', schema)
  return schema
}
```

## Bundle Analysis and Monitoring

### **Bundle Size Analysis**

```javascript
// scripts/analyze-bundle.js
import { rollup } from 'rollup'
import { gzipSize } from 'gzip-size'
import { visualizer } from 'rollup-plugin-visualizer'

const analyzeBundles = async () => {
  const configs = [
    { input: 'src/service/index.ts', name: 'service' },
    { input: 'src/data/index.ts', name: 'data' },
    { input: 'src/pipeline/index.ts', name: 'pipeline' },
    { input: 'src/index.ts', name: 'full' },
  ]

  for (const config of configs) {
    const bundle = await rollup({
      input: config.input,
      plugins: [
        typescript(),
        terser(),
        visualizer({
          filename: `bundle-analysis/${config.name}.html`,
          open: false,
          gzipSize: true,
        }),
      ],
    })

    const { output } = await bundle.generate({
      format: 'es',
      sourcemap: false,
    })

    const code = output[0].code
    const size = Buffer.byteLength(code, 'utf8')
    const gzipped = await gzipSize(code)

    console.log(`${config.name}: ${size} bytes (${gzipped} gzipped)`)

    // Fail build if size exceeds targets
    const targets = {
      service: 15 * 1024,
      data: 20 * 1024,
      pipeline: 10 * 1024,
      full: 50 * 1024,
    }

    if (gzipped > targets[config.name]) {
      throw new Error(
        `Bundle ${config.name} exceeds size target: ${gzipped} > ${targets[config.name]}`
      )
    }
  }
}

analyzeBundles().catch(console.error)
```

### **Tree-Shaking Validation**

```typescript
// scripts/validate-treeshaking.ts
import { rollup } from 'rollup'

const validateTreeShaking = async () => {
  // Test that importing only one method doesn't pull in others
  const testCases = [
    {
      input: `import { get } from 'kairo/service'; export { get }`,
      shouldNotInclude: ['post', 'put', 'patch', 'delete'],
    },
    {
      input: `import { validate } from 'kairo/data'; export { validate }`,
      shouldNotInclude: ['aggregate', 'transform', 'serialize'],
    },
    {
      input: `import { map } from 'kairo/pipeline'; export { map }`,
      shouldNotInclude: ['filter', 'reduce', 'parallel'],
    },
  ]

  for (const testCase of testCases) {
    // Create temporary file
    const tempFile = `temp-${Date.now()}.js`
    writeFileSync(tempFile, testCase.input)

    try {
      const bundle = await rollup({
        input: tempFile,
        plugins: [nodeResolve(), typescript()],
      })

      const { output } = await bundle.generate({ format: 'es' })
      const code = output[0].code

      // Check that excluded functions are not in the bundle
      for (const excluded of testCase.shouldNotInclude) {
        if (code.includes(excluded)) {
          throw new Error(
            `Tree-shaking failed: ${excluded} was included when importing ${testCase.input}`
          )
        }
      }

      console.log(`✓ Tree-shaking validated for: ${testCase.input}`)
    } finally {
      unlinkSync(tempFile)
    }
  }
}
```

## Development vs Production Builds

### **Development Configuration**

```typescript
// Development builds include debugging utilities
const developmentConfig = {
  define: {
    'process.env.NODE_ENV': '"development"',
    __DEBUG__: 'true',
    __VERSION__: `"${packageJson.version}"`,
  },
  plugins: [
    // Include source maps and debugging
    typescript({ sourceMap: true }),
    // Don't minify in development
  ],
  output: {
    sourcemap: true,
    format: 'es',
  },
}

// Development-only utilities
export const debugUtils = __DEBUG__
  ? {
      logValidation: (input: unknown, schema: Schema<any>, result: Result<any, any>) => {
        console.group(`Validation: ${schema.name || 'unnamed'}`)
        console.log('Input:', input)
        console.log('Result:', result)
        console.groupEnd()
      },
      traceExecution: (operation: string, duration: number) => {
        console.log(`${operation} took ${duration}ms`)
      },
    }
  : {}
```

### **Production Configuration**

```typescript
// Production builds are optimized for size and performance
const productionConfig = {
  define: {
    'process.env.NODE_ENV': '"production"',
    __DEBUG__: 'false',
    __VERSION__: `"${packageJson.version}"`,
  },
  plugins: [
    typescript({ sourceMap: false }),
    terser({
      compress: {
        dead_code: true,
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.warn'],
      },
      mangle: {
        toplevel: true,
        safari10: true,
      },
    }),
  ],
  output: {
    sourcemap: false,
    format: 'es',
  },
}
```

## Bundle Delivery Strategy

### **CDN Distribution**

```html
<!-- ESM from CDN -->
<script type="module">
  import { service } from 'https://cdn.jsdelivr.net/npm/kairo@2/service'
  import { data } from 'https://cdn.jsdelivr.net/npm/kairo@2/data'

  // Use Kairo in browser
  const users = await service.get('/api/users')
  const validated = data.validate(users, UserSchema)
</script>

<!-- UMD fallback -->
<script src="https://cdn.jsdelivr.net/npm/kairo@2/dist/kairo.umd.js"></script>
<script>
  const { service, data } = window.Kairo
</script>
```

### **Package Registry Configuration**

```json
// .npmrc
registry=https://registry.npmjs.org/
tag-version-prefix=""
message="Release v%s"

// For private registries
@company:registry=https://npm.company.com/
```

## Best Practices

### **1. Minimize Bundle Boundaries**

```typescript
// ✅ Good: Keep related functionality together
// src/service/http-client.ts
export class HttpClient {
  get() {
    /* ... */
  }
  post() {
    /* ... */
  }
  // All HTTP methods in one cohesive module
}

// ❌ Bad: Artificially split related code
// src/service/get.ts, src/service/post.ts (separate files for simple methods)
```

### **2. Use Barrel Exports Carefully**

```typescript
// ✅ Good: Selective re-exports
// src/service/index.ts
export { get } from './methods/get'
export { post } from './methods/post'
export type { ServiceOptions } from './types'

// ❌ Bad: Blanket re-exports
// src/service/index.ts
export * from './methods' // Imports everything
```

### **3. Lazy Load Advanced Features**

```typescript
// ✅ Good: Dynamic imports for optional features
const withAggregation = async (data: unknown[]) => {
  if (data.length > 1000) {
    const { aggregate } = await import('kairo/data/aggregation')
    return aggregate(data, options)
  }
  return simpleProcess(data)
}

// ❌ Bad: Always import advanced features
import { aggregate } from 'kairo/data/aggregation'
const withAggregation = (data: unknown[]) => {
  if (data.length > 1000) {
    return aggregate(data, options)
  }
  return simpleProcess(data)
}
```

### **4. Monitor Bundle Size Continuously**

```javascript
// CI/CD bundle size monitoring
const checkBundleSize = () => {
  const maxSizes = {
    'kairo/service': 15 * 1024,
    'kairo/data': 20 * 1024,
    'kairo/pipeline': 10 * 1024,
  }

  // Fail CI if any bundle exceeds limits
  Object.entries(maxSizes).forEach(([pkg, limit]) => {
    const size = getBundleSize(pkg)
    if (size > limit) {
      process.exit(1)
    }
  })
}
```

---

**This bundling strategy ensures optimal tree-shaking, minimal bundle sizes, and flexible deployment options while maintaining excellent developer experience.**
