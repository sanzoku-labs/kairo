import { Result } from '../../core/result'
import { createError } from '../../core/errors'
import type {
  PluginDefinition,
  PluginInstance,
  PluginDependencyError,
  ResourceHookContext,
  PipelineHookContext,
  RepositoryHookContext,
  StorageAdapterConstructor,
} from './plugin'
import {
  PluginValidationError,
  PluginLifecycleError,
  validatePlugin,
  validatePluginDependencies,
} from './plugin'
import type { Schema } from '../../core/native-schema'

export class PluginRegistry {
  private plugins = new Map<string, PluginInstance>()
  private dependencyGraph = new Map<string, string[]>()
  // Hook execution order would be used for complex plugin ordering
  // private _hookExecutionOrder = new Map<string, string[]>()

  // Register a plugin
  registerPlugin(
    plugin: PluginDefinition,
    config: Record<string, unknown> = {}
  ): Result<PluginValidationError | PluginDependencyError, void> {
    // Validate plugin definition
    const validationResult = validatePlugin(plugin)
    if (Result.isErr(validationResult)) {
      return validationResult
    }

    // Check for name conflicts
    if (this.plugins.has(plugin.metadata.name)) {
      return Result.Err(
        new PluginValidationError(
          `Plugin with name '${plugin.metadata.name}' is already registered`,
          plugin.metadata.name
        )
      )
    }

    // Validate dependencies
    const availablePlugins = Array.from(this.plugins.keys())
    const dependencyResult = validatePluginDependencies(plugin, availablePlugins)
    if (Result.isErr(dependencyResult)) {
      return dependencyResult
    }

    // Create plugin instance
    const instance: PluginInstance = {
      definition: plugin,
      state: 'unloaded',
      config: { ...plugin.config, ...config },
    }

    // Register plugin
    this.plugins.set(plugin.metadata.name, instance)
    this.dependencyGraph.set(plugin.metadata.name, plugin.metadata.dependencies || [])

    return Result.Ok(undefined)
  }

  // Load a plugin
  async loadPlugin(name: string): Promise<Result<PluginLifecycleError, void>> {
    const instance = this.plugins.get(name)
    if (!instance) {
      return Result.Err(
        new PluginLifecycleError(`Plugin '${name}' is not registered`, name, 'unloaded')
      )
    }

    if (instance.state !== 'unloaded') {
      return Result.Err(
        new PluginLifecycleError(`Plugin '${name}' is already loaded`, name, instance.state)
      )
    }

    try {
      // Load dependencies first
      const dependencies = this.dependencyGraph.get(name) || []
      for (const dep of dependencies) {
        const depInstance = this.plugins.get(dep)
        if (!depInstance || depInstance.state === 'unloaded') {
          const loadResult = await this.loadPlugin(dep)
          if (Result.isErr(loadResult)) {
            return loadResult
          }
        }
      }

      // Execute onLoad hook
      if (instance.definition.onLoad) {
        await instance.definition.onLoad(instance.config)
      }

      // Update state
      instance.state = 'loaded'
      instance.loadedAt = new Date()

      return Result.Ok(undefined)
    } catch (error) {
      instance.state = 'failed'
      instance.error = createError(
        'PLUGIN_LOAD_ERROR',
        `Failed to load plugin '${name}': ${String(error)}`
      )
      return Result.Err(
        new PluginLifecycleError(
          `Failed to load plugin '${name}': ${String(error)}`,
          name,
          'failed'
        )
      )
    }
  }

  // Enable a plugin
  async enablePlugin(name: string): Promise<Result<PluginLifecycleError, void>> {
    const instance = this.plugins.get(name)
    if (!instance) {
      return Result.Err(
        new PluginLifecycleError(`Plugin '${name}' is not registered`, name, 'unloaded')
      )
    }

    if (instance.state !== 'loaded' && instance.state !== 'disabled') {
      return Result.Err(
        new PluginLifecycleError(
          `Plugin '${name}' must be loaded before enabling`,
          name,
          instance.state
        )
      )
    }

    try {
      // Execute onEnable hook
      if (instance.definition.onEnable) {
        await instance.definition.onEnable()
      }

      // Update state
      instance.state = 'enabled'
      instance.enabledAt = new Date()

      return Result.Ok(undefined)
    } catch (error) {
      instance.state = 'failed'
      instance.error = createError(
        'PLUGIN_ENABLE_ERROR',
        `Failed to enable plugin '${name}': ${String(error)}`
      )
      return Result.Err(
        new PluginLifecycleError(
          `Failed to enable plugin '${name}': ${String(error)}`,
          name,
          'failed'
        )
      )
    }
  }

