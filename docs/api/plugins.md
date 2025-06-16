# Plugin API

The Plugin API provides an extensible plugin architecture that integrates seamlessly with all three pillars of Kairo: INTERFACE, PROCESS, and DATA.

## Core Concepts

Plugins in Kairo extend the functionality of the platform by providing hooks into the three-pillar architecture. They can modify requests, add pipeline steps, extend schemas, provide storage adapters, and much more.

## Creating Plugins

```typescript
import { createPlugin } from 'kairo/plugins'

const authPlugin = createPlugin('auth', {
  metadata: {
    version: '1.2.0',
    description: 'Authentication plugin for Kairo applications',
    author: 'Kairo Team',
    dependencies: ['logging'], // Other plugins this depends on
    tags: ['security', 'authentication'],
  },

  // Configuration schema for the plugin
  configSchema: {
    apiKey: { type: 'string', required: true },
    timeout: { type: 'number', default: 5000 },
    retries: { type: 'number', default: 3 },
  },

  // Default configuration
  defaultConfig: {
    timeout: 5000,
    retries: 3,
  },

  // Lifecycle hooks
  onLoad: async config => {
    console.log('Auth plugin loading with config:', config)
    await initializeAuthService(config)
  },

  onUnload: async () => {
    console.log('Auth plugin unloading')
    await cleanupAuthService()
  },

  // Health check for monitoring
  healthCheck: async () => {
    const isHealthy = await validateAuthService()
    return {
      healthy: isHealthy,
      message: isHealthy ? 'Auth service operational' : 'Auth service unavailable',
    }
  },
})
```

## INTERFACE Pillar Hooks

### Resource Hooks

```typescript
const authPlugin = createPlugin('auth', {
  // Hook into resource operations
  resourceHooks: {
    // Modify requests before they're sent
    beforeRequest: async (request, context) => {
      const token = await getAuthToken(context.config.apiKey)
      return {
        ...request,
        headers: {
          ...request.headers,
          Authorization: `Bearer ${token}`,
        },
      }
    },

    // Process responses after they're received
    afterResponse: async (response, request, context) => {
      // Log successful API calls
      console.log(`API call successful: ${request.method} ${request.url}`)
      return response
    },

    // Handle API errors
    onError: async (error, request, context) => {
      if (error.status === 401) {
        // Token expired, refresh and retry
        await refreshAuthToken(context.config.apiKey)
        return { retry: true }
      }

      if (error.status >= 500) {
        // Server error, log and continue
        console.error(`Server error: ${error.status} ${error.message}`)
        return { error }
      }

      return { error }
    },

    // Validate responses
    validateResponse: async (response, schema, context) => {
      // Additional validation beyond schema
      if (response.data.permissions) {
        const hasPermission = await checkPermissions(response.data.permissions, context.user)
        if (!hasPermission) {
          throw new PermissionError('Insufficient permissions')
        }
      }
      return response
    },
  },
})
```

### Contract Testing Hooks

```typescript
const validationPlugin = createPlugin('validation', {
  contractHooks: {
    // Add custom contract tests
    beforeContractTest: async (operation, context) => {
      console.log(`Testing contract for: ${operation.name}`)
      return operation
    },

    // Validate contract test results
    afterContractTest: async (result, operation, context) => {
      if (!result.passed) {
        await notifyDevTeam({
          operation: operation.name,
          errors: result.errors,
        })
      }
      return result
    },

    // Custom contract validation rules
    customValidators: {
      responseTime: {
        validate: async (response, operation) => {
          return response.duration < 2000 // Max 2 seconds
        },
        message: 'Response time must be under 2 seconds',
      },

      securityHeaders: {
        validate: async (response, operation) => {
          const headers = response.headers
          return headers['x-frame-options'] && headers['x-content-type-options']
        },
        message: 'Security headers must be present',
      },
    },
  },
})
```

## PROCESS Pillar Hooks

### Pipeline Hooks

