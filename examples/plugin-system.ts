// Plugin System Examples
// Complete examples showing how to create and use plugins with Kairo

import { resource, pipeline, repository, schema, Result } from '../src/index'
import { createPlugin, registerPlugin, loadAndEnablePlugin } from '../src/extensions/plugins'

// Example 1: Authentication Plugin
const authPlugin = createPlugin('auth', {
  metadata: {
    version: '1.2.0',
    description: 'Authentication plugin for Kairo applications',
    author: 'Kairo Team',
    dependencies: [],
  },

  config: {
    tokenEndpoint: 'https://auth.example.com/token',
    refreshThreshold: 300, // 5 minutes
  },

  // Hook into INTERFACE pillar (Resources)
  resourceHooks: {
    beforeRequest: async (request, _context) => {
      // Add authentication header to all requests
      const token = await getAuthToken()
      if (token) {
        const headers = request.headers ?? {}
        request.headers = {
          ...headers,
          Authorization: `Bearer ${token}`,
        }
      }
      return request
    },

    onError: async (error, _context) => {
      // Handle 401 errors by refreshing token
      const errorWithStatus = error as { status?: number; message?: string }
      if (errorWithStatus.status === 401) {
        const refreshed = await refreshAuthToken()
        if (refreshed) {
          return { retry: true }
        }
      }
      return { error: errorWithStatus }
    },

    onSuccess: (_response, context) => {
      // Log successful authenticated requests
      console.log(`Authenticated request to ${context.resourceName} succeeded`)
    },
  },

  // Hook into PROCESS pillar (Pipelines)
  pipelineHooks: {
    beforeExecute: async (input, _context) => {
      // Add user context to pipeline input
      const user = await getCurrentUser()
      return { ...(input as object), user }
    },
  },

  // Hook into DATA pillar (Repositories)
  repositoryHooks: {
    beforeCreate: async (data, _context) => {
      // Add audit fields
      const user = await getCurrentUser()
      return {
        ...data,
        createdBy: user?.id,
        createdAt: new Date().toISOString(),
      }
    },

    beforeUpdate: async (_id, data, _context) => {
      // Add audit fields
      const user = await getCurrentUser()
      return {
        ...data,
        updatedBy: user?.id,
        updatedAt: new Date().toISOString(),
      }
    },
  },

  // Global hooks across all pillars
  globalHooks: {
    onOperation: (operation, pillar, duration) => {
      // Performance monitoring
      if (duration > 1000) {
        console.warn(`Slow operation detected: ${operation} in ${pillar} took ${duration}ms`)
      }
    },

    onError: async (error, pillar, operation) => {
      // Error tracking
      const errorWithMessage = error as { message?: string }
      await logError({
        error: errorWithMessage.message || 'Unknown error',
        pillar,
        operation,
        timestamp: Date.now(),
        user: await getCurrentUser(),
      })
    },
  },

  // Extend schemas with auth fields
  schemaExtensions: {
    user: {
      createdBy: schema.string().uuid().optional(),
      updatedBy: schema.string().uuid().optional(),
      createdAt: schema.string().optional(),
      updatedAt: schema.string().optional(),
    },
  },

  // Lifecycle hooks
  onLoad: async config => {
    console.log('Auth plugin loaded with config:', config)
    await initializeAuthService(config ?? {})
  },

  onEnable: async () => {
    console.log('Auth plugin enabled')
    await startTokenRefreshTimer()
  },

  onDisable: async () => {
    console.log('Auth plugin disabled')
    await stopTokenRefreshTimer()
  },

  onUnload: async () => {
    console.log('Auth plugin unloaded')
    await cleanupAuthService()
  },

  healthCheck: async () => {
    try {
      const token = await getAuthToken()
      return !!token && (await validateToken(token))
    } catch {
      return false
    }
  },
})

