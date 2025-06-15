export { Result, map, flatMap, mapError, match, chain } from './core/result'
export type { OkResult, ErrResult } from './core/result'

export { pipeline, tracing } from './core/pipeline'
export type {
  Pipeline,
  HttpError,
  NetworkError,
  TimeoutError,
  TraceEntry,
  TraceFilter,
  TraceData,
  TraceCollector,
} from './core/pipeline'

export { resource, resourceUtils, resourceCache } from './core/resource'
export type {
  Resource,
  ResourceError,
  ResourceMethod,
  ResourceMethods,
  ResourceInput,
  ResourceOutput,
  ResourceConfig,
} from './core/resource'

export { ContractVerifier } from './core/contract'
export type {
  ResourceContract,
  VerifyOptions,
  ContractResult,
  ContractError,
  ContractValidation,
  ContractPerformance,
  MockScenario,
  MockScenarios,
  MockedResource,
  MockedResourceMethod,
  TestCase,
  TestSuite,
} from './core/contract'

export { schema } from './core/schema'
export type { Schema, ValidationError } from './core/schema'

export { rule, rules, commonRules } from './core/rules'
export type {
  Rule,
  Rules,
  BusinessRuleError,
  RuleValidationContext,
  RuleCondition,
  RuleValidation,
  AsyncRuleValidation,
} from './core/rules'

export {
  createError,
  chainError,
  isKairoError,
  getErrorChain,
  serializeError,
  findErrorByCode,
  hasErrorCode,
} from './core/errors'
export type { KairoError, ErrorWithCause } from './core/errors'

// Export functional utilities
export * from './utils/fp'