```typescript
const auditPlugin = createPlugin('audit', {
  pipelineHooks: {
    // Execute before pipeline starts
    beforeExecute: async (input, context) => {
      const auditId = await auditService.startAudit({
        pipeline: context.pipelineName,
        user: context.user,
        input: sanitizeForAudit(input),
      })

      return {
        ...input,
        auditId,
      }
    },

    // Execute after pipeline completes
    afterExecute: async (result, input, context) => {
      await auditService.completeAudit({
        auditId: input.auditId,
        result: result.tag === 'Ok' ? 'success' : 'failure',
        output: result.tag === 'Ok' ? sanitizeForAudit(result.value) : null,
        error: result.tag === 'Err' ? result.error.message : null,
      })

      return result
    },

    // Handle pipeline errors
    onError: async (error, input, context) => {
      await auditService.recordError({
        auditId: input.auditId,
        error: error.message,
        stack: error.stack,
      })

      return error
    },

    // Intercept individual pipeline steps
    beforeStep: async (stepName, stepInput, context) => {
      console.log(`Executing step: ${stepName}`)
      return stepInput
    },

    afterStep: async (stepName, stepResult, stepInput, context) => {
      console.log(`Step ${stepName} completed`)
      return stepResult
    },
  },
})
```

### Custom Pipeline Steps

```typescript
const utilityPlugin = createPlugin('utility', {
  // Add custom pipeline steps
  pipelineSteps: {
    // Audit logging step
    auditLog: (action: string) => async (data, context) => {
      await auditService.log({
        action,
        data: sanitizeForAudit(data),
        user: context.user,
        timestamp: new Date().toISOString(),
      })
      return data
    },

    // Data validation step
    validateBusinessRules: (rules: string[]) => async (data, context) => {
      for (const rule of rules) {
        const validator = businessRuleValidators[rule]
        if (validator && !(await validator(data, context))) {
          throw new BusinessRuleError(`Validation failed for rule: ${rule}`)
        }
      }
      return data
    },

    // Rate limiting step
    rateLimit: (limit: number, window: number) => async (data, context) => {
      const key = `rate_limit:${context.user?.id || 'anonymous'}`
      const current = await redisClient.incr(key)

      if (current === 1) {
        await redisClient.expire(key, window)
      }

      if (current > limit) {
        throw new RateLimitError(`Rate limit exceeded: ${limit} per ${window}s`)
      }

      return data
    },

    // Async notification step
    notify: (channels: string[]) => async (data, context) => {
      await Promise.all(
        channels.map(channel =>
          notificationService.send(channel, {
            data: sanitizeForNotification(data),
            user: context.user,
          })
        )
      )
      return data
    },
  },
})
```

### Business Rules Extensions

```typescript
const compliancePlugin = createPlugin('compliance', {
  businessRules: {
    // GDPR compliance rule
    gdprCompliance: {
      validate: async (data, context) => {
        if (data.personalData && !data.gdprConsent) {
          return false
        }
        return true
      },
      message: 'GDPR consent required for personal data processing',
    },

    // Financial compliance rule
    financialCompliance: {
      validate: async (data, context) => {
        if (data.amount > 10000 && !data.complianceApproval) {
          return false
        }
        return true
      },
      message: 'Compliance approval required for amounts over $10,000',
    },

    // Geographic restrictions
    geoRestriction: {
      validate: async (data, context) => {
        const userCountry = await geoService.getUserCountry(context.user.id)
        const restrictedCountries = ['XX', 'YY'] // Example restricted countries

        if (restrictedCountries.includes(userCountry)) {
          return false
        }
        return true
      },
      message: 'Service not available in your geographic region',
    },
  },
})
```

## DATA Pillar Hooks

### Schema Extensions

```typescript
const timestampPlugin = createPlugin('timestamps', {
  schemaExtensions: {
    // Add timestamp fields to all schemas
    '*': {
      createdAt: {
        type: 'string',
        format: 'datetime',
        default: () => new Date().toISOString(),
      },
      updatedAt: {
        type: 'string',
        format: 'datetime',
        optional: true,
      },
    },

    // User-specific extensions
    user: {
      lastLoginAt: {
        type: 'string',
        format: 'datetime',
        optional: true,
      },
      loginCount: {
        type: 'number',
        default: 0,
      },
    },

    // Order-specific extensions
    order: {
      fulfillmentDate: {
        type: 'string',
        format: 'datetime',
        optional: true,
      },
      trackingNumber: {
        type: 'string',
        optional: true,
      },
    },
  },
})
```

### Repository Hooks