// Example 2: Database Plugin
const postgresPlugin = createPlugin('postgres', {
  metadata: {
    version: '3.1.0',
    description: 'PostgreSQL adapter plugin for Kairo repositories',
    author: 'Database Team',
  },

  config: {
    connectionString: 'postgresql://localhost:5432/kairo',
    maxConnections: 20,
    ssl: false,
  },

  // Provide custom storage adapters
  storageAdapters: {
    postgres: class PostgresStorageAdapter {
      constructor(_config: Record<string, unknown> = {}) {
        // Config would be used for PostgreSQL connection setup
      }

      async create(data: { name: string; email: string }) {
        const client = await this.getClient()
        try {
          const result = await client.query(
            'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
            [data.name, data.email]
          )
          return Result.Ok(result.rows[0] as unknown)
        } catch (error) {
          return Result.Err(error)
        } finally {
          client.release()
        }
      }

      async findMany(_query: Record<string, unknown> = {}) {
        const client = await this.getClient()
        try {
          const result = await client.query('SELECT * FROM users WHERE deleted_at IS NULL')
          return Result.Ok(result.rows as unknown[])
        } catch (error) {
          return Result.Err(error)
        } finally {
          client.release()
        }
      }

      private async getClient() {
        // Get client from connection pool
        return await pool.connect()
      }
    },
  },

  // Extend repositories with database-specific methods
  repositoryExtensions: {
    transaction: (_repository: unknown) => {
      return async function (callback: () => Promise<unknown>) {
        const client = await pool.connect()
        try {
          await client.query('BEGIN')
          const result = await callback()
          await client.query('COMMIT')
          return Result.Ok(result)
        } catch (error) {
          await client.query('ROLLBACK')
          return Result.Err(error)
        } finally {
          client.release()
        }
      }
    },

    migrate: (_repository: unknown) => {
      return async function (schema: Record<string, unknown>) {
        // Run database migrations
        await runMigrations(schema)
      }
    },
  },

  onLoad: async config => {
    await initializeConnectionPool(config ?? {})
  },

  onUnload: async () => {
    await closeConnectionPool()
  },

  healthCheck: async () => {
    try {
      const client = await pool.connect()
      await client.query('SELECT 1')
      client.release()
      return true
    } catch {
      return false
    }
  },
})

// Example 3: Monitoring Plugin
const datadogPlugin = createPlugin('datadog', {
  metadata: {
    version: '2.3.0',
    description: 'DataDog monitoring integration for Kairo',
  },

  config: {
    apiKey: 'dd-api-key',
    service: 'kairo-app',
    environment: 'development',
  },

  globalHooks: {
    onOperation: async (operation, pillar, duration) => {
      // Send metrics to DataDog
      await datadog.increment(`kairo.${pillar}.${operation}`, 1, {
        duration,
        status: 'success',
      })
    },

    onError: async (error, pillar, operation) => {
      // Send error metrics
      const errorWithConstructor = error as { constructor?: { name?: string } }
      await datadog.increment(`kairo.${pillar}.${operation}`, 1, {
        status: 'error',
        error_type: errorWithConstructor.constructor?.name || 'Unknown',
      })
    },

    onPerformance: async metrics => {
      // Send performance metrics
      await datadog.histogram('kairo.operation.duration', metrics.duration, {
        operation: metrics.operation,
        pillar: metrics.pillar,
      })

      if (metrics.memoryUsage) {
        await datadog.gauge('kairo.memory.usage', metrics.memoryUsage)
      }
    },
  },

  onLoad: async config => {
    await initializeDatadog(config ?? {})
  },

  healthCheck: async () => {
    try {
      await datadog.check()
      return true
    } catch {
      return false
    }
  },
})

