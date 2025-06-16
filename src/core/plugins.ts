// Main plugin API - what developers will import and use
export {
  createPlugin,
  validatePlugin,
  validatePluginDependencies,
  PluginValidationError,
  PluginDependencyError,
  PluginLifecycleError,
} from './plugin'

export type {
  PluginDefinition,
  PluginInstance,
  PluginState,
  PluginMetadata,
  ResourceHooks,
  PipelineHooks,
  RepositoryHooks,
  GlobalHooks,
  SchemaExtensions,
  RuleExtensions,
  PipelineSteps,
  StorageAdapters,
  ResourceExtensions,
  RepositoryExtensions,
  HookContext,
  ResourceHookContext,
  PipelineHookContext,
  RepositoryHookContext,
  PerformanceMetrics,
} from './plugin'

export { PluginRegistry, getGlobalPluginRegistry, setGlobalPluginRegistry } from './plugin-registry'

export {
  ResourcePluginIntegration,
  PipelinePluginIntegration,
  RepositoryPluginIntegration,
  GlobalPluginIntegration,
  getPluginExtensions,
} from './plugin-integration'

import type { Result } from './result'
import type {
  PluginDefinition,
  PluginValidationError,
  PluginDependencyError,
  PluginLifecycleError,
} from './plugin'
import {
  getGlobalPluginRegistry,
  registerPlugin as registerPluginInternal,
  loadAndEnablePlugin as loadAndEnablePluginInternal,
} from './plugin-registry'

/**
 * Register a plugin with Kairo's plugin system
 *
 * @param plugin - The plugin definition to register
 * @param config - Optional configuration overrides for the plugin
 * @returns Result indicating success or failure
 *
 * @example
 * ```typescript
 * import { registerPlugin, createPlugin } from 'kairo/plugins'
 *
 * const authPlugin = createPlugin('auth', {
 *   resourceHooks: {
 *     beforeRequest: async (request) => {
 *       request.headers.Authorization = `Bearer ${await getToken()}`
 *       return request
 *     }
 *   }
 * })
 *
 * const result = registerPlugin(authPlugin)
 * if (Result.isOk(result)) {
 *   console.log('Auth plugin registered successfully')
 * }
 * ```
 */
export function registerPlugin(
  plugin: PluginDefinition,
  config?: Record<string, unknown>
): Result<PluginValidationError | PluginDependencyError, void> {
  return registerPluginInternal(plugin, config)
}

/**
 * Load a plugin by name (without enabling)
 *
 * @param name - The name of the plugin to load
 * @returns Promise<Result> indicating success or failure
 *
 * @example
 * ```typescript
 * import { loadPlugin } from 'kairo/plugins'
 *
 * const result = await loadPlugin('auth')
 * if (Result.isOk(result)) {
 *   console.log('Auth plugin loaded')
 * }
 * ```
 */
export async function loadPlugin(name: string): Promise<Result<PluginLifecycleError, void>> {
  const registry = getGlobalPluginRegistry()
  return await registry.loadPlugin(name)
}

/**
 * Load and enable a plugin by name in one step
 *
 * @param name - The name of the plugin to load and enable
 * @returns Promise<Result> indicating success or failure
 *
 * @example
 * ```typescript
 * import { loadAndEnablePlugin } from 'kairo/plugins'
 *
 * const result = await loadAndEnablePlugin('auth')
 * if (Result.isOk(result)) {
 *   console.log('Auth plugin loaded and enabled')
 * }
 * ```
 */
export async function loadAndEnablePlugin(
  name: string
): Promise<Result<PluginLifecycleError, void>> {
  return await loadAndEnablePluginInternal(name)
}

/**
 * Unload a plugin by name
 *
 * @param name - The name of the plugin to unload
 * @returns Promise<Result> indicating success or failure
 */
export async function unloadPlugin(name: string): Promise<Result<PluginLifecycleError, void>> {
  const registry = getGlobalPluginRegistry()
  return await registry.unloadPlugin(name)
}

/**
 * Enable a plugin by name (must be loaded first)
 *
 * @param name - The name of the plugin to enable
 * @returns Promise<Result> indicating success or failure
 */
export async function enablePlugin(name: string): Promise<Result<PluginLifecycleError, void>> {
  const registry = getGlobalPluginRegistry()
  return await registry.enablePlugin(name)
}

/**
 * Disable a plugin by name
 *
 * @param name - The name of the plugin to disable
 * @returns Promise<Result> indicating success or failure
 */
export async function disablePlugin(name: string): Promise<Result<PluginLifecycleError, void>> {
  const registry = getGlobalPluginRegistry()
  return await registry.disablePlugin(name)
}

/**
 * Get information about a specific plugin
 *
 * @param name - The name of the plugin
 * @returns Plugin instance or undefined if not found
 */
export function getPlugin(name: string) {
  const registry = getGlobalPluginRegistry()
  return registry.getPlugin(name)
}

/**
 * List all registered plugins
 *
 * @returns Array of all plugin instances
 */
export function listPlugins() {
  const registry = getGlobalPluginRegistry()
  return registry.listPlugins()
}

/**
 * List only enabled plugins
 *
 * @returns Array of enabled plugin instances
 */
export function listEnabledPlugins() {
  const registry = getGlobalPluginRegistry()
  return registry.listEnabledPlugins()
}

/**
 * Check the health of a specific plugin
 *
 * @param name - The name of the plugin to check
 * @returns Promise<Result<boolean>> indicating plugin health
 */
export async function checkPluginHealth(
  name: string
): Promise<Result<PluginLifecycleError, boolean>> {
  const registry = getGlobalPluginRegistry()
  return await registry.checkPluginHealth(name)
}

/**
 * Get all plugin extensions that are currently available
 *
 * @returns Object containing all extensions from enabled plugins
 */
export function getExtensions() {
  const registry = getGlobalPluginRegistry()
  return {
    schemas: registry.getSchemaExtensions(),
    rules: registry.getRuleExtensions(),
    pipelineSteps: registry.getPipelineSteps(),
    storageAdapters: registry.getStorageAdapters(),
  }
}