  // Disable a plugin
  async disablePlugin(name: string): Promise<Result<PluginLifecycleError, void>> {
    const instance = this.plugins.get(name)
    if (!instance) {
      return Result.Err(
        new PluginLifecycleError(`Plugin '${name}' is not registered`, name, 'unloaded')
      )
    }

    if (instance.state !== 'enabled') {
      return Result.Err(
        new PluginLifecycleError(`Plugin '${name}' is not enabled`, name, instance.state)
      )
    }

    try {
      // Execute onDisable hook
      if (instance.definition.onDisable) {
        await instance.definition.onDisable()
      }

      // Update state
      instance.state = 'disabled'

      return Result.Ok(undefined)
    } catch (error) {
      instance.state = 'failed'
      instance.error = createError(
        'PLUGIN_DISABLE_ERROR',
        `Failed to disable plugin '${name}': ${String(error)}`
      )
      return Result.Err(
        new PluginLifecycleError(
          `Failed to disable plugin '${name}': ${String(error)}`,
          name,
          'failed'
        )
      )
    }
  }

  // Unload a plugin
  async unloadPlugin(name: string): Promise<Result<PluginLifecycleError, void>> {
    const instance = this.plugins.get(name)
    if (!instance) {
      return Result.Err(
        new PluginLifecycleError(`Plugin '${name}' is not registered`, name, 'unloaded')
      )
    }

    if (instance.state === 'unloaded') {
      return Result.Ok(undefined)
    }

    try {
      // Disable first if enabled
      if (instance.state === 'enabled') {
        const disableResult = await this.disablePlugin(name)
        if (Result.isErr(disableResult)) {
          return disableResult
        }
      }

      // Execute onUnload hook
      if (instance.definition.onUnload) {
        await instance.definition.onUnload()
      }

      // Update state
      instance.state = 'unloaded'
      delete instance.loadedAt
      delete instance.enabledAt
      delete instance.error

      return Result.Ok(undefined)
    } catch (error) {
      instance.state = 'failed'
      instance.error = createError(
        'PLUGIN_UNLOAD_ERROR',
        `Failed to unload plugin '${name}': ${String(error)}`
      )
      return Result.Err(
        new PluginLifecycleError(
          `Failed to unload plugin '${name}': ${String(error)}`,
          name,
          'failed'
        )
      )
    }
  }

  // Get plugin instance
  getPlugin(name: string): PluginInstance | undefined {
    return this.plugins.get(name)
  }