// Example 4: Business Rules Plugin
const compliancePlugin = createPlugin('compliance', {
  metadata: {
    version: '1.5.0',
    description: 'Business compliance rules for financial applications',
    keywords: ['compliance', 'finance', 'validation'],
  },

  // Extend the rules system with compliance-specific rules
  ruleExtensions: {
    creditScore: (..._args: unknown[]) => {
      const minScore = _args[0] as number
      return async (user: unknown) => {
        const userObj = user as { ssn: string }
        const score = await getCreditScore(userObj.ssn)
        return score >= minScore
      }
    },

    kycCompliance: (..._args: unknown[]) => {
      return async (user: unknown) => {
        const userObj = user as Record<string, unknown>
        return await checkKYCCompliance(userObj)
      }
    },

    amlCheck: (..._args: unknown[]) => {
      return async (transaction: unknown) => {
        const txObj = transaction as Record<string, unknown>
        return await performAMLCheck(txObj)
      }
    },
  },

  // Add compliance-specific pipeline steps
  pipelineSteps: {
    auditLog: (..._args: unknown[]) => {
      const action = _args[0] as string
      return async (data: unknown, context?: unknown) => {
        const dataObj = data as Record<string, unknown>
        const contextObj = context as Record<string, unknown>
        await auditService.log({
          action,
          data: sanitizeForAudit(dataObj),
          user: contextObj?.user,
          timestamp: new Date(),
          compliance: true,
        })
        return data
      }
    },

    riskAssessment: (..._args: unknown[]) => {
      return async (data: unknown) => {
        const dataObj = data as Record<string, unknown>
        const riskScore = await calculateRiskScore(dataObj)
        return { ...dataObj, riskScore }
      }
    },
  },

  repositoryHooks: {
    beforeCreate: (data, _context) => {
      // Ensure all entities have compliance metadata
      return {
        ...data,
        complianceChecked: true,
        complianceTimestamp: new Date().toISOString(),
      }
    },
  },
})

// Usage Examples
async function demonstratePluginSystem() {
  // Register plugins
  console.log('Registering plugins...')

  registerPlugin(authPlugin)
  registerPlugin(postgresPlugin)
  registerPlugin(datadogPlugin)
  registerPlugin(compliancePlugin)

  // Load and enable plugins
  await loadAndEnablePlugin('auth')
  await loadAndEnablePlugin('postgres')
  await loadAndEnablePlugin('datadog')
  await loadAndEnablePlugin('compliance')

  console.log('All plugins loaded and enabled!')

  // Now use Kairo normally - plugins will automatically enhance functionality

  // 1. Resources with automatic auth
  const UserAPI = resource('users', {
    get: {
      method: 'GET',
      path: '/users/:id',
      params: schema.object({ id: schema.string().uuid() }),
      response: schema.object({
        id: schema.string().uuid(),
        name: schema.string(),
        email: schema.string().email(),
      }),
    },
    create: {
      method: 'POST',
      path: '/users',
      body: schema.object({
        name: schema.string(),
        email: schema.string().email(),
      }),
      response: schema.object({
        id: schema.string().uuid(),
        name: schema.string(),
        email: schema.string().email(),
      }),
    },
  })

  // This request will automatically include auth headers via the auth plugin
  await UserAPI.get?.run({ id: '123' })

  // 2. Pipelines with compliance and user context
  const createUserPipeline = pipeline('create-user').input(
    schema.object({
      name: schema.string(),
      email: schema.string().email(),
      ssn: schema.string(),
    })
  )

  // Note: Compliance plugin steps would be applied automatically via plugin hooks
  // This is just for demonstration purposes
  console.log('Pipeline with compliance features will be executed')

  // Chain with user creation
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  ;(createUserPipeline as any).pipeline(UserAPI.create)

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  await (createUserPipeline as any).execute({
    name: 'John Doe',
    email: 'john@example.com',
    ssn: '123-45-6789',
  })

  // 3. Repositories with postgres storage and audit fields
  const userRepo = repository('users', {
    schema: schema.object({
      id: schema.string().uuid().optional(),
      name: schema.string(),
      email: schema.string().email(),
      // Audit fields automatically added by auth plugin
      createdBy: schema.string().uuid().optional(),
      updatedBy: schema.string().uuid().optional(),
      createdAt: schema.string().optional(),
      updatedAt: schema.string().optional(),
      // Compliance fields added by compliance plugin
      complianceChecked: schema.boolean().optional(),
      complianceTimestamp: schema.string().optional(),
    }),
    storage: 'memory', // Use memory storage for example (postgres would be provided by plugin)
  })

  // Create operation will automatically:
  // - Use postgres storage adapter
  // - Add audit fields (createdBy, createdAt)
  // - Add compliance metadata
  // - Send metrics to DataDog
  await userRepo.create({
    name: 'Jane Doe',
    email: 'jane@example.com',
    id: undefined,
    createdBy: undefined,
    updatedBy: undefined,
    createdAt: undefined,
    updatedAt: undefined,
    complianceChecked: undefined,
    complianceTimestamp: undefined,
  })

  console.log('Plugin system demonstration complete!')
  console.log('All operations were enhanced by plugins automatically')
}

