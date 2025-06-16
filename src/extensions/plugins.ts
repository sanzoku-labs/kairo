// Plugin System Extension
//
// Tree-shakable named exports for plugin architecture

// Plugin Core
export {
  createPlugin,
  registerPlugin,
  loadPlugin,
  loadAndEnablePlugin,
  unloadPlugin,
  enablePlugin,
  disablePlugin,
  getPlugin,
  listPlugins,
  listEnabledPlugins,
  checkPluginHealth,
  getExtensions,
  validatePlugin,
  validatePluginDependencies,
} from './plugins/plugins'

// Plugin Registry
export {
  PluginRegistry,
  getGlobalPluginRegistry,
  setGlobalPluginRegistry,
} from './plugins/plugin-registry'

// Plugin Integration
export {
  ResourcePluginIntegration,
  PipelinePluginIntegration,
  RepositoryPluginIntegration,
  GlobalPluginIntegration,
  getPluginExtensions,
} from './plugins/plugin-integration'

// Plugin Errors
export {
  PluginValidationError,
  PluginDependencyError,
  PluginLifecycleError,
} from './plugins/plugins'

// Plugin Types (types are tree-shaken automatically)
export type * from './plugins/plugin'
export type * from './plugins/plugins'
export type * from './plugins/plugin-registry'
export type * from './plugins/plugin-integration'