```typescript
const cachePlugin = createPlugin('cache', {
  repositoryHooks: {
    // Cache data after creation
    afterCreate: async (entity, repository, context) => {
      const cacheKey = `${repository.name}:${entity.id}`
      await cacheManager.set(cacheKey, entity, { ttl: 3600000 })
      return entity
    },

    // Update cache after updates
    afterUpdate: async (entity, changes, repository, context) => {
      const cacheKey = `${repository.name}:${entity.id}`
      await cacheManager.set(cacheKey, entity, { ttl: 3600000 })

      // Invalidate related caches
      await cacheManager.invalidateByTag(`${repository.name}:${entity.id}`)
      return entity
    },

    // Remove from cache after deletion
    afterDelete: async (entityId, repository, context) => {
      const cacheKey = `${repository.name}:${entityId}`
      await cacheManager.delete(cacheKey)
      await cacheManager.invalidateByTag(`${repository.name}:${entityId}`)
    },

    // Check cache before database queries
    beforeFind: async (id, repository, context) => {
      const cacheKey = `${repository.name}:${id}`
      const cached = await cacheManager.get(cacheKey)

      if (cached.tag === 'Ok') {
        // Return cached result, skip database query
        return { cached: true, result: cached.value }
      }

      // Continue with database query
      return { cached: false }
    },
  },
})
```

### Storage Adapters

```typescript
const s3Plugin = createPlugin('s3-storage', {
  storageAdapters: {
    s3: class S3StorageAdapter {
      constructor(private config: S3Config) {}

      async create(data: any): Promise<Result<RepositoryError, any>> {
        try {
          const key = `${data.type}/${data.id}`
          await s3Client.putObject({
            Bucket: this.config.bucket,
            Key: key,
            Body: JSON.stringify(data),
            ContentType: 'application/json',
          })

          return Result.Ok(data)
        } catch (error) {
          return Result.Err(new RepositoryError('S3 storage failed', { cause: error }))
        }
      }

      async find(id: string): Promise<Result<RepositoryError, any>> {
        try {
          const response = await s3Client.getObject({
            Bucket: this.config.bucket,
            Key: id,
          })

          const data = JSON.parse(await response.Body.transformToString())
          return Result.Ok(data)
        } catch (error) {
          if (error.Code === 'NoSuchKey') {
            return Result.Err(new RepositoryError('Entity not found'))
          }
          return Result.Err(new RepositoryError('S3 retrieval failed', { cause: error }))
        }
      }

      async update(id: string, changes: any): Promise<Result<RepositoryError, any>> {
        // Implementation for S3 updates
        // This might involve reading, merging, and writing back
        const existingResult = await this.find(id)
        if (existingResult.tag === 'Err') {
          return existingResult
        }

        const updated = { ...existingResult.value, ...changes }
        return this.create(updated)
      }

      async delete(id: string): Promise<Result<RepositoryError, void>> {
        try {
          await s3Client.deleteObject({
            Bucket: this.config.bucket,
            Key: id,
          })
          return Result.Ok(undefined)
        } catch (error) {
          return Result.Err(new RepositoryError('S3 deletion failed', { cause: error }))
        }
      }
    },

    // Custom database adapter
    postgresql: class PostgreSQLAdapter {
      // PostgreSQL-specific implementation
    },
  },
})
```

## Plugin Registration and Management

### Registering Plugins

```typescript
import { registerPlugin, loadPlugin, enablePlugin } from 'kairo/plugins'

// Register the plugin
registerPlugin(authPlugin)
registerPlugin(auditPlugin)
registerPlugin(cachePlugin)

// Load with configuration
await loadPlugin('auth', {
  apiKey: process.env.AUTH_API_KEY,
  timeout: 10000,
})

// Enable the plugin
await enablePlugin('auth')

// Load and enable in one step
await loadAndEnablePlugin('audit', {
  auditEndpoint: 'https://audit.company.com',
  batchSize: 100,
})
```

### Plugin Dependencies

```typescript
const advancedAuthPlugin = createPlugin('advanced-auth', {
  metadata: {
    dependencies: ['auth', 'logging'], // Required plugins
    optionalDependencies: ['cache'], // Optional plugins
  },

  onLoad: async (config, context) => {
    // Access dependent plugins
    const authPlugin = context.getPlugin('auth')
    const loggingPlugin = context.getPlugin('logging')
    const cachePlugin = context.getPlugin('cache') // May be undefined

    if (cachePlugin) {
      console.log('Cache plugin available, enabling caching features')
    }
  },
})
```

### Plugin State Management

