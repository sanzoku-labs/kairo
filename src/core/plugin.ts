import { Result } from './result'
import type { Schema } from './native-schema'
import type { KairoError } from './errors'

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
export interface ResourceHooks {
  beforeRequest?: (request: any, context: ResourceHookContext) => Promise<any> | any
  afterRequest?: (response: any, request: any, context: ResourceHookContext) => Promise<any> | any
  onError?: (
    error: any,
    context: ResourceHookContext
  ) => Promise<{ retry?: boolean; error?: any }> | { retry?: boolean; error?: any }
  onRetry?: (attempt: number, error: any, context: ResourceHookContext) => Promise<void> | void
  onSuccess?: (response: any, context: ResourceHookContext) => Promise<void> | void
}

export interface PipelineHooks {
  beforeExecute?: (input: any, context: PipelineHookContext) => Promise<any> | any
  afterExecute?: (output: any, input: any, context: PipelineHookContext) => Promise<any> | any
  beforeStep?: (input: any, context: PipelineHookContext) => Promise<any> | any
  afterStep?: (output: any, input: any, context: PipelineHookContext) => Promise<any> | any
  onError?: (error: any, context: PipelineHookContext) => Promise<any> | any
  onComplete?: (output: any, context: PipelineHookContext) => Promise<void> | void
}

export interface RepositoryHooks {
  beforeCreate?: (data: any, context: RepositoryHookContext) => Promise<any> | any
  afterCreate?: (entity: any, context: RepositoryHookContext) => Promise<any> | any
  beforeUpdate?: (id: any, data: any, context: RepositoryHookContext) => Promise<any> | any
  afterUpdate?: (entity: any, context: RepositoryHookContext) => Promise<any> | any
  beforeDelete?: (id: any, context: RepositoryHookContext) => Promise<void> | void
  afterDelete?: (id: any, context: RepositoryHookContext) => Promise<void> | void
  beforeFind?: (id: any, context: RepositoryHookContext) => Promise<void> | void
  afterFind?: (entity: any, context: RepositoryHookContext) => Promise<any> | any
}

// Global hooks that apply across all pillars
export interface GlobalHooks {
  onOperation?: (
    operation: string,
    pillar: 'interface' | 'process' | 'data',
    duration: number
  ) => Promise<void> | void
  onError?: (
    error: any,
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
  [schemaName: string]: Record<string, Schema<any>>
}

export interface RuleExtensions {
  [ruleName: string]: (...args: any[]) => any
}

export interface PipelineSteps {
  [stepName: string]: (data: any, context?: any) => Promise<any> | any
}

export interface StorageAdapters {
  [adapterName: string]: new (...args: any[]) => any
}

export interface ResourceExtensions {
  [methodName: string]: (resource: any) => any
}

export interface RepositoryExtensions {
  [methodName: string]: (repository: any) => any
}

// Main plugin definition interface
export interface PluginDefinition {
  metadata: PluginMetadata
  config?: Record<string, any>

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
  onLoad?: (config?: Record<string, any>) => Promise<void> | void
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
  config: Record<string, any>
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
