import { Result } from '../../core/result'
import type { Schema } from '../../core/native-schema'
import type { KairoError } from '../../core/errors'

// Plugin lifecycle states
export type PluginState = 'unloaded' | 'loaded' | 'enabled' | 'disabled' | 'failed'

// Plugin metadata
export interface PluginMetadata {
  name: string
  version: string
  description?: string
  author?: string
  homepage?: string
  keywords?: string[]
  dependencies?: string[]
  peerDependencies?: string[]
  kairoVersion?: string
}

// Hook contexts for different operations
export interface HookContext {
  pluginName: string
  timestamp: number
  requestId?: string
  userId?: string
  metadata?: Record<string, unknown>
}

export interface ResourceHookContext extends HookContext {
  resourceName: string
  operation: string
}

export interface PipelineHookContext extends HookContext {
  pipelineName: string
  stepIndex?: number
  stepName?: string
}

export interface RepositoryHookContext extends HookContext {
  repositoryName: string
  operation: string
  entityId?: string | number
}

// Hook definitions for each pillar
export interface ResourceRequest {
  url?: string
  method?: string
  headers?: Record<string, string>
  body?: unknown
  params?: Record<string, unknown>
  [key: string]: unknown
}

export interface ResourceResponse {
  status?: number
  headers?: Record<string, string>
  data?: unknown
  [key: string]: unknown
}

export interface ResourceError {
  status?: number
  message?: string
  code?: string
  [key: string]: unknown
}

export interface ResourceHooks {
  beforeRequest?: (
    request: ResourceRequest,
    context: ResourceHookContext
  ) => Promise<ResourceRequest> | ResourceRequest
  afterRequest?: (
    response: ResourceResponse,
    request: ResourceRequest,
    context: ResourceHookContext
  ) => Promise<ResourceResponse> | ResourceResponse
  onError?: (
    error: ResourceError,
    context: ResourceHookContext
  ) =>
    | Promise<{ retry?: boolean; error?: ResourceError }>
    | { retry?: boolean; error?: ResourceError }
  onRetry?: (
    attempt: number,
    error: ResourceError,
    context: ResourceHookContext
  ) => Promise<void> | void
  onSuccess?: (response: ResourceResponse, context: ResourceHookContext) => Promise<void> | void
}

export interface PipelineHooks {
  beforeExecute?: (input: unknown, context: PipelineHookContext) => unknown
  afterExecute?: (output: unknown, input: unknown, context: PipelineHookContext) => unknown
  beforeStep?: (input: unknown, context: PipelineHookContext) => unknown
  afterStep?: (output: unknown, input: unknown, context: PipelineHookContext) => unknown
  onError?: (error: unknown, context: PipelineHookContext) => unknown
  onComplete?: (output: unknown, context: PipelineHookContext) => Promise<void> | void
}

export interface RepositoryHooks {
  beforeCreate?: (
    data: Record<string, unknown>,
    context: RepositoryHookContext
  ) => Promise<Record<string, unknown>> | Record<string, unknown>
  afterCreate?: (
    entity: Record<string, unknown>,
    context: RepositoryHookContext
  ) => Promise<Record<string, unknown>> | Record<string, unknown>
  beforeUpdate?: (
    id: string | number,
    data: Record<string, unknown>,
    context: RepositoryHookContext
  ) => Promise<Record<string, unknown>> | Record<string, unknown>
  afterUpdate?: (
    entity: Record<string, unknown>,
    context: RepositoryHookContext
  ) => Promise<Record<string, unknown>> | Record<string, unknown>
  beforeDelete?: (id: string | number, context: RepositoryHookContext) => Promise<void> | void
  afterDelete?: (id: string | number, context: RepositoryHookContext) => Promise<void> | void
  beforeFind?: (id: string | number, context: RepositoryHookContext) => Promise<void> | void
  afterFind?: (
    entity: Record<string, unknown> | null,
    context: RepositoryHookContext
  ) => Record<string, unknown> | null
}

// Global hooks that apply across all pillars
export interface GlobalHooks {
  onOperation?: (
    operation: string,
    pillar: 'interface' | 'process' | 'data',
    duration: number
  ) => Promise<void> | void
  onError?: (
    error: unknown,
    pillar: 'interface' | 'process' | 'data',
    operation: string
  ) => Promise<void> | void
  onPerformance?: (metrics: PerformanceMetrics) => Promise<void> | void
}

export interface PerformanceMetrics {
  operation: string
  pillar: string
  duration: number
  memoryUsage?: number
  cpuUsage?: number
  timestamp: number
}

// Extension points for each pillar
export interface SchemaExtensions {
  [schemaName: string]: Record<string, Schema<unknown>>
}

export interface RuleExtensions {
  [ruleName: string]: (
    ...args: unknown[]
  ) => (value: unknown, context?: unknown) => boolean | Promise<boolean>
}

export interface PipelineSteps {
  [stepName: string]: (...args: unknown[]) => (data: unknown, context?: unknown) => unknown
}

