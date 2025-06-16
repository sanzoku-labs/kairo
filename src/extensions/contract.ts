import { Result } from '../core/result'
import type { KairoError } from '../core/errors'
import type { ResourceConfig, ResourceMethod } from '../core/resource'
import type { Schema } from '../core/native-schema'

export interface VerifyOptions {
  timeout?: number
  headers?: Record<string, string>
  retries?: number
  validateResponses?: boolean
}

export interface ContractValidation {
  urlExists: boolean
  schemaMatches: boolean
  methodSupported: boolean
  authenticationWorks: boolean
}

export interface ContractPerformance {
  responseTime: number
  availability: number
}

export interface ContractError {
  endpoint: string
  type: 'network' | 'schema' | 'method' | 'auth' | 'unknown'
  message: string
  details?: unknown
}

export interface ContractResult {
  success: boolean
  endpoint: string
  validations: ContractValidation
  errors: ContractError[]
  performance: ContractPerformance
}

export interface TestCase {
  name: string
  method: string
  endpoint: string
  params?: Record<string, unknown>
  body?: unknown
  expectedStatus?: number
  expectedSchema?: Schema<unknown>
}

export interface TestSuite {
  name: string
  baseURL?: string
  tests: TestCase[]
}

export interface MockScenario {
  success?: unknown
  failure?: KairoError
  delay?: number
  probability?: number
}

export type MockScenarios<T extends ResourceConfig> = {
  [K in keyof T]?: MockScenario
}

export type MockedResourceMethod = {
  run: (params?: unknown) => Promise<Result<KairoError, unknown>>
  scenario: MockScenario
}

export type MockedResource<T extends ResourceConfig> = {
  [K in keyof T]: T[K] extends ResourceMethod ? MockedResourceMethod : never
}

export interface ResourceContract<T extends ResourceConfig> {
  verify(baseURL?: string, options?: VerifyOptions): Promise<ContractResult>
  generateTests(): TestSuite
  mock(scenarios: MockScenarios<T>): MockedResource<T>
}

export class ContractVerifier<T extends ResourceConfig> implements ResourceContract<T> {
  constructor(
    private resourceName: string,
    private config: T
  ) {}

  async verify(baseURL?: string, options: VerifyOptions = {}): Promise<ContractResult> {
    const results: ContractResult[] = []

    for (const [methodName, methodConfig] of Object.entries(this.config)) {
      if (typeof methodConfig === 'object' && 'path' in methodConfig) {
        const result = await this.verifyMethod(
          methodName,
          methodConfig as ResourceMethod,
          baseURL,
          options
        )
        results.push(result)
      }
    }

    return this.aggregateResults(results)
  }

