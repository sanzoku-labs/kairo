import { Result } from './result'
import { getGlobalPluginRegistry } from './plugin-registry'
import type { ResourceHookContext, PipelineHookContext, RepositoryHookContext } from './plugin'

// Integration utilities for Resources (INTERFACE pillar)
export class ResourcePluginIntegration {
  static async beforeRequest(
    resourceName: string,
    operation: string,
    request: any,
    context: Partial<ResourceHookContext> = {}
  ): Promise<any> {
    const registry = getGlobalPluginRegistry()
    const hookContext: ResourceHookContext = {
      pluginName: '',
      timestamp: Date.now(),
      resourceName,
      operation,
      ...context,
    }

    const results = await registry.executeResourceHooks('beforeRequest', hookContext, request)

    // Apply transformations in sequence
    let transformedRequest = request
    for (const result of results) {
      if (result !== undefined) {
        transformedRequest = result
      }
    }

    return transformedRequest
  }

  static async afterRequest(
    resourceName: string,
    operation: string,
    response: any,
    request: any,
    context: Partial<ResourceHookContext> = {}
  ): Promise<any> {
    const registry = getGlobalPluginRegistry()
    const hookContext: ResourceHookContext = {
      pluginName: '',
      timestamp: Date.now(),
      resourceName,
      operation,
      ...context,
    }

    const results = await registry.executeResourceHooks(
      'afterRequest',
      hookContext,
      response,
      request
    )

    // Apply transformations in sequence
    let transformedResponse = response
    for (const result of results) {
      if (result !== undefined) {
        transformedResponse = result
      }
    }

    return transformedResponse
  }

  static async onError(
    resourceName: string,
    operation: string,
    error: any,
    context: Partial<ResourceHookContext> = {}
  ): Promise<{ retry?: boolean; error?: any }> {
    const registry = getGlobalPluginRegistry()
    const hookContext: ResourceHookContext = {
      pluginName: '',
      timestamp: Date.now(),
      resourceName,
      operation,
      ...context,
    }

    const results = await registry.executeResourceHooks('onError', hookContext, error)

    // Check if any plugin wants to retry
    let shouldRetry = false
    let transformedError = error

    for (const result of results) {
      if (result?.retry) {
        shouldRetry = true
      }
      if (result?.error !== undefined) {
        transformedError = result.error
      }
    }

    return { retry: shouldRetry, error: transformedError }
  }

  static async onSuccess(
    resourceName: string,
    operation: string,
    response: any,
    context: Partial<ResourceHookContext> = {}
  ): Promise<void> {
    const registry = getGlobalPluginRegistry()
    const hookContext: ResourceHookContext = {
      pluginName: '',
      timestamp: Date.now(),
      resourceName,
      operation,
      ...context,
    }

    await registry.executeResourceHooks('onSuccess', hookContext, response)
  }
}

// Integration utilities for Pipelines (PROCESS pillar)
export class PipelinePluginIntegration {
  static async beforeExecute(
    pipelineName: string,
    input: any,
    context: Partial<PipelineHookContext> = {}
  ): Promise<any> {
    const registry = getGlobalPluginRegistry()
    const hookContext: PipelineHookContext = {
      pluginName: '',
      timestamp: Date.now(),
      pipelineName,
      ...context,
    }

    const results = await registry.executePipelineHooks('beforeExecute', hookContext, input)

    // Apply transformations in sequence
    let transformedInput = input
    for (const result of results) {
      if (result !== undefined) {
        transformedInput = result
      }
    }

    return transformedInput
  }

  static async afterExecute(
    pipelineName: string,
    output: any,
    input: any,
    context: Partial<PipelineHookContext> = {}
  ): Promise<any> {
    const registry = getGlobalPluginRegistry()
    const hookContext: PipelineHookContext = {
      pluginName: '',
      timestamp: Date.now(),
      pipelineName,
      ...context,
    }

    const results = await registry.executePipelineHooks('afterExecute', hookContext, output, input)

    // Apply transformations in sequence
    let transformedOutput = output
    for (const result of results) {
      if (result !== undefined) {
        transformedOutput = result
      }
    }

    return transformedOutput
  }

