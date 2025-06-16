// Plugin System Examples
// Complete examples showing how to create and use plugins with Kairo

import {
  createPlugin,
  registerPlugin,
  loadAndEnablePlugin,
  resource,
  pipeline,
  repository,
  schema,
  Result,
} from '../src/index'

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
        const headers = request.headers as Record<string, string> | undefined
        request.headers = {
          ...headers,
          Authorization: `Bearer ${token}`,
        }
      }
      return request
    },

    onError: async (error, _context) => {
      // Handle 401 errors by refreshing token
      const errorWithStatus = error as { status?: number }
      if (errorWithStatus.status === 401) {
        const refreshed = await refreshAuthToken()
        if (refreshed) {
          return { retry: true }
        }
      }
      return { error }
    },

    onSuccess: async (_response, context) => {
      // Log successful authenticated requests
      console.log(`Authenticated request to ${context.resourceName} succeeded`)
    },
  },

  // Hook into PROCESS pillar (Pipelines)
  pipelineHooks: {
    beforeExecute: async (input, _context) => {
      // Add user context to pipeline input
      const user = await getCurrentUser()
      return { ...input, user }
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
    await initializeAuthService(config)
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
      constructor(private config: Record<string, unknown>) {}

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
    transaction: async function (callback: () => Promise<unknown>) {
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
    },

    migrate: async function (schema: Record<string, unknown>) {
      // Run database migrations
      await runMigrations(schema)
    },
  },

  onLoad: async config => {
    await initializeConnectionPool(config)
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
    await initializeDatadog(config)
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
    creditScore: (minScore: number) => async (user: { ssn: string }) => {
      const score = await getCreditScore(user.ssn)
      return score >= minScore
    },

    kycCompliance: () => async (user: Record<string, unknown>) => {
      return await checkKYCCompliance(user)
    },

    amlCheck: () => async (transaction: Record<string, unknown>) => {
      return await performAMLCheck(transaction)
    },
  },

  // Add compliance-specific pipeline steps
  pipelineSteps: {
    auditLog:
      (action: string) =>
      async (data: Record<string, unknown>, context: Record<string, unknown>) => {
        await auditService.log({
          action,
          data: sanitizeForAudit(data),
          user: context.user,
          timestamp: new Date(),
          compliance: true,
        })
        return data
      },

    riskAssessment: () => async (data: Record<string, unknown>) => {
      const riskScore = await calculateRiskScore(data)
      return { ...data, riskScore }
    },
  },

  repositoryHooks: {
    beforeCreate: async (data, _context) => {
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
      path: '/users/:id',
      params: schema.object({ id: schema.string().uuid() }),
      response: schema.object({
        id: schema.string().uuid(),
        name: schema.string(),
        email: schema.string().email(),
      }),
    },
    create: {
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
  const user = await UserAPI.get.run({ id: '123' })

  // 2. Pipelines with compliance and user context
  const createUserPipeline = pipeline('create-user')
    .input(
      schema.object({
        name: schema.string(),
        email: schema.string().email(),
        ssn: schema.string(),
      })
    )
    // User context automatically added by auth plugin
    .step('risk-assessment', (data, context) => {
      // Risk assessment step provided by compliance plugin
      return compliancePlugin.definition.pipelineSteps!.riskAssessment()(data)
    })
    .step('audit-log', (data, context) => {
      // Audit logging provided by compliance plugin
      return compliancePlugin.definition.pipelineSteps!.auditLog('user-creation')(data, context)
    })
    .pipeline(UserAPI.create)

  const newUser = await createUserPipeline.execute({
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
    storage: 'postgres', // Provided by postgres plugin
  })

  // Create operation will automatically:
  // - Use postgres storage adapter
  // - Add audit fields (createdBy, createdAt)
  // - Add compliance metadata
  // - Send metrics to DataDog
  const createdUser = await userRepo.create({
    name: 'Jane Doe',
    email: 'jane@example.com',
  })

  console.log('Plugin system demonstration complete!')
  console.log('All operations were enhanced by plugins automatically')
}

// Mock functions for demonstration
async function getAuthToken(): Promise<string> {
  return 'mock-token'
}

async function refreshAuthToken(): Promise<boolean> {
  return true
}

async function getCurrentUser() {
  return { id: 'user-123', name: 'Current User' }
}

async function validateToken(token: string): Promise<boolean> {
  return true
}

async function initializeAuthService(config: Record<string, unknown>): Promise<void> {
  console.log('Initializing auth service...', config)
}

async function startTokenRefreshTimer(): Promise<void> {
  console.log('Starting token refresh timer...')
}

async function stopTokenRefreshTimer(): Promise<void> {
  console.log('Stopping token refresh timer...')
}

async function cleanupAuthService(): Promise<void> {
  console.log('Cleaning up auth service...')
}

async function logError(errorInfo: Record<string, unknown>): Promise<void> {
  console.log('Logging error:', errorInfo)
}

async function initializeConnectionPool(config: Record<string, unknown>): Promise<void> {
  console.log('Initializing database connection pool...', config)
}

async function closeConnectionPool(): Promise<void> {
  console.log('Closing database connection pool...')
}

async function runMigrations(schema: Record<string, unknown>): Promise<void> {
  console.log('Running database migrations...', schema)
}

async function initializeDatadog(config: Record<string, unknown>): Promise<void> {
  console.log('Initializing DataDog...', config)
}

async function getCreditScore(ssn: string): Promise<number> {
  console.log('Checking credit score for SSN:', ssn)
  return 750
}

async function checkKYCCompliance(user: Record<string, unknown>): Promise<boolean> {
  console.log('Checking KYC compliance for user:', user)
  return true
}

async function performAMLCheck(transaction: Record<string, unknown>): Promise<boolean> {
  console.log('Performing AML check for transaction:', transaction)
  return true
}

async function calculateRiskScore(data: Record<string, unknown>): Promise<number> {
  console.log('Calculating risk score for data:', data)
  return 0.2
}

function sanitizeForAudit(data: Record<string, unknown>): Record<string, unknown> {
  const { ssn, ...sanitized } = data
  return sanitized
}

// Mock objects
const pool = {
  connect: async () => ({
    query: async (sql: string, params?: any[]) => ({ rows: [] }),
    release: () => {},
  }),
}

const datadog = {
  increment: async (metric: string, value: number, tags?: Record<string, unknown>) => {
    console.log('DataDog increment:', metric, value, tags)
  },
  histogram: async (metric: string, value: number, tags?: Record<string, unknown>) => {
    console.log('DataDog histogram:', metric, value, tags)
  },
  gauge: async (metric: string, value: number, tags?: Record<string, unknown>) => {
    console.log('DataDog gauge:', metric, value, tags)
  },
  check: async () => true,
}

const auditService = {
  log: async (entry: Record<string, unknown>) => {
    console.log('Audit log:', entry)
  },
}

// Export for use in other examples
export { authPlugin, postgresPlugin, datadogPlugin, compliancePlugin, demonstratePluginSystem }
