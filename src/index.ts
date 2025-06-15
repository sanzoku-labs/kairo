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

export { workflow, workflowUtils } from './core/workflow'
export type {
  Workflow,
  WorkflowError,
  WorkflowContext,
  WorkflowStep,
  FlowDefinition,
  FlowStep,
  Condition,
  LoopCondition,
  ErrorHandler,
  ErrorHandlers,
  RollbackHandler,
  RollbackHandlers,
  MetricsConfig,
  StepMocks,
  WorkflowOptions,
  MockedWorkflow,
  WorkflowDiagram,
} from './core/workflow'

export { workflowTesting } from './core/workflow-testing'
export type {
  WorkflowTestCase,
  WorkflowTestResult,
  WorkflowTestSuite,
  WorkflowTestSuiteResult,
  WorkflowAssertion,
} from './core/workflow-testing'

// Export workflow example types for user reference
export type {
  CreateUserRequest,
  User,
  WelcomeEmailRequest,
  WelcomeEmailResponse,
  CreateProfileRequest,
  Profile,
  Order,
  PaymentRequest,
  ShipmentRequest,
  NotificationRequest,
  MigrationInput,
  MigrationState,
  BatchRequest,
  MigrationItem,
  InsertResult,
  HealthStatus,
  HealthCheckResult,
} from './examples/workflow-types'

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
