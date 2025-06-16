import { Result } from '../core/result'
import type { PluginDefinition, PluginState } from '../core/plugin'
import { PluginRegistry } from '../core/plugin-registry'

export interface PluginTestContext {
  pluginName: string
  registry: PluginRegistry
  originalRegistry?: PluginRegistry
}

export interface PluginTestCase {
  name: string
  plugin: PluginDefinition
  config?: Record<string, unknown>
  setup?: (context: PluginTestContext) => Promise<void> | void
  test: (context: PluginTestContext) => Promise<void> | void
  teardown?: (context: PluginTestContext) => Promise<void> | void
  expectedState?: PluginState
  shouldFail?: boolean
}

export interface PluginTestResult {
  testName: string
  pluginName: string
  success: boolean
  error?: Error
  duration: number
  state?: PluginState
}

export interface PluginTestSuite {
  name: string
  tests: PluginTestCase[]
  setup?: (registry: PluginRegistry) => Promise<void> | void
  teardown?: (registry: PluginRegistry) => Promise<void> | void
}

export interface PluginTestSuiteResult {
  suiteName: string
  results: PluginTestResult[]
  totalTests: number
  passedTests: number
  failedTests: number
  duration: number
}

export class PluginTester {
  private registry: PluginRegistry
  private originalRegistry?: PluginRegistry

  constructor(registry?: PluginRegistry) {
    this.registry = registry || new PluginRegistry()
  }

  async runTest(testCase: PluginTestCase): Promise<PluginTestResult> {
    const startTime = Date.now()
    const context: PluginTestContext = {
      pluginName: testCase.plugin.metadata.name,
      registry: this.registry,
      originalRegistry: this.originalRegistry,
    }

    try {
      // Setup
      if (testCase.setup) {
        await testCase.setup(context)
      }

      // Register plugin
      const registerResult = this.registry.registerPlugin(testCase.plugin, testCase.config)
      if (Result.isErr(registerResult)) {
        if (!testCase.shouldFail) {
          throw new Error(`Plugin registration failed: ${registerResult.error.message}`)
        }
      }

      // Run test
      await testCase.test(context)

      // Check expected state
      if (testCase.expectedState) {
        const plugin = this.registry.getPlugin(testCase.plugin.metadata.name)
        if (!plugin || plugin.state !== testCase.expectedState) {
          throw new Error(
            `Expected plugin state ${testCase.expectedState}, got ${plugin?.state || 'undefined'}`
          )
        }
      }

      // Teardown
      if (testCase.teardown) {
        await testCase.teardown(context)
      }

      const duration = Date.now() - startTime
      return {
        testName: testCase.name,
        pluginName: testCase.plugin.metadata.name,
        success: true,
        duration,
        state: this.registry.getPlugin(testCase.plugin.metadata.name)?.state,
      }
    } catch (error) {
      if (testCase.shouldFail) {
        // Expected failure
        const duration = Date.now() - startTime
        return {
          testName: testCase.name,
          pluginName: testCase.plugin.metadata.name,
          success: true,
          duration,
          state: this.registry.getPlugin(testCase.plugin.metadata.name)?.state,
        }
      }

      const duration = Date.now() - startTime
      return {
        testName: testCase.name,
        pluginName: testCase.plugin.metadata.name,
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        duration,
        state: this.registry.getPlugin(testCase.plugin.metadata.name)?.state,
      }
    }
  }

  async runTestSuite(suite: PluginTestSuite): Promise<PluginTestSuiteResult> {
    const startTime = Date.now()
    const results: PluginTestResult[] = []

    try {
      // Suite setup
      if (suite.setup) {
        await suite.setup(this.registry)
      }

      // Run all tests
      for (const testCase of suite.tests) {
        const result = await this.runTest(testCase)
        results.push(result)
      }

      // Suite teardown
      if (suite.teardown) {
        await suite.teardown(this.registry)
      }
    } catch (error) {
      // If suite setup/teardown fails, mark all tests as failed
      for (const testCase of suite.tests) {
        if (!results.find(r => r.testName === testCase.name)) {
          results.push({
            testName: testCase.name,
            pluginName: testCase.plugin.metadata.name,
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
            duration: 0,
          })
        }
      }
    }

    const duration = Date.now() - startTime
    const passedTests = results.filter(r => r.success).length
    const failedTests = results.length - passedTests

    return {
      suiteName: suite.name,
      results,
      totalTests: results.length,
      passedTests,
      failedTests,
      duration,
    }
  }