export interface StorageAdapter {
  create(data: Record<string, unknown>): Promise<Result<unknown, unknown>>
  findMany(query?: Record<string, unknown>): Promise<Result<unknown, unknown[]>>
  findOne?(query: Record<string, unknown>): Promise<Result<unknown, unknown>>
  find?(id: string | number): Promise<Result<unknown, unknown>>
  update?(id: string | number, data: Record<string, unknown>): Promise<Result<unknown, unknown>>
  delete?(id: string | number): Promise<Result<unknown, boolean>>
  count?(query?: Record<string, unknown>): Promise<Result<unknown, number>>
  exists?(query: Record<string, unknown>): Promise<Result<unknown, boolean>>
}

export interface StorageAdapterConstructor {
  new (config?: Record<string, unknown>): StorageAdapter
}

export interface StorageAdapters {
  [adapterName: string]: StorageAdapterConstructor
}

export interface ResourceExtensions {
  [methodName: string]: (resource: unknown) => unknown
}

export interface RepositoryExtensions {
  [methodName: string]: (repository: unknown) => unknown
}

// Main plugin definition interface
export interface PluginDefinition {
  metadata: PluginMetadata
  config?: Record<string, unknown>

  // Hooks for each pillar
  resourceHooks?: ResourceHooks
  pipelineHooks?: PipelineHooks
  repositoryHooks?: RepositoryHooks
  globalHooks?: GlobalHooks

  // Extensions for each pillar
  schemaExtensions?: SchemaExtensions
  ruleExtensions?: RuleExtensions
  pipelineSteps?: PipelineSteps
  storageAdapters?: StorageAdapters
  resourceExtensions?: ResourceExtensions
  repositoryExtensions?: RepositoryExtensions

  // Lifecycle hooks
  onLoad?: (config?: Record<string, unknown>) => Promise<void> | void
  onUnload?: () => Promise<void> | void
  onEnable?: () => Promise<void> | void
  onDisable?: () => Promise<void> | void

  // Health check
  healthCheck?: () => Promise<boolean> | boolean
}

// Plugin instance with state
export interface PluginInstance {
  definition: PluginDefinition
  state: PluginState
  config: Record<string, unknown>
  loadedAt?: Date
  enabledAt?: Date
  error?: KairoError
}

// Plugin validation errors
export class PluginValidationError extends Error {
  public code = 'PLUGIN_VALIDATION_ERROR'

  constructor(
    message: string,
    public pluginName: string
  ) {
    super(message)
    this.name = 'PluginValidationError'
  }
}

export class PluginDependencyError extends Error {
  public code = 'PLUGIN_DEPENDENCY_ERROR'

  constructor(
    message: string,
    public pluginName: string,
    public missingDependencies: string[]
  ) {
    super(message)
    this.name = 'PluginDependencyError'
  }
}

export class PluginLifecycleError extends Error {
  public code = 'PLUGIN_LIFECYCLE_ERROR'

  constructor(
    message: string,
    public pluginName: string,
    public state: PluginState
  ) {
    super(message)
    this.name = 'PluginLifecycleError'
  }
}

// Plugin factory function
export function createPlugin(
  name: string,
  definition: Omit<PluginDefinition, 'metadata'> & {
    metadata?: Partial<PluginMetadata>
  }
): PluginDefinition {
  return {
    ...definition,
    metadata: {
      name,
      version: '1.0.0',
      description: `Plugin: ${name}`,
      ...definition.metadata,
    },
  }
}

// Plugin validation functions
export function validatePlugin(plugin: PluginDefinition): Result<PluginValidationError, true> {
  const { metadata } = plugin

  if (!metadata.name || typeof metadata.name !== 'string') {
    return Result.Err(
      new PluginValidationError(
        'Plugin name is required and must be a string',
        metadata.name || 'unknown'
      )
    )
  }

  if (!metadata.version || typeof metadata.version !== 'string') {
    return Result.Err(
      new PluginValidationError('Plugin version is required and must be a string', metadata.name)
    )
  }

  // Validate version format (basic semver check)
  const versionRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?$/
  if (!versionRegex.test(metadata.version)) {
    return Result.Err(
      new PluginValidationError(
        'Plugin version must follow semantic versioning (x.y.z)',
        metadata.name
      )
    )
  }

  // Validate dependencies are strings
  if (metadata.dependencies && !Array.isArray(metadata.dependencies)) {
    return Result.Err(
      new PluginValidationError('Plugin dependencies must be an array of strings', metadata.name)
    )
  }

  if (metadata.dependencies?.some(dep => typeof dep !== 'string')) {
    return Result.Err(
      new PluginValidationError('All plugin dependencies must be strings', metadata.name)
    )
  }

  return Result.Ok(true)
}

export function validatePluginDependencies(
  plugin: PluginDefinition,
  availablePlugins: string[]
): Result<PluginDependencyError, true> {
  const { dependencies = [] } = plugin.metadata
  const missingDeps = dependencies.filter(dep => !availablePlugins.includes(dep))

  if (missingDeps.length > 0) {
    return Result.Err(
      new PluginDependencyError(
        `Plugin ${plugin.metadata.name} has unmet dependencies: ${missingDeps.join(', ')}`,
        plugin.metadata.name,
        missingDeps
      )
    )
  }

  return Result.Ok(true)
}