  static async beforeStep(
    pipelineName: string,
    stepName: string,
    stepIndex: number,
    input: any,
    context: Partial<PipelineHookContext> = {}
  ): Promise<any> {
    const registry = getGlobalPluginRegistry()
    const hookContext: PipelineHookContext = {
      pluginName: '',
      timestamp: Date.now(),
      pipelineName,
      stepName,
      stepIndex,
      ...context,
    }

    const results = await registry.executePipelineHooks('beforeStep', hookContext, input)

    // Apply transformations in sequence
    let transformedInput = input
    for (const result of results) {
      if (result !== undefined) {
        transformedInput = result
      }
    }

    return transformedInput
  }

  static async afterStep(
    pipelineName: string,
    stepName: string,
    stepIndex: number,
    output: any,
    input: any,
    context: Partial<PipelineHookContext> = {}
  ): Promise<any> {
    const registry = getGlobalPluginRegistry()
    const hookContext: PipelineHookContext = {
      pluginName: '',
      timestamp: Date.now(),
      pipelineName,
      stepName,
      stepIndex,
      ...context,
    }

    const results = await registry.executePipelineHooks('afterStep', hookContext, output, input)

    // Apply transformations in sequence
    let transformedOutput = output
    for (const result of results) {
      if (result !== undefined) {
        transformedOutput = result
      }
    }

    return transformedOutput
  }

  static async onError(
    pipelineName: string,
    error: any,
    context: Partial<PipelineHookContext> = {}
  ): Promise<any> {
    const registry = getGlobalPluginRegistry()
    const hookContext: PipelineHookContext = {
      pluginName: '',
      timestamp: Date.now(),
      pipelineName,
      ...context,
    }

    const results = await registry.executePipelineHooks('onError', hookContext, error)

    // Return the last non-undefined result or original error
    for (let i = results.length - 1; i >= 0; i--) {
      if (results[i] !== undefined) {
        return results[i]
      }
    }

    return error
  }

  static async onComplete(
    pipelineName: string,
    output: any,
    context: Partial<PipelineHookContext> = {}
  ): Promise<void> {
    const registry = getGlobalPluginRegistry()
    const hookContext: PipelineHookContext = {
      pluginName: '',
      timestamp: Date.now(),
      pipelineName,
      ...context,
    }

    await registry.executePipelineHooks('onComplete', hookContext, output)
  }
}

// Integration utilities for Repositories (DATA pillar)
export class RepositoryPluginIntegration {
  static async beforeCreate(
    repositoryName: string,
    data: any,
    context: Partial<RepositoryHookContext> = {}
  ): Promise<any> {
    const registry = getGlobalPluginRegistry()
    const hookContext: RepositoryHookContext = {
      pluginName: '',
      timestamp: Date.now(),
      repositoryName,
      operation: 'create',
      ...context,
    }

    const results = await registry.executeRepositoryHooks('beforeCreate', hookContext, data)

    // Apply transformations in sequence
    let transformedData = data
    for (const result of results) {
      if (result !== undefined) {
        transformedData = result
      }
    }

    return transformedData
  }

  static async afterCreate(
    repositoryName: string,
    entity: any,
    context: Partial<RepositoryHookContext> = {}
  ): Promise<any> {
    const registry = getGlobalPluginRegistry()
    const hookContext: RepositoryHookContext = {
      pluginName: '',
      timestamp: Date.now(),
      repositoryName,
      operation: 'create',
      entityId: entity?.id,
      ...context,
    }

    const results = await registry.executeRepositoryHooks('afterCreate', hookContext, entity)

    // Apply transformations in sequence
    let transformedEntity = entity
    for (const result of results) {
      if (result !== undefined) {
        transformedEntity = result
      }
    }

    return transformedEntity
  }

  static async beforeUpdate(
    repositoryName: string,
    id: any,
    data: any,
    context: Partial<RepositoryHookContext> = {}
  ): Promise<any> {
    const registry = getGlobalPluginRegistry()
    const hookContext: RepositoryHookContext = {
      pluginName: '',
      timestamp: Date.now(),
      repositoryName,
      operation: 'update',
      entityId: id,
      ...context,
    }

    const results = await registry.executeRepositoryHooks('beforeUpdate', hookContext, id, data)

    // Apply transformations in sequence
    let transformedData = data
    for (const result of results) {
      if (result !== undefined) {
        transformedData = result
      }
    }

    return transformedData
  }

