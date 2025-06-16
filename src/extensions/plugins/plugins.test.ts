import { describe, it, expect, beforeEach } from 'vitest'
import { Result } from '../../core/result'
import {
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
  PluginValidationError,
  PluginDependencyError,
  PluginLifecycleError,
} from './plugins'
import { nativeSchema as schema } from '../../core/native-schema'
import { PluginRegistry, setGlobalPluginRegistry } from './plugin-registry'
import { PluginTester, pluginTestUtils } from '../../testing/plugin-testing'

describe('Plugin System', () => {
  let registry: PluginRegistry

  beforeEach(() => {
    registry = new PluginRegistry()
    setGlobalPluginRegistry(registry)
  })

  describe('Plugin Creation', () => {
    it('should create a plugin with minimal configuration', () => {
      const plugin = createPlugin('test-plugin', {
        onLoad: () => {
          console.log('Plugin loaded')
        },
      })

      expect(plugin.metadata.name).toBe('test-plugin')
      expect(plugin.metadata.version).toBe('1.0.0')
      expect(plugin.metadata.description).toBe('Plugin: test-plugin')
      expect(plugin.onLoad).toBeDefined()
    })

    it('should create a plugin with full metadata', () => {
      const plugin = createPlugin('advanced-plugin', {
        metadata: {
          version: '2.1.0',
          description: 'An advanced plugin',
          author: 'Test Author',
          homepage: 'https://example.com',
          keywords: ['test', 'plugin'],
          dependencies: ['other-plugin'],
        },
      })

      expect(plugin.metadata.name).toBe('advanced-plugin')
      expect(plugin.metadata.version).toBe('2.1.0')
      expect(plugin.metadata.description).toBe('An advanced plugin')
      expect(plugin.metadata.author).toBe('Test Author')
      expect(plugin.metadata.dependencies).toEqual(['other-plugin'])
    })
  })

  describe('Plugin Registration', () => {
    it('should register a valid plugin', () => {
      const plugin = createPlugin('valid-plugin', {})
      const result = registerPlugin(plugin)

      expect(Result.isOk(result)).toBe(true)
      expect(getPlugin('valid-plugin')).toBeDefined()
    })

    it('should reject plugins with invalid names', () => {
      const plugin = createPlugin('', {})
      const result = registerPlugin(plugin)

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(PluginValidationError)
      }
    })

    it('should reject plugins with invalid versions', () => {
      const plugin = createPlugin('invalid-version', {
        metadata: { version: 'not-semver' },
      })
      const result = registerPlugin(plugin)

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(PluginValidationError)
      }
    })

    it('should reject duplicate plugin names', () => {
      const plugin1 = createPlugin('duplicate', {})
      const plugin2 = createPlugin('duplicate', {})

      const result1 = registerPlugin(plugin1)
      const result2 = registerPlugin(plugin2)

      expect(Result.isOk(result1)).toBe(true)
      expect(Result.isErr(result2)).toBe(true)
      if (Result.isErr(result2)) {
        expect(result2.error).toBeInstanceOf(PluginValidationError)
      }
    })
  })

  describe('Plugin Lifecycle', () => {
    it('should load a registered plugin', async () => {
      const plugin = createPlugin('loadable-plugin', {
        onLoad: () => {
          console.log('Plugin loaded')
        },
      })

      registerPlugin(plugin)
      const result = await loadPlugin('loadable-plugin')

      expect(Result.isOk(result)).toBe(true)
      expect(getPlugin('loadable-plugin')?.state).toBe('loaded')
    })

    it('should enable a loaded plugin', async () => {
      const plugin = createPlugin('enableable-plugin', {
        onLoad: () => {},
        onEnable: () => {},
      })

      registerPlugin(plugin)
      await loadPlugin('enableable-plugin')
      const result = await enablePlugin('enableable-plugin')

      expect(Result.isOk(result)).toBe(true)
      expect(getPlugin('enableable-plugin')?.state).toBe('enabled')
    })

    it('should disable an enabled plugin', async () => {
      const plugin = createPlugin('disableable-plugin', {
        onLoad: () => {},
        onEnable: () => {},
        onDisable: () => {},
      })

      registerPlugin(plugin)
      await loadPlugin('disableable-plugin')
      await enablePlugin('disableable-plugin')
      const result = await disablePlugin('disableable-plugin')

      expect(Result.isOk(result)).toBe(true)
      expect(getPlugin('disableable-plugin')?.state).toBe('disabled')
    })

    it('should unload a plugin', async () => {
      const plugin = createPlugin('unloadable-plugin', {
        onLoad: () => {},
        onUnload: () => {},
      })

      registerPlugin(plugin)
      await loadPlugin('unloadable-plugin')
      const result = await unloadPlugin('unloadable-plugin')

      expect(Result.isOk(result)).toBe(true)
      expect(getPlugin('unloadable-plugin')?.state).toBe('unloaded')
    })

    it('should handle plugin load failures', async () => {
      const plugin = createPlugin('failing-plugin', {
        onLoad: () => {
          throw new Error('Load failed')
        },
      })

      registerPlugin(plugin)
      const result = await loadPlugin('failing-plugin')

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(PluginLifecycleError)
      }
      expect(getPlugin('failing-plugin')?.state).toBe('failed')
    })
  })

  describe('Plugin Dependencies', () => {
    it('should handle plugins with dependencies', async () => {
      const dependency = createPlugin('dependency-plugin', {})
      const dependent = createPlugin('dependent-plugin', {
        metadata: { dependencies: ['dependency-plugin'] },
      })

      registerPlugin(dependency)
      registerPlugin(dependent)

      await loadPlugin('dependent-plugin')

      expect(getPlugin('dependency-plugin')?.state).toBe('loaded')
      expect(getPlugin('dependent-plugin')?.state).toBe('loaded')
    })

    it('should reject plugins with missing dependencies', () => {
      const plugin = createPlugin('missing-deps', {
        metadata: { dependencies: ['non-existent-plugin'] },
      })

      const result = registerPlugin(plugin)

      expect(Result.isErr(result)).toBe(true)
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(PluginDependencyError)
      }
    })
  })

  describe('Plugin Hooks', () => {
    it('should register resource hooks', () => {
      const plugin = createPlugin('resource-hook-plugin', {
        resourceHooks: {
          beforeRequest: request => {
            const headers = request.headers ?? {}
            request.headers = { ...headers, 'X-Plugin': 'test' }
            return request
          },
        },
      })

      registerPlugin(plugin)
      expect(
        getPlugin('resource-hook-plugin')?.definition.resourceHooks?.beforeRequest
      ).toBeDefined()
    })

    it('should register pipeline hooks', () => {
      const plugin = createPlugin('pipeline-hook-plugin', {
        pipelineHooks: {
          beforeExecute: input => {
            return { ...(input as Record<string, unknown>), pluginProcessed: true }
          },
        },
      })

      registerPlugin(plugin)
      expect(
        getPlugin('pipeline-hook-plugin')?.definition.pipelineHooks?.beforeExecute
      ).toBeDefined()
    })

    it('should register repository hooks', () => {
      const plugin = createPlugin('repo-hook-plugin', {
        repositoryHooks: {
          beforeCreate: data => {
            return { ...data, createdByPlugin: true }
          },
        },
      })

      registerPlugin(plugin)
      expect(getPlugin('repo-hook-plugin')?.definition.repositoryHooks?.beforeCreate).toBeDefined()
    })
  })

  describe('Plugin Extensions', () => {
    it('should provide schema extensions', async () => {
      const plugin = createPlugin('schema-extension-plugin', {
        schemaExtensions: {
          user: {
            pluginField: schema.string(),
          },
        },
      })

      registerPlugin(plugin)
      await loadAndEnablePlugin('schema-extension-plugin')

      const extensions = getExtensions()
      expect(extensions.schemas.user).toBeDefined()
      expect(extensions.schemas.user?.pluginField).toBeDefined()
      if (extensions.schemas.user?.pluginField) {
        expect(typeof extensions.schemas.user.pluginField).toBe('object')
      }
    })

    it('should provide rule extensions', async () => {
      const plugin = createPlugin('rule-extension-plugin', {
        ruleExtensions: {
          customRule:
            (..._args: unknown[]) =>
            (_value: unknown, _context?: unknown) =>
              true,
        },
      })

      registerPlugin(plugin)
      await loadAndEnablePlugin('rule-extension-plugin')

      const extensions = getExtensions()
      expect(extensions.rules.customRule).toBeDefined()
      expect(typeof extensions.rules.customRule).toBe('function')
    })

    it('should provide pipeline steps', async () => {
      const plugin = createPlugin('pipeline-step-plugin', {
        pipelineSteps: {
          customStep: () => (data: unknown) => ({
            ...(data as Record<string, unknown>),
            processed: true,
          }),
        },
      })

      registerPlugin(plugin)
      await loadAndEnablePlugin('pipeline-step-plugin')

      const extensions = getExtensions()
      expect(extensions.pipelineSteps.customStep).toBeDefined()
      expect(typeof extensions.pipelineSteps.customStep).toBe('function')
    })

    it('should provide storage adapters', async () => {
      const plugin = createPlugin('storage-adapter-plugin', {
        storageAdapters: {
          customStorage: class CustomStorageAdapter {
            create(_data: Record<string, unknown>) {
              return Promise.resolve(Result.Ok({}))
            }
            findMany(_query?: Record<string, unknown>) {
              return Promise.resolve(Result.Ok([]))
            }
          },
        },
      })

      registerPlugin(plugin)
      await loadAndEnablePlugin('storage-adapter-plugin')

      const extensions = getExtensions()
      expect(extensions.storageAdapters.customStorage).toBeDefined()
      expect(typeof extensions.storageAdapters.customStorage).toBe('function')
    })
  })

  describe('Plugin Health', () => {
    it('should check plugin health', async () => {
      const plugin = createPlugin('healthy-plugin', {
        healthCheck: () => true,
      })

      registerPlugin(plugin)
      await loadAndEnablePlugin('healthy-plugin')

      const result = await checkPluginHealth('healthy-plugin')
      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe(true)
      }
    })

    it('should detect unhealthy plugins', async () => {
      const plugin = createPlugin('unhealthy-plugin', {
        healthCheck: () => false,
      })

      registerPlugin(plugin)
      await loadAndEnablePlugin('unhealthy-plugin')

      const result = await checkPluginHealth('unhealthy-plugin')
      expect(Result.isOk(result)).toBe(true)
      if (Result.isOk(result)) {
        expect(result.value).toBe(false)
      }
    })
  })

  describe('Plugin Listing', () => {
    it('should list all plugins', () => {
      const plugin1 = createPlugin('plugin-1', {})
      const plugin2 = createPlugin('plugin-2', {})

      registerPlugin(plugin1)
      registerPlugin(plugin2)

      const plugins = listPlugins()
      expect(plugins).toHaveLength(2)
      expect(plugins.map(p => p?.definition.metadata.name)).toContain('plugin-1')
      expect(plugins.map(p => p?.definition.metadata.name)).toContain('plugin-2')
    })

    it('should list only enabled plugins', async () => {
      const plugin1 = createPlugin('enabled-plugin', {})
      const plugin2 = createPlugin('disabled-plugin', {})

      registerPlugin(plugin1)
      registerPlugin(plugin2)

      await loadAndEnablePlugin('enabled-plugin')

      await loadPlugin('disabled-plugin')
      // Don't enable plugin2

      const enabledPlugins = listEnabledPlugins()
      expect(enabledPlugins).toHaveLength(1)
      expect(enabledPlugins[0]?.definition.metadata.name).toBe('enabled-plugin')
    })
  })
})