// Mock functions for demonstration
function getAuthToken(): Promise<string> {
  return Promise.resolve('mock-token')
}

function refreshAuthToken(): Promise<boolean> {
  return Promise.resolve(true)
}

function getCurrentUser(): Promise<{ id: string; name: string }> {
  return Promise.resolve({ id: 'user-123', name: 'Current User' })
}

function validateToken(_token: string): Promise<boolean> {
  return Promise.resolve(true)
}

function initializeAuthService(config: Record<string, unknown>): Promise<void> {
  console.log('Initializing auth service...', config)
  return Promise.resolve()
}

function startTokenRefreshTimer(): Promise<void> {
  console.log('Starting token refresh timer...')
  return Promise.resolve()
}

function stopTokenRefreshTimer(): Promise<void> {
  console.log('Stopping token refresh timer...')
  return Promise.resolve()
}

function cleanupAuthService(): Promise<void> {
  console.log('Cleaning up auth service...')
  return Promise.resolve()
}

function logError(errorInfo: Record<string, unknown>): Promise<void> {
  console.log('Logging error:', errorInfo)
  return Promise.resolve()
}

function initializeConnectionPool(config: Record<string, unknown>): Promise<void> {
  console.log('Initializing database connection pool...', config)
  return Promise.resolve()
}

function closeConnectionPool(): Promise<void> {
  console.log('Closing database connection pool...')
  return Promise.resolve()
}

function runMigrations(schema: Record<string, unknown>): Promise<void> {
  console.log('Running database migrations...', schema)
  return Promise.resolve()
}

function initializeDatadog(config: Record<string, unknown>): Promise<void> {
  console.log('Initializing DataDog...', config)
  return Promise.resolve()
}

function getCreditScore(ssn: string): Promise<number> {
  console.log('Checking credit score for SSN:', ssn)
  return Promise.resolve(750)
}

function checkKYCCompliance(user: Record<string, unknown>): Promise<boolean> {
  console.log('Checking KYC compliance for user:', user)
  return Promise.resolve(true)
}

function performAMLCheck(transaction: Record<string, unknown>): Promise<boolean> {
  console.log('Performing AML check for transaction:', transaction)
  return Promise.resolve(true)
}

function calculateRiskScore(data: Record<string, unknown>): Promise<number> {
  console.log('Calculating risk score for data:', data)
  return Promise.resolve(0.2)
}

function sanitizeForAudit(data: Record<string, unknown>): Record<string, unknown> {
  const { ssn, ...sanitized } = data
  void ssn // Mark as intentionally unused
  return sanitized
}

// Mock objects
const pool = {
  connect: () =>
    Promise.resolve({
      query: (_sql: string, _params?: unknown[]) => Promise.resolve({ rows: [] }),
      release: () => {},
    }),
}

const datadog = {
  increment: (metric: string, value: number, tags?: Record<string, unknown>) => {
    console.log('DataDog increment:', metric, value, tags)
    return Promise.resolve()
  },
  histogram: (metric: string, value: number, tags?: Record<string, unknown>) => {
    console.log('DataDog histogram:', metric, value, tags)
    return Promise.resolve()
  },
  gauge: (metric: string, value: number, _tags?: Record<string, unknown>) => {
    console.log('DataDog gauge:', metric, value, _tags)
    return Promise.resolve()
  },
  check: () => Promise.resolve(true),
}

const auditService = {
  log: (entry: Record<string, unknown>) => {
    console.log('Audit log:', entry)
    return Promise.resolve()
  },
}

// Export for use in other examples
export { authPlugin, postgresPlugin, datadogPlugin, compliancePlugin, demonstratePluginSystem }