  static async afterUpdate(
    repositoryName: string,
    entity: any,
    context: Partial<RepositoryHookContext> = {}
  ): Promise<any> {
    const registry = getGlobalPluginRegistry()
    const hookContext: RepositoryHookContext = {
      pluginName: '',
      timestamp: Date.now(),
      repositoryName,
      operation: 'update',
      entityId: entity?.id,
      ...context,
    }

    const results = await registry.executeRepositoryHooks('afterUpdate', hookContext, entity)

    // Apply transformations in sequence
    let transformedEntity = entity
    for (const result of results) {
      if (result !== undefined) {
        transformedEntity = result
      }
    }

    return transformedEntity
  }

  static async beforeDelete(
    repositoryName: string,
    id: any,
    context: Partial<RepositoryHookContext> = {}
  ): Promise<void> {
    const registry = getGlobalPluginRegistry()
    const hookContext: RepositoryHookContext = {
      pluginName: '',
      timestamp: Date.now(),
      repositoryName,
      operation: 'delete',
      entityId: id,
      ...context,
    }

    await registry.executeRepositoryHooks('beforeDelete', hookContext, id)
  }

  static async afterDelete(
    repositoryName: string,
    id: any,
    context: Partial<RepositoryHookContext> = {}
  ): Promise<void> {
    const registry = getGlobalPluginRegistry()
    const hookContext: RepositoryHookContext = {
      pluginName: '',
      timestamp: Date.now(),
      repositoryName,
      operation: 'delete',
      entityId: id,
      ...context,
    }

    await registry.executeRepositoryHooks('afterDelete', hookContext, id)
  }

  static async beforeFind(
    repositoryName: string,
    id: any,
    context: Partial<RepositoryHookContext> = {}
  ): Promise<void> {
    const registry = getGlobalPluginRegistry()
    const hookContext: RepositoryHookContext = {
      pluginName: '',
      timestamp: Date.now(),
      repositoryName,
      operation: 'find',
      entityId: id,
      ...context,
    }

    await registry.executeRepositoryHooks('beforeFind', hookContext, id)
  }

  static async afterFind(
    repositoryName: string,
    entity: any,
    context: Partial<RepositoryHookContext> = {}
  ): Promise<any> {
    const registry = getGlobalPluginRegistry()
    const hookContext: RepositoryHookContext = {
      pluginName: '',
      timestamp: Date.now(),
      repositoryName,
      operation: 'find',
      entityId: entity?.id,
      ...context,
    }

    const results = await registry.executeRepositoryHooks('afterFind', hookContext, entity)

    // Apply transformations in sequence
    let transformedEntity = entity
    for (const result of results) {
      if (result !== undefined) {
        transformedEntity = result
      }
    }

    return transformedEntity
  }
}

// Global hook integration
export class GlobalPluginIntegration {
  static async onOperation(
    operation: string,
    pillar: 'interface' | 'process' | 'data',
    duration: number
  ): Promise<void> {
    const registry = getGlobalPluginRegistry()
    await registry.executeGlobalHooks('onOperation', operation, pillar, duration)
  }

  static async onError(
    error: any,
    pillar: 'interface' | 'process' | 'data',
    operation: string
  ): Promise<void> {
    const registry = getGlobalPluginRegistry()
    await registry.executeGlobalHooks('onError', error, pillar, operation)
  }

  static async onPerformance(metrics: {
    operation: string
    pillar: string
    duration: number
    memoryUsage?: number
    cpuUsage?: number
    timestamp: number
  }): Promise<void> {
    const registry = getGlobalPluginRegistry()
    await registry.executeGlobalHooks('onPerformance', metrics)
  }
}

// Extension access utilities
export function getPluginExtensions() {
  const registry = getGlobalPluginRegistry()

  return {
    schemas: registry.getSchemaExtensions(),
    rules: registry.getRuleExtensions(),
    pipelineSteps: registry.getPipelineSteps(),
    storageAdapters: registry.getStorageAdapters(),
  }
}