  // Helper methods for common test scenarios
  createPluginLoadTest(plugin: PluginDefinition, config?: Record<string, unknown>): PluginTestCase {
    return {
      name: `Load plugin ${plugin.metadata.name}`,
      plugin,
      config,
      test: async context => {
        const loadResult = await context.registry.loadPlugin(context.pluginName)
        if (Result.isErr(loadResult)) {
          throw new Error(`Failed to load plugin: ${loadResult.error.message}`)
        }
      },
      expectedState: 'loaded',
    }
  }

  createPluginEnableTest(
    plugin: PluginDefinition,
    config?: Record<string, unknown>
  ): PluginTestCase {
    return {
      name: `Enable plugin ${plugin.metadata.name}`,
      plugin,
      config,
      test: async context => {
        // Load first
        const loadResult = await context.registry.loadPlugin(context.pluginName)
        if (Result.isErr(loadResult)) {
          throw new Error(`Failed to load plugin: ${loadResult.error.message}`)
        }

        // Then enable
        const enableResult = await context.registry.enablePlugin(context.pluginName)
        if (Result.isErr(enableResult)) {
          throw new Error(`Failed to enable plugin: ${enableResult.error.message}`)
        }
      },
      expectedState: 'enabled',
    }
  }

  createPluginLifecycleTest(
    plugin: PluginDefinition,
    config?: Record<string, unknown>
  ): PluginTestCase {
    return {
      name: `Full lifecycle test for ${plugin.metadata.name}`,
      plugin,
      config,
      test: async context => {
        const { registry, pluginName } = context

        // Load
        const loadResult = await registry.loadPlugin(pluginName)
        if (Result.isErr(loadResult)) {
          throw new Error(`Failed to load plugin: ${loadResult.error.message}`)
        }

        let pluginInstance = registry.getPlugin(pluginName)
        if (pluginInstance?.state !== 'loaded') {
          throw new Error(`Expected loaded state, got ${pluginInstance?.state}`)
        }

        // Enable
        const enableResult = await registry.enablePlugin(pluginName)
        if (Result.isErr(enableResult)) {
          throw new Error(`Failed to enable plugin: ${enableResult.error.message}`)
        }

        pluginInstance = registry.getPlugin(pluginName)
        if (pluginInstance?.state !== 'enabled') {
          throw new Error(`Expected enabled state, got ${pluginInstance?.state}`)
        }

        // Health check
        const healthResult = await registry.checkPluginHealth(pluginName)
        if (Result.isErr(healthResult)) {
          throw new Error(`Health check failed: ${healthResult.error.message}`)
        }

        // Disable
        const disableResult = await registry.disablePlugin(pluginName)
        if (Result.isErr(disableResult)) {
          throw new Error(`Failed to disable plugin: ${disableResult.error.message}`)
        }

        pluginInstance = registry.getPlugin(pluginName)
        if (pluginInstance?.state !== 'disabled') {
          throw new Error(`Expected disabled state, got ${pluginInstance?.state}`)
        }

        // Unload
        const unloadResult = await registry.unloadPlugin(pluginName)
        if (Result.isErr(unloadResult)) {
          throw new Error(`Failed to unload plugin: ${unloadResult.error.message}`)
        }

        pluginInstance = registry.getPlugin(pluginName)
        if (pluginInstance?.state !== 'unloaded') {
          throw new Error(`Expected unloaded state, got ${pluginInstance?.state}`)
        }
      },
    }
  }