  private async verifyMethod(
    _methodName: string,
    method: ResourceMethod,
    baseURL?: string,
    options: VerifyOptions = {}
  ): Promise<ContractResult> {
    const endpoint = `${baseURL || ''}${method.path}`
    const startTime = Date.now()

    const validations: ContractValidation = {
      urlExists: false,
      schemaMatches: false,
      methodSupported: false,
      authenticationWorks: true,
    }

    const errors: ContractError[] = []

    try {
      const response = await this.makeTestRequest(endpoint, method, options)
      const responseTime = Date.now() - startTime

      validations.urlExists = response.ok
      validations.methodSupported = true

      if (options.validateResponses && method.response && response.ok) {
        try {
          const data = await response.json()
          const parseResult = method.response.parse(data)
          if (parseResult.tag === 'Ok') {
            validations.schemaMatches = true
          } else {
            validations.schemaMatches = false
            errors.push({
              endpoint,
              type: 'schema',
              message: parseResult.error.message,
              details: parseResult.error,
            })
          }
        } catch (error) {
          validations.schemaMatches = false
          errors.push({
            endpoint,
            type: 'schema',
            message: 'Failed to parse response',
            details: error,
          })
        }
      } else if (!options.validateResponses || !method.response) {
        // If we're not validating responses or there's no response schema, consider it a match
        validations.schemaMatches = true
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          validations.authenticationWorks = false
          errors.push({
            endpoint,
            type: 'auth',
            message: `Authentication failed with status ${response.status}`,
          })
        } else {
          errors.push({
            endpoint,
            type: 'network',
            message: `Request failed with status ${response.status}`,
          })
        }
      }

      return {
        success: response.ok && validations.schemaMatches && validations.authenticationWorks,
        endpoint,
        validations,
        errors,
        performance: {
          responseTime,
          availability: response.ok ? 100 : 0,
        },
      }
    } catch (error) {
      return {
        success: false,
        endpoint,
        validations,
        errors: [
          {
            endpoint,
            type: 'network',
            message: error instanceof Error ? error.message : 'Unknown error',
            details: error,
          },
        ],
        performance: {
          responseTime: Date.now() - startTime,
          availability: 0,
        },
      }
    }
  }

  private async makeTestRequest(
    endpoint: string,
    method: ResourceMethod,
    options: VerifyOptions
  ): Promise<Response> {
    const httpMethod = this.inferHttpMethod(method)

    const requestOptions: RequestInit = {
      method: httpMethod,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: globalThis.AbortSignal.timeout(options.timeout || 5000),
    }

    if (httpMethod !== 'GET' && httpMethod !== 'HEAD') {
      requestOptions.body = JSON.stringify({})
    }

    return fetch(endpoint, requestOptions)
  }

  private inferHttpMethod(method: ResourceMethod): string {
    return method.method || 'GET'
  }

  private aggregateResults(results: ContractResult[]): ContractResult {
    const allSuccess = results.every(r => r.success)
    const totalResponseTime = results.reduce((sum, r) => sum + r.performance.responseTime, 0)
    const avgAvailability =
      results.reduce((sum, r) => sum + r.performance.availability, 0) / results.length

    const aggregatedValidations: ContractValidation = {
      urlExists: results.every(r => r.validations.urlExists),
      schemaMatches: results.every(r => r.validations.schemaMatches),
      methodSupported: results.every(r => r.validations.methodSupported),
      authenticationWorks: results.every(r => r.validations.authenticationWorks),
    }

    const allErrors = results.flatMap(r => r.errors)

    return {
      success: allSuccess,
      endpoint: this.resourceName,
      validations: aggregatedValidations,
      errors: allErrors,
      performance: {
        responseTime: totalResponseTime,
        availability: avgAvailability,
      },
    }
  }

  generateTests(): TestSuite {
    const tests: TestCase[] = []

    for (const [methodName, methodConfig] of Object.entries(this.config)) {
      if (typeof methodConfig === 'object' && 'path' in methodConfig) {
        const method = methodConfig as ResourceMethod
        tests.push({
          name: `${this.resourceName}.${methodName}`,
          method: this.inferHttpMethod(method),
          endpoint: method.path,
          expectedSchema: method.response,
        })
      }
    }

    return {
      name: `${this.resourceName} Contract Tests`,
      tests,
    }
  }

  mock(scenarios: MockScenarios<T>): MockedResource<T> {
    const mocked = {} as MockedResource<T>

    for (const [methodName, methodConfig] of Object.entries(this.config)) {
      if (typeof methodConfig === 'object' && 'path' in methodConfig) {
        const scenario = scenarios[methodName] || { success: null }
        const method = methodConfig as ResourceMethod

        Object.defineProperty(mocked, methodName, {
          value: {
            run: this.createMockRunner(method, scenario),
            scenario,
          },
          enumerable: true,
          configurable: false,
        })
      }
    }

    return mocked
  }

  private createMockRunner(_method: ResourceMethod, scenario: MockScenario) {
    return async (_params?: unknown): Promise<Result<KairoError, unknown>> => {
      if (scenario.delay) {
        await new Promise(resolve => globalThis.setTimeout(resolve, scenario.delay))
      }

      if (scenario.probability !== undefined) {
        const shouldSucceed = Math.random() < scenario.probability
        if (!shouldSucceed && scenario.failure) {
          return Result.Err(scenario.failure)
        }
      }

      if (scenario.failure && scenario.probability === undefined) {
        return Result.Err(scenario.failure)
      }

      if (scenario.success !== undefined) {
        return Result.Ok(scenario.success)
      }

      return Result.Ok(null)
    }
  }
}