describe('Plugin Testing Framework', () => {
  let tester: PluginTester

  beforeEach(() => {
    tester = new PluginTester()
  })

  describe('Plugin Test Utilities', () => {
    it('should create a mock plugin', () => {
      const mockPlugin = pluginTestUtils.createMockPlugin('mock-test')
      expect(mockPlugin.metadata.name).toBe('mock-test')
      expect(mockPlugin.metadata.version).toBe('1.0.0')
      expect(mockPlugin.onLoad).toBeDefined()
    })

    it('should create a failing plugin', () => {
      const failingPlugin = pluginTestUtils.createFailingPlugin('failing-test', 'load')
      expect(failingPlugin.metadata.name).toBe('failing-test')
      expect(failingPlugin.onLoad).toBeDefined()
    })

    it('should create a plugin with dependencies', () => {
      const plugin = pluginTestUtils.createPluginWithDependencies('dep-test', ['dep1', 'dep2'])
      expect(plugin.metadata.dependencies).toEqual(['dep1', 'dep2'])
    })
  })

  describe('Plugin Test Execution', () => {
    it('should run a simple plugin test', async () => {
      const plugin = pluginTestUtils.createMockPlugin('test-plugin')
      const testCase = tester.createPluginLoadTest(plugin)

      const result = await tester.runTest(testCase)

      expect(result.success).toBe(true)
      expect(result.state).toBe('loaded')
      expect(result.duration).toBeGreaterThan(0)
    })

    it('should run a plugin enable test', async () => {
      const plugin = pluginTestUtils.createMockPlugin('enable-test')
      const testCase = tester.createPluginEnableTest(plugin)

      const result = await tester.runTest(testCase)

      expect(result.success).toBe(true)
      expect(result.state).toBe('enabled')
    })

    it('should run a full lifecycle test', async () => {
      const plugin = pluginTestUtils.createMockPlugin('lifecycle-test')
      const testCase = tester.createPluginLifecycleTest(plugin)

      const result = await tester.runTest(testCase)

      expect(result.success).toBe(true)
      expect(result.state).toBe('unloaded')
    })

    it('should handle test failures', async () => {
      const plugin = pluginTestUtils.createFailingPlugin('failing-test', 'load')
      const testCase = tester.createPluginLoadTest(plugin)

      const result = await tester.runTest(testCase)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.state).toBe('failed')
    })
  })

  describe('Plugin Test Suites', () => {
    it('should run a complete test suite', async () => {
      const plugin1 = pluginTestUtils.createMockPlugin('suite-test-1')
      const plugin2 = pluginTestUtils.createMockPlugin('suite-test-2')
      const plugin3 = pluginTestUtils.createMockPlugin('suite-test-3')
      const testSuite = {
        name: 'Test Suite',
        tests: [
          tester.createPluginLoadTest(plugin1),
          tester.createPluginEnableTest(plugin2),
          tester.createPluginLifecycleTest(plugin3),
        ],
      }

      const result = await tester.runTestSuite(testSuite)

      expect(result.suiteName).toBe('Test Suite')
      expect(result.totalTests).toBe(3)
      expect(result.passedTests).toBe(3)
      expect(result.failedTests).toBe(0)
      expect(result.duration).toBeGreaterThan(0)
    })
  })
})