  // List all plugins
  listPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values())
  }

  // List enabled plugins
  listEnabledPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values()).filter(p => p.state === 'enabled')
  }

  // Check plugin health
  async checkPluginHealth(name: string): Promise<Result<PluginLifecycleError, boolean>> {
    const instance = this.plugins.get(name)
    if (!instance) {
      return Result.Err(
        new PluginLifecycleError(`Plugin '${name}' is not registered`, name, 'unloaded')
      )
    }

    if (instance.state !== 'enabled') {
      return Result.Ok(false)
    }

    try {
      if (instance.definition.healthCheck) {
        const healthy = await instance.definition.healthCheck()
        return Result.Ok(healthy)
      }
      return Result.Ok(true)
    } catch {
      return Result.Ok(false)
    }
  }

  // Hook execution methods
  async executeResourceHooks(
    hookName: keyof NonNullable<PluginDefinition['resourceHooks']>,
    context: ResourceHookContext,
    ...args: unknown[]
  ): Promise<unknown[]> {
    const results: unknown[] = []
    const enabledPlugins = this.listEnabledPlugins()

    for (const plugin of enabledPlugins) {
      const hook = plugin.definition.resourceHooks?.[hookName]
      if (hook) {
        try {
          const result = await (hook as (...args: unknown[]) => unknown)(...args, context)
          results.push(result)
        } catch (error) {
          // Log error but continue with other plugins
          console.error(
            `Error executing ${hookName} hook for plugin ${plugin.definition.metadata.name}:`,
            error
          )
        }
      }
    }

    return results
  }

  async executePipelineHooks(
    hookName: keyof NonNullable<PluginDefinition['pipelineHooks']>,
    context: PipelineHookContext,
    ...args: unknown[]
  ): Promise<unknown[]> {
    const results: unknown[] = []
    const enabledPlugins = this.listEnabledPlugins()

    for (const plugin of enabledPlugins) {
      const hook = plugin.definition.pipelineHooks?.[hookName]
      if (hook) {
        try {
          const result = await (hook as (...args: unknown[]) => unknown)(...args, context)
          results.push(result)
        } catch (error) {
          console.error(
            `Error executing ${hookName} hook for plugin ${plugin.definition.metadata.name}:`,
            error
          )
        }
      }
    }

    return results
  }

  async executeRepositoryHooks(
    hookName: keyof NonNullable<PluginDefinition['repositoryHooks']>,
    context: RepositoryHookContext,
    ...args: unknown[]
  ): Promise<unknown[]> {
    const results: unknown[] = []
    const enabledPlugins = this.listEnabledPlugins()

    for (const plugin of enabledPlugins) {
      const hook = plugin.definition.repositoryHooks?.[hookName]
      if (hook) {
        try {
          const result = await (hook as (...args: unknown[]) => unknown)(...args, context)
          results.push(result)
        } catch (error) {
          console.error(
            `Error executing ${hookName} hook for plugin ${plugin.definition.metadata.name}:`,
            error
          )
        }
      }
    }

    return results
  }

  async executeGlobalHooks(
    hookName: keyof NonNullable<PluginDefinition['globalHooks']>,
    ...args: unknown[]
  ): Promise<void> {
    const enabledPlugins = this.listEnabledPlugins()

    for (const plugin of enabledPlugins) {
      const hook = plugin.definition.globalHooks?.[hookName]
      if (hook) {
        try {
          await (hook as (...args: unknown[]) => Promise<void> | void)(...args)
        } catch (error) {
          console.error(
            `Error executing ${hookName} global hook for plugin ${plugin.definition.metadata.name}:`,
            error
          )
        }
      }
    }
  }

  // Get extensions
  getSchemaExtensions(): Record<string, Record<string, Schema<unknown>>> {
    const extensions: Record<string, Record<string, Schema<unknown>>> = {}
    const enabledPlugins = this.listEnabledPlugins()

    for (const plugin of enabledPlugins) {
      if (plugin.definition.schemaExtensions) {
        Object.assign(extensions, plugin.definition.schemaExtensions)
      }
    }

    return extensions
  }

  getRuleExtensions(): Record<
    string,
    (...args: unknown[]) => (value: unknown, context?: unknown) => boolean | Promise<boolean>
  > {
    const extensions: Record<
      string,
      (...args: unknown[]) => (value: unknown, context?: unknown) => boolean | Promise<boolean>
    > = {}
    const enabledPlugins = this.listEnabledPlugins()

    for (const plugin of enabledPlugins) {
      if (plugin.definition.ruleExtensions) {
        Object.assign(extensions, plugin.definition.ruleExtensions)
      }
    }

    return extensions
  }

  getPipelineSteps(): Record<
    string,
    (...args: unknown[]) => (data: unknown, context?: unknown) => unknown
  > {
    const steps: Record<
      string,
      (...args: unknown[]) => (data: unknown, context?: unknown) => unknown
    > = {}
    const enabledPlugins = this.listEnabledPlugins()

    for (const plugin of enabledPlugins) {
      if (plugin.definition.pipelineSteps) {
        Object.assign(steps, plugin.definition.pipelineSteps)
      }
    }

    return steps
  }

  getStorageAdapters(): Record<string, StorageAdapterConstructor> {
    const adapters: Record<string, StorageAdapterConstructor> = {}
    const enabledPlugins = this.listEnabledPlugins()

    for (const plugin of enabledPlugins) {
      if (plugin.definition.storageAdapters) {
        Object.assign(adapters, plugin.definition.storageAdapters)
      }
    }

    return adapters
  }
}

// Global plugin registry instance
let globalPluginRegistry: PluginRegistry | undefined

export function getGlobalPluginRegistry(): PluginRegistry {
  if (!globalPluginRegistry) {
    globalPluginRegistry = new PluginRegistry()
  }
  return globalPluginRegistry
}

export function setGlobalPluginRegistry(registry: PluginRegistry): void {
  globalPluginRegistry = registry
}

// Convenience function for registering plugins globally
export function registerPlugin(
  plugin: PluginDefinition,
  config?: Record<string, unknown>
): Result<PluginValidationError | PluginDependencyError, void> {
  return getGlobalPluginRegistry().registerPlugin(plugin, config)
}

// Convenience function for loading and enabling plugins
export async function loadAndEnablePlugin(
  name: string
): Promise<Result<PluginLifecycleError, void>> {
  const registry = getGlobalPluginRegistry()

  const loadResult = await registry.loadPlugin(name)
  if (Result.isErr(loadResult)) {
    return loadResult
  }

  return await registry.enablePlugin(name)
}