```typescript
import { getPlugin, getPluginState, disablePlugin, unloadPlugin } from 'kairo/plugins'

// Get plugin instance
const authPlugin = getPlugin('auth')

// Check plugin state
const state = getPluginState('auth')
console.log(`Plugin state: ${state}`) // 'registered', 'loaded', 'enabled', 'disabled'

// Disable plugin temporarily
await disablePlugin('auth')

// Re-enable plugin
await enablePlugin('auth')

// Completely unload plugin
await unloadPlugin('auth')
```

## Plugin Testing

```typescript
import { createPluginTester } from 'kairo/testing'

describe('Auth Plugin', () => {
  const tester = createPluginTester(authPlugin)

  beforeEach(async () => {
    await tester.load({
      apiKey: 'test-key',
      timeout: 5000,
    })
  })

  afterEach(async () => {
    await tester.unload()
  })

  it('should add authorization header to requests', async () => {
    const mockRequest = {
      method: 'GET',
      url: '/api/users',
      headers: {},
    }

    const result = await tester.testResourceHook('beforeRequest', mockRequest)

    expect(result.headers.Authorization).toMatch(/^Bearer /)
  })

  it('should handle 401 errors with retry', async () => {
    const mockError = new NetworkError('Unauthorized', { status: 401 })

    const result = await tester.testResourceHook('onError', mockError)

    expect(result.retry).toBe(true)
  })

  it('should pass health checks', async () => {
    const health = await tester.testHealthCheck()

    expect(health.healthy).toBe(true)
  })
})
```

## Plugin Best Practices

### Configuration Management

```typescript
const configPlugin = createPlugin('config', {
  configSchema: {
    // Use clear, descriptive configuration
    apiUrl: {
      type: 'string',
      required: true,
      description: 'Base URL for the API service',
      example: 'https://api.example.com',
    },
    timeout: {
      type: 'number',
      default: 5000,
      min: 1000,
      max: 30000,
      description: 'Request timeout in milliseconds',
    },
    retries: {
      type: 'number',
      default: 3,
      min: 0,
      max: 10,
      description: 'Number of retry attempts',
    },
  },

  validateConfig: async config => {
    // Custom configuration validation
    if (config.timeout > 30000) {
      throw new ConfigError('Timeout cannot exceed 30 seconds')
    }

    // Test API connectivity
    try {
      await fetch(`${config.apiUrl}/health`)
    } catch (error) {
      throw new ConfigError('Cannot connect to API', { cause: error })
    }
  },
})
```

### Error Handling

```typescript
const robustPlugin = createPlugin('robust', {
  resourceHooks: {
    beforeRequest: async (request, context) => {
      try {
        return await enhanceRequest(request, context)
      } catch (error) {
        // Log error but don't break the request
        console.error('Plugin error in beforeRequest:', error)
        return request // Return original request
      }
    },

    onError: async (error, request, context) => {
      try {
        return await handleError(error, request, context)
      } catch (handlerError) {
        // Don't let plugin errors break error handling
        console.error('Plugin error in error handler:', handlerError)
        return { error } // Return original error
      }
    },
  },
})
```

### Performance Considerations

```typescript
const performantPlugin = createPlugin('performant', {
  pipelineHooks: {
    beforeExecute: async (input, context) => {
      // Use async processing where possible
      setImmediate(() => {
        backgroundLogging.log(input, context)
      })

      return input
    },
  },

  repositoryHooks: {
    afterCreate: async (entity, repository, context) => {
      // Batch operations for better performance
      batchProcessor.add({
        action: 'index',
        entity,
        repository: repository.name,
      })

      return entity
    },
  },
})
```

## Type Safety

Plugins maintain full type safety throughout:

```typescript
interface AuthConfig {
  apiKey: string
  timeout: number
  retries: number
}

interface AuthContext {
  user?: User
  token?: string
}

const typedAuthPlugin = createPlugin<AuthConfig, AuthContext>('typed-auth', {
  configSchema: {
    apiKey: { type: 'string', required: true },
    timeout: { type: 'number', default: 5000 },
    retries: { type: 'number', default: 3 },
  },

  resourceHooks: {
    beforeRequest: async (request, context) => {
      // context.config is typed as AuthConfig
      // context.user is typed as User | undefined
      const token = await getToken(context.config.apiKey)

      return {
        ...request,
        headers: {
          ...request.headers,
          Authorization: `Bearer ${token}`,
        },
      }
    },
  },
})
```
