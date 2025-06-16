// Plugin System Extension
//
// This extension provides a complete plugin architecture for
// extending Kairo's functionality across all three pillars.

// Re-export all plugin functionality
export * from './plugin'
export {
  loadAndEnablePlugin,
  registerPlugin,
  loadPlugin,
  enablePlugin,
  disablePlugin,
  unloadPlugin,
  getPlugin,
  listPlugins,
  listEnabledPlugins,
  checkPluginHealth,
  getExtensions,
} from './plugins'
export { PluginRegistry, getGlobalPluginRegistry, setGlobalPluginRegistry } from './plugin-registry'
export * from './plugin-integration'