  createHookTest(
    plugin: PluginDefinition,
    hookType: 'resource' | 'pipeline' | 'repository' | 'global',
    testHook: (context: PluginTestContext) => Promise<void> | void,
    config?: Record<string, unknown>
  ): PluginTestCase {
    return {
      name: `Hook test for ${plugin.metadata.name} (${hookType})`,
      plugin,
      config,
      test: async context => {
        // Load and enable plugin
        const loadResult = await context.registry.loadPlugin(context.pluginName)
        if (Result.isErr(loadResult)) {
          throw new Error(`Failed to load plugin: ${loadResult.error.message}`)
        }

        const enableResult = await context.registry.enablePlugin(context.pluginName)
        if (Result.isErr(enableResult)) {
          throw new Error(`Failed to enable plugin: ${enableResult.error.message}`)
        }

        // Test the hook
        await testHook(context)
      },
      expectedState: 'enabled',
    }
  }

  createDependencyTest(
    plugin: PluginDefinition,
    dependencies: PluginDefinition[],
    config?: Record<string, unknown>
  ): PluginTestCase {
    return {
      name: `Dependency test for ${plugin.metadata.name}`,
      plugin,
      config,
      setup: async context => {
        // Register dependencies first
        for (const dep of dependencies) {
          const registerResult = context.registry.registerPlugin(dep)
          if (Result.isErr(registerResult)) {
            throw new Error(
              `Failed to register dependency ${dep.metadata.name}: ${registerResult.error.message}`
            )
          }

          const loadResult = await context.registry.loadPlugin(dep.metadata.name)
          if (Result.isErr(loadResult)) {
            throw new Error(
              `Failed to load dependency ${dep.metadata.name}: ${loadResult.error.message}`
            )
          }
        }
      },
      test: async context => {
        const loadResult = await context.registry.loadPlugin(context.pluginName)
        if (Result.isErr(loadResult)) {
          throw new Error(`Failed to load plugin with dependencies: ${loadResult.error.message}`)
        }
      },
      expectedState: 'loaded',
    }
  }
}

// Factory functions for creating common test scenarios
export function createPluginTestSuite(name: string, tests: PluginTestCase[]): PluginTestSuite {
  return {
    name,
    tests,
  }
}

export function createSimplePluginTest(
  name: string,
  plugin: PluginDefinition,
  testFn: (context: PluginTestContext) => Promise<void> | void,
  config?: Record<string, any>
): PluginTestCase {
  return {
    name,
    plugin,
    config,
    test: testFn,
  }
}

// Plugin test utilities
export const pluginTestUtils = {
  /**
   * Create a mock plugin for testing
   */
  createMockPlugin(name: string, overrides: Partial<PluginDefinition> = {}): PluginDefinition {
    return {
      metadata: {
        name,
        version: '1.0.0',
        description: `Mock plugin ${name}`,
      },
      onLoad: () => {
        // Mock load
      },
      onUnload: () => {
        // Mock unload
      },
      onEnable: () => {
        // Mock enable
      },
      onDisable: () => {
        // Mock disable
      },
      healthCheck: () => true,
      ...overrides,
    }
  },

  /**
   * Create a failing plugin for error testing
   */
  createFailingPlugin(
    name: string,
    failOn: 'load' | 'enable' | 'disable' | 'unload' = 'load'
  ): PluginDefinition {
    const plugin: PluginDefinition = {
      metadata: {
        name,
        version: '1.0.0',
        description: `Failing plugin ${name}`,
      },
      onLoad: () => {
        if (failOn === 'load') throw new Error(`Plugin ${name} failed to load`)
      },
      onEnable: () => {
        if (failOn === 'enable') throw new Error(`Plugin ${name} failed to enable`)
      },
      onDisable: () => {
        if (failOn === 'disable') throw new Error(`Plugin ${name} failed to disable`)
      },
      onUnload: () => {
        if (failOn === 'unload') throw new Error(`Plugin ${name} failed to unload`)
      },
      healthCheck: () => false,
    }

    return plugin
  },

  /**
   * Create a plugin with dependencies
   */
  createPluginWithDependencies(name: string, dependencies: string[]): PluginDefinition {
    return {
      metadata: {
        name,
        version: '1.0.0',
        description: `Plugin ${name} with dependencies`,
        dependencies,
      },
      onLoad: () => {
        // Mock load
      },
    }
  },
}

export default PluginTester
