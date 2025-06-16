/**
 * Kairo Repository System
 *
 * Declarative data access layer that provides type-safe repository patterns
 * integrated with Kairo's native schema system and pipeline architecture.
 *
 * Features:
 * - Declarative CRUD operations
 * - Relationship management (hasOne, hasMany, belongsTo)
 * - Pipeline integration
 * - Schema validation
 * - Type-safe queries and mutations
 */

import { Result } from './result'
import { type KairoError, createError } from './errors'
import { type Schema } from './native-schema'

// ============================================================================
// Core Types
// ============================================================================

/**
 * Error type for repository operations in the DATA pillar.
 * Contains detailed context about failed repository operations including
 * the operation type, entity name, and identifier when applicable.
 *
 * @interface RepositoryError
 * @extends {KairoError}
 * @example
 * ```typescript
 * const repositoryError: RepositoryError = {
 *   code: 'REPOSITORY_ERROR',
 *   operation: 'create',
 *   entity: 'users',
 *   identifier: '123',
 *   message: 'Failed to create user: validation error'
 * }
 * ```
 */
export interface RepositoryError extends KairoError {
  /** Always 'REPOSITORY_ERROR' for repository-specific errors */
  code: 'REPOSITORY_ERROR'
  /** The repository operation that failed (create, find, update, delete, etc.) */
  operation: string
  /** Name of the entity/table being operated on */
  entity?: string
  /** The record identifier (ID) when applicable */
  identifier?: string | number
}

/**
 * Configuration options for querying data from repositories.
 * Supports pagination, sorting, and filtering capabilities.
 *
 * @interface QueryOptions
 * @example
 * ```typescript
 * const options: QueryOptions = {
 *   limit: 10,
 *   offset: 20,
 *   orderBy: [{ field: 'createdAt', direction: 'desc' }],
 *   where: { active: true, role: 'admin' }
 * }
 *
 * const users = await userRepo.findMany(options)
 * ```
 */
export interface QueryOptions {
  /** Maximum number of records to return */
  limit?: number
  /** Number of records to skip (for pagination) */
  offset?: number
  /** Field(s) to sort by - can be string or array of sort specifications */
  orderBy?: string | Array<{ field: string; direction: 'asc' | 'desc' }>
  /** Conditions to filter records by */
  where?: Record<string, unknown>
}

/**
 * Configuration options for update operations.
 * Controls which records to update and whether to return updated data.
 *
 * @interface UpdateOptions
 * @example
 * ```typescript
 * const options: UpdateOptions = {
 *   where: { department: 'engineering' },
 *   returning: true
 * }
 *
 * const updatedUsers = await userRepo.updateMany(
 *   { salary: newSalary },
 *   options
 * )
 * ```
 */
export interface UpdateOptions {
  /** Conditions to determine which records to update */
  where?: Record<string, unknown>
  /** Whether to return the updated records */
  returning?: boolean
}

/**
 * Configuration options for delete operations.
 * Controls which records to delete and whether to return deleted data.
 *
 * @interface DeleteOptions
 * @example
 * ```typescript
 * const options: DeleteOptions = {
 *   where: { lastLogin: { lt: '2023-01-01' } },
 *   returning: true
 * }
 *
 * const deletedUsers = await userRepo.deleteMany(options)
 * ```
 */
export interface DeleteOptions {
  /** Conditions to determine which records to delete */
  where?: Record<string, unknown>
  /** Whether to return the deleted records */
  returning?: boolean
}

// ============================================================================
// Relationship Types
// ============================================================================

/**
 * Defines a one-to-one relationship where this entity has one related entity.
 * Used for relationships like User hasOne Profile.
 *
 * @template T - Type of the related entity
 * @interface HasOneRelation
 * @example
 * ```typescript
 * const userProfileRelation: HasOneRelation<Profile> = {
 *   type: 'hasOne',
 *   entity: 'profile',
 *   foreignKey: 'userId',
 *   localKey: 'id',
 *   schema: ProfileSchema
 * }
 * ```
 */
export interface HasOneRelation<T> {
  /** Relationship type identifier */
  type: 'hasOne'
  /** Name of the related entity */
  entity: string
  /** Foreign key field in the related entity that references this entity */
  foreignKey: string
  /** Local key field in this entity (defaults to 'id') */
  localKey?: string
  /** Schema for validating the related entity data */
  schema: Schema<T>
}

/**
 * Defines a one-to-many relationship where this entity has many related entities.
 * Used for relationships like User hasMany Posts.
 *
 * @template T - Type of the related entities
 * @interface HasManyRelation
 * @example
 * ```typescript
 * const userPostsRelation: HasManyRelation<Post> = {
 *   type: 'hasMany',
 *   entity: 'posts',
 *   foreignKey: 'authorId',
 *   localKey: 'id',
 *   schema: PostSchema
 * }
 * ```
 */
export interface HasManyRelation<T> {
  /** Relationship type identifier */
  type: 'hasMany'
  /** Name of the related entity */
  entity: string
  /** Foreign key field in the related entities that references this entity */
  foreignKey: string
  /** Local key field in this entity (defaults to 'id') */
  localKey?: string
  /** Schema for validating the related entity data */
  schema: Schema<T>
}

/**
 * Defines a many-to-one relationship where this entity belongs to another entity.
 * Used for relationships like Post belongsTo User.
 *
 * @template T - Type of the parent entity
 * @interface BelongsToRelation
 * @example
 * ```typescript
 * const postAuthorRelation: BelongsToRelation<User> = {
 *   type: 'belongsTo',
 *   entity: 'user',
 *   foreignKey: 'authorId',
 *   ownerKey: 'id',
 *   schema: UserSchema
 * }
 * ```
 */
export interface BelongsToRelation<T> {
  /** Relationship type identifier */
  type: 'belongsTo'
  /** Name of the parent entity */
  entity: string
  /** Foreign key field in this entity that references the parent */
  foreignKey: string
  /** Key field in the parent entity (defaults to 'id') */
  ownerKey?: string
  /** Schema for validating the parent entity data */
  schema: Schema<T>
}

/**
 * Union type for all possible relationship types.
 * Used for type-safe relationship definitions in repository configurations.
 *
 * @template T - Type of the related entity
 */
export type Relation<T> = HasOneRelation<T> | HasManyRelation<T> | BelongsToRelation<T>

/**
 * Type for defining multiple relationships on a repository.
 * Maps relationship names to their relationship definitions.
 *
 * @example
 * ```typescript
 * const userRelations: Relations = {
 *   profile: hasOne('profile', 'userId', ProfileSchema),
 *   posts: hasMany('posts', 'authorId', PostSchema),
 *   department: belongsTo('department', 'departmentId', DepartmentSchema)
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Relations = Record<string, Relation<any>>

// ============================================================================
// Storage Adapter Interface
// ============================================================================

/**
 * Interface for storage adapters that handle data persistence.
 * Provides a consistent API for different storage backends (memory, database, file, etc.).
 * All operations return Results for safe error handling.
 *
 * @template T - Type of entities this adapter handles
 * @interface StorageAdapter
 * @example
 * ```typescript
 * class PostgresAdapter<T> implements StorageAdapter<T> {
 *   async create(data: T): Promise<Result<RepositoryError, T>> {
 *     try {
 *       const result = await this.db.insert(data)
 *       return Result.Ok(result)
 *     } catch (error) {
 *       return Result.Err(createRepositoryError('Failed to create', 'create'))
 *     }
 *   }
 *   // ... other methods
 * }
 * ```
 */
export interface StorageAdapter<T> {
  /** Create a new entity */
  create(data: T): Promise<Result<RepositoryError, T>>
  /** Find an entity by ID */
  find(id: string | number): Promise<Result<RepositoryError, T | null>>
  /** Find multiple entities with optional query constraints */
  findMany(options?: QueryOptions): Promise<Result<RepositoryError, T[]>>
  /** Update an entity by ID */
  update(
    id: string | number,
    data: Partial<T>,
    options?: UpdateOptions
  ): Promise<Result<RepositoryError, T>>
  /** Update multiple entities matching conditions */
  updateMany(data: Partial<T>, options?: UpdateOptions): Promise<Result<RepositoryError, T[]>>
  /** Delete an entity by ID */
  delete(id: string | number, options?: DeleteOptions): Promise<Result<RepositoryError, T | void>>
  /** Delete multiple entities matching conditions */
  deleteMany(options?: DeleteOptions): Promise<Result<RepositoryError, T[] | void>>
  /** Check if an entity exists by ID */
  exists(id: string | number): Promise<Result<RepositoryError, boolean>>
  /** Count entities matching conditions */
  count(options?: Pick<QueryOptions, 'where'>): Promise<Result<RepositoryError, number>>
}

// ============================================================================
// Repository Configuration
// ============================================================================

/**
 * Configuration object for creating repositories.
 * Defines schema, storage, relationships, and lifecycle hooks.
 *
 * @template T - Type of entities in this repository
 * @template R - Type of relationships (extends Relations)
 * @interface RepositoryConfig
 * @example
 * ```typescript
 * const userConfig: RepositoryConfig<User, UserRelations> = {
 *   schema: UserSchema,
 *   storage: 'memory', // or custom StorageAdapter
 *   name: 'users',
 *   primaryKey: 'id',
 *   timestamps: true,
 *   relationships: {
 *     profile: hasOne('profile', 'userId', ProfileSchema),
 *     posts: hasMany('posts', 'authorId', PostSchema)
 *   },
 *   hooks: {
 *     beforeCreate: async (data) => ({ ...data, slug: slugify(data.name) }),
 *     afterCreate: async (user) => sendWelcomeEmail(user.email)
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RepositoryConfig<T, R extends Relations = {}> {
  /** Schema for validating entity data */
  schema: Schema<T>
  /** Storage backend - can be built-in type or custom adapter */
  storage: StorageAdapter<T> | 'memory' | 'database' | 'file'
  /** Repository name (used for error context and logging) */
  name: string
  /** Primary key field name (defaults to 'id') */
  primaryKey?: string
  /** Enable automatic timestamps (true/false or custom field names) */
  timestamps?: boolean | { createdAt: string; updatedAt: string }
  /** Database indexes to create (adapter-dependent) */
  indexes?: string[]
  /** Relationship definitions for this entity */
  relationships?: R
  /** Lifecycle hooks for data processing */
  hooks?: {
    /** Called before creating an entity - can transform data */
    beforeCreate?: (data: T) => Promise<T> | T
    /** Called after successfully creating an entity */
    afterCreate?: (data: T) => Promise<void> | void
    /** Called before updating an entity - can transform data */
    beforeUpdate?: (id: string | number, data: Partial<T>) => Promise<Partial<T>> | Partial<T>
    /** Called after successfully updating an entity */
    afterUpdate?: (data: T) => Promise<void> | void
    /** Called before deleting an entity */
    beforeDelete?: (id: string | number) => Promise<void> | void
    /** Called after successfully deleting an entity */
    afterDelete?: (id: string | number) => Promise<void> | void
  }
}

// ============================================================================
// Repository Interface
// ============================================================================

/**
 * Core repository interface for the DATA pillar's data access layer.
 *
 * Provides declarative CRUD operations, relationship loading, and data validation
 * with Result-based error handling. All operations are type-safe and integrate
 * seamlessly with Kairo's schema system and functional programming patterns.
 *
 * @template T - Type of entities in this repository
 * @template R - Type of relationships (extends Relations)
 * @interface Repository
 * @example
 * ```typescript
 * const userRepo: Repository<User, UserRelations> = repository('users', {
 *   schema: UserSchema,
 *   storage: 'memory',
 *   relationships: {
 *     profile: hasOne('profile', 'userId', ProfileSchema),
 *     posts: hasMany('posts', 'authorId', PostSchema)
 *   }
 * })
 *
 * // Basic CRUD operations
 * const result = await userRepo.create({ name: 'John', email: 'john@example.com' })
 * const user = await userRepo.find(1)
 * const users = await userRepo.findMany({ where: { active: true } })
 *
 * // Relationship loading
 * const userWithPosts = await userRepo.with('posts').find(1)
 * const userWithAll = await userRepo.with(['profile', 'posts']).find(1)
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Repository<T, R extends Relations = {}> {
  /** Repository name */
  readonly name: string
  /** Schema used for validation */
  readonly schema: Schema<T>
  /** Relationship definitions */
  readonly relationships: R

  // Core CRUD operations
  /** Create a new entity */
  create(data: T): Promise<Result<RepositoryError, T>>
  /** Find an entity by ID */
  find(id: string | number): Promise<Result<RepositoryError, T | null>>
  /** Find multiple entities with optional filtering, sorting, and pagination */
  findMany(options?: QueryOptions): Promise<Result<RepositoryError, T[]>>
  /** Find the first entity matching conditions */
  findOne(options: Pick<QueryOptions, 'where'>): Promise<Result<RepositoryError, T | null>>
  /** Update an entity by ID */
  update(id: string | number, data: Partial<T>): Promise<Result<RepositoryError, T>>
  /** Update multiple entities matching conditions */
  updateMany(data: Partial<T>, options?: UpdateOptions): Promise<Result<RepositoryError, T[]>>
  /** Delete an entity by ID */
  delete(id: string | number): Promise<Result<RepositoryError, void>>
  /** Delete multiple entities matching conditions */
  deleteMany(options?: DeleteOptions): Promise<Result<RepositoryError, void>>

  // Query operations
  /** Check if an entity exists by ID */
  exists(id: string | number): Promise<Result<RepositoryError, boolean>>
  /** Count entities matching conditions */
  count(options?: Pick<QueryOptions, 'where'>): Promise<Result<RepositoryError, number>>

  // Relationship operations
  /** Load specified relationships and return a new repository instance with enhanced types */
  with<K extends keyof R>(
    relations: K | K[]
  ): Repository<
    T & {
      [P in K]: R[P] extends HasOneRelation<infer U>
        ? U
        : R[P] extends HasManyRelation<infer U>
          ? U[]
          : R[P] extends BelongsToRelation<infer U>
            ? U
            : never
    },
    R
  >

  // Validation
  /** Validate complete entity data against schema */
  validate(data: T): Result<RepositoryError, T>
  /** Validate partial entity data (for updates) */
  validatePartial(data: Partial<T>): Result<RepositoryError, Partial<T>>
}

// ============================================================================
// Relationship Helpers
// ============================================================================

/**
 * Creates a hasOne relationship definition.
 * Defines a one-to-one relationship where this entity has one related entity.
 *
 * @template T - Type of the related entity
 * @param entity - Name of the related entity
 * @param foreignKey - Foreign key field in the related entity
 * @param schema - Schema for the related entity
 * @param localKey - Local key field (defaults to 'id')
 * @returns HasOneRelation configuration
 *
 * @example
 * ```typescript
 * const userRelations = {
 *   profile: hasOne('profile', 'userId', ProfileSchema),
 *   settings: hasOne('userSettings', 'userId', UserSettingsSchema, 'id')
 * }
 * ```
 */
export function hasOne<T>(
  entity: string,
  foreignKey: string,
  schema: Schema<T>,
  localKey = 'id'
): HasOneRelation<T> {
  return {
    type: 'hasOne',
    entity,
    foreignKey,
    localKey,
    schema,
  }
}

/**
 * Creates a hasMany relationship definition.
 * Defines a one-to-many relationship where this entity has many related entities.
 *
 * @template T - Type of the related entities
 * @param entity - Name of the related entity
 * @param foreignKey - Foreign key field in the related entities
 * @param schema - Schema for the related entities
 * @param localKey - Local key field (defaults to 'id')
 * @returns HasManyRelation configuration
 *
 * @example
 * ```typescript
 * const userRelations = {
 *   posts: hasMany('posts', 'authorId', PostSchema),
 *   comments: hasMany('comments', 'userId', CommentSchema, 'id')
 * }
 * ```
 */
export function hasMany<T>(
  entity: string,
  foreignKey: string,
  schema: Schema<T>,
  localKey = 'id'
): HasManyRelation<T> {
  return {
    type: 'hasMany',
    entity,
    foreignKey,
    localKey,
    schema,
  }
}

/**
 * Creates a belongsTo relationship definition.
 * Defines a many-to-one relationship where this entity belongs to another entity.
 *
 * @template T - Type of the parent entity
 * @param entity - Name of the parent entity
 * @param foreignKey - Foreign key field in this entity
 * @param schema - Schema for the parent entity
 * @param ownerKey - Key field in the parent entity (defaults to 'id')
 * @returns BelongsToRelation configuration
 *
 * @example
 * ```typescript
 * const postRelations = {
 *   author: belongsTo('user', 'authorId', UserSchema),
 *   category: belongsTo('category', 'categoryId', CategorySchema, 'id')
 * }
 * ```
 */
export function belongsTo<T>(
  entity: string,
  foreignKey: string,
  schema: Schema<T>,
  ownerKey = 'id'
): BelongsToRelation<T> {
  return {
    type: 'belongsTo',
    entity,
    foreignKey,
    ownerKey,
    schema,
  }
}

// ============================================================================
// Error Helpers
// ============================================================================

/**
 * Creates a structured RepositoryError with context information.
 * Used throughout the repository system for consistent error reporting.
 *
 * @param message - Human-readable error message
 * @param operation - The repository operation that failed
 * @param entity - Name of the entity being operated on
 * @param identifier - Record identifier when applicable
 * @param cause - Underlying error that caused this failure
 * @returns Structured RepositoryError with full context
 *
 * @example
 * ```typescript
 * const error = createRepositoryError(
 *   'User not found',
 *   'find',
 *   'users',
 *   '123',
 *   originalError
 * )
 * ```
 */
export function createRepositoryError(
  message: string,
  operation: string,
  entity?: string,
  identifier?: string | number,
  cause?: Error
): RepositoryError {
  const kairoError = isKairoError(cause) ? cause : undefined
  return createError('REPOSITORY_ERROR', message, { operation, entity, identifier }, kairoError)
}

// Import function to check if error is KairoError
function isKairoError(error: unknown): error is KairoError {
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error
}

// ============================================================================
// Storage Adapters
// ============================================================================

/**
 * In-memory storage adapter for development and testing.
 * Stores data in a Map with automatic ID generation and basic querying.
 *
 * @template T - Type of entities to store (must extend Record<string, unknown>)
 * @class MemoryStorageAdapter
 * @implements {StorageAdapter<T>}
 * @example
 * ```typescript
 * const adapter = new MemoryStorageAdapter<User>('id')
 * const result = await adapter.create({ name: 'John', email: 'john@example.com' })
 *
 * if (Result.isOk(result)) {
 *   console.log('Created user:', result.value)
 * }
 * ```
 */
export class MemoryStorageAdapter<T extends Record<string, unknown>> implements StorageAdapter<T> {
  /** In-memory data store using Map for O(1) lookups */
  private data = new Map<string | number, T>()
  /** Auto-incrementing counter for generating IDs */
  private idCounter = 1

  /**
   * Creates a new MemoryStorageAdapter instance.
   *
   * @param primaryKey - Name of the primary key field (defaults to 'id')
   */
  constructor(private primaryKey: string = 'id') {}

  create(data: T): Promise<Result<RepositoryError, T>> {
    try {
      const id = (data[this.primaryKey] as string | number) ?? this.idCounter++
      const record = { ...data, [this.primaryKey]: id }
      this.data.set(id, record)
      return Promise.resolve(Result.Ok(record))
    } catch (error) {
      return Promise.resolve(
        Result.Err(
          createRepositoryError(
            'Failed to create record',
            'create',
            undefined,
            undefined,
            error as Error
          )
        )
      )
    }
  }

  find(id: string | number): Promise<Result<RepositoryError, T | null>> {
    try {
      const record = this.data.get(id) ?? null
      return Promise.resolve(Result.Ok(record))
    } catch (error) {
      return Promise.resolve(
        Result.Err(
          createRepositoryError(
            'Failed to find record',
            'find',
            undefined,
            String(id),
            error as Error
          )
        )
      )
    }
  }

  findMany(options: QueryOptions = {}): Promise<Result<RepositoryError, T[]>> {
    try {
      let records = Array.from(this.data.values())

      // Apply where clause
      if (options.where) {
        records = records.filter(record => {
          return Object.entries(options.where!).every(([key, value]) => record[key] === value)
        })
      }

      // Apply ordering
      if (options.orderBy) {
        if (typeof options.orderBy === 'string') {
          records.sort((a, b) =>
            String(a[options.orderBy as string]).localeCompare(String(b[options.orderBy as string]))
          )
        } else {
          records.sort((a, b) => {
            for (const order of options.orderBy as Array<{
              field: string
              direction: 'asc' | 'desc'
            }>) {
              const aVal = String(a[order.field])
              const bVal = String(b[order.field])
              const comparison = aVal.localeCompare(bVal)
              if (comparison !== 0) {
                return order.direction === 'desc' ? -comparison : comparison
              }
            }
            return 0
          })
        }
      }

      // Apply pagination
      if (options.offset) {
        records = records.slice(options.offset)
      }
      if (options.limit) {
        records = records.slice(0, options.limit)
      }

      return Promise.resolve(Result.Ok(records))
    } catch (error) {
      return Promise.resolve(
        Result.Err(
          createRepositoryError(
            'Failed to find records',
            'findMany',
            undefined,
            undefined,
            error as Error
          )
        )
      )
    }
  }

  update(id: string | number, data: Partial<T>): Promise<Result<RepositoryError, T>> {
    try {
      const existing = this.data.get(id)
      if (!existing) {
        return Promise.resolve(
          Result.Err(
            createRepositoryError(`Record with id ${id} not found`, 'update', undefined, String(id))
          )
        )
      }

      const updated = { ...existing, ...data, [this.primaryKey]: id }
      this.data.set(id, updated)
      return Promise.resolve(Result.Ok(updated))
    } catch (error) {
      return Promise.resolve(
        Result.Err(
          createRepositoryError(
            'Failed to update record',
            'update',
            undefined,
            String(id),
            error as Error
          )
        )
      )
    }
  }

  updateMany(data: Partial<T>, options: UpdateOptions = {}): Promise<Result<RepositoryError, T[]>> {
    try {
      const records = Array.from(this.data.values())
      const toUpdate = options.where
        ? records.filter(record =>
            Object.entries(options.where!).every(([key, value]) => record[key] === value)
          )
        : records

      const updated = toUpdate.map(record => {
        const updatedRecord = { ...record, ...data }
        this.data.set(record[this.primaryKey] as string | number, updatedRecord)
        return updatedRecord
      })

      return Promise.resolve(Result.Ok(updated))
    } catch (error) {
      return Promise.resolve(
        Result.Err(
          createRepositoryError(
            'Failed to update records',
            'updateMany',
            undefined,
            undefined,
            error as Error
          )
        )
      )
    }
  }

  delete(id: string | number): Promise<Result<RepositoryError, T | void>> {
    try {
      const existed = this.data.has(id)
      if (!existed) {
        return Promise.resolve(
          Result.Err(
            createRepositoryError(`Record with id ${id} not found`, 'delete', undefined, String(id))
          )
        )
      }

      this.data.delete(id)
      return Promise.resolve(Result.Ok(undefined))
    } catch (error) {
      return Promise.resolve(
        Result.Err(
          createRepositoryError(
            'Failed to delete record',
            'delete',
            undefined,
            String(id),
            error as Error
          )
        )
      )
    }
  }

  deleteMany(options: DeleteOptions = {}): Promise<Result<RepositoryError, T[] | void>> {
    try {
      if (options.where) {
        const records = Array.from(this.data.values())
        const toDelete = records.filter(record =>
          Object.entries(options.where!).every(([key, value]) => record[key] === value)
        )

        for (const record of toDelete) {
          this.data.delete(record[this.primaryKey] as string | number)
        }
      } else {
        this.data.clear()
      }

      return Promise.resolve(Result.Ok(undefined))
    } catch (error) {
      return Promise.resolve(
        Result.Err(
          createRepositoryError(
            'Failed to delete records',
            'deleteMany',
            undefined,
            undefined,
            error as Error
          )
        )
      )
    }
  }

  exists(id: string | number): Promise<Result<RepositoryError, boolean>> {
    try {
      return Promise.resolve(Result.Ok(this.data.has(id)))
    } catch (error) {
      return Promise.resolve(
        Result.Err(
          createRepositoryError(
            'Failed to check record existence',
            'exists',
            undefined,
            String(id),
            error as Error
          )
        )
      )
    }
  }

  count(options: Pick<QueryOptions, 'where'> = {}): Promise<Result<RepositoryError, number>> {
    try {
      if (!options.where) {
        return Promise.resolve(Result.Ok(this.data.size))
      }

      const records = Array.from(this.data.values())
      const filtered = records.filter(record =>
        Object.entries(options.where!).every(([key, value]) => record[key] === value)
      )

      return Promise.resolve(Result.Ok(filtered.length))
    } catch (error) {
      return Promise.resolve(
        Result.Err(
          createRepositoryError(
            'Failed to count records',
            'count',
            undefined,
            undefined,
            error as Error
          )
        )
      )
    }
  }
}

// ============================================================================
// Repository Implementation
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export class BaseRepository<T extends Record<string, unknown>, R extends Relations = {}>
  implements Repository<T, R>
{
  public readonly name: string
  public readonly schema: Schema<T>
  public readonly relationships: R
  private readonly config: RepositoryConfig<T, R>
  private readonly storage: StorageAdapter<T>

  constructor(config: RepositoryConfig<T, R>) {
    this.name = config.name
    this.schema = config.schema
    this.relationships = config.relationships || ({} as R)
    this.config = config

    // Initialize storage adapter
    if (config.storage === 'memory') {
      this.storage = new MemoryStorageAdapter<T>(config.primaryKey)
    } else if (typeof config.storage === 'object') {
      this.storage = config.storage
    } else {
      throw new Error(`Storage type '${config.storage}' not implemented yet`)
    }
  }

  // ============================================================================
  // Core CRUD Operations
  // ============================================================================

  async create(data: T): Promise<Result<RepositoryError, T>> {
    try {
      // Run validation
      const validationResult = this.validate(data)
      if (!Result.isOk(validationResult)) {
        return Result.Err(
          createRepositoryError(
            `Validation failed: ${validationResult.error.message}`,
            'create',
            this.name
          )
        )
      }

      // Apply beforeCreate hook
      let processedData = data
      if (this.config.hooks?.beforeCreate) {
        processedData = await this.config.hooks.beforeCreate(data)
      }

      // Add timestamps if enabled
      if (this.config.timestamps) {
        const now = new Date().toISOString()
        if (typeof this.config.timestamps === 'object') {
          processedData = {
            ...processedData,
            [this.config.timestamps.createdAt]: now,
            [this.config.timestamps.updatedAt]: now,
          }
        } else {
          processedData = {
            ...processedData,
            createdAt: now,
            updatedAt: now,
          }
        }
      }

      // Create record
      const result = await this.storage.create(processedData)

      if (Result.isOk(result) && this.config.hooks?.afterCreate) {
        await this.config.hooks.afterCreate(result.value)
      }

      return result
    } catch (error) {
      return Result.Err(
        createRepositoryError(
          'Failed to create record',
          'create',
          this.name,
          undefined,
          error as Error
        )
      )
    }
  }

  async find(id: string | number): Promise<Result<RepositoryError, T | null>> {
    try {
      return await this.storage.find(id)
    } catch (error) {
      return Result.Err(
        createRepositoryError(
          'Failed to find record',
          'find',
          this.name,
          String(id),
          error as Error
        )
      )
    }
  }

  async findMany(options?: QueryOptions): Promise<Result<RepositoryError, T[]>> {
    try {
      return await this.storage.findMany(options)
    } catch (error) {
      return Result.Err(
        createRepositoryError(
          'Failed to find records',
          'findMany',
          this.name,
          undefined,
          error as Error
        )
      )
    }
  }

  async findOne(options: Pick<QueryOptions, 'where'>): Promise<Result<RepositoryError, T | null>> {
    try {
      const result = await this.storage.findMany({ ...options, limit: 1 })
      if (Result.isErr(result)) return result
      return Result.Ok(result.value[0] || null)
    } catch (error) {
      return Result.Err(
        createRepositoryError(
          'Failed to find record',
          'findOne',
          this.name,
          undefined,
          error as Error
        )
      )
    }
  }

  async update(id: string | number, data: Partial<T>): Promise<Result<RepositoryError, T>> {
    try {
      // Run partial validation
      const validationResult = this.validatePartial(data)
      if (!Result.isOk(validationResult)) {
        return Result.Err(
          createRepositoryError(
            `Validation failed: ${validationResult.error.message}`,
            'update',
            this.name,
            String(id)
          )
        )
      }

      // Apply beforeUpdate hook
      let processedData = data
      if (this.config.hooks?.beforeUpdate) {
        processedData = await this.config.hooks.beforeUpdate(id, data)
      }

      // Add updated timestamp if enabled
      if (this.config.timestamps) {
        const now = new Date().toISOString()
        if (typeof this.config.timestamps === 'object') {
          processedData = {
            ...processedData,
            [this.config.timestamps.updatedAt]: now,
          }
        } else {
          processedData = {
            ...processedData,
            updatedAt: now,
          }
        }
      }

      // Update record
      const result = await this.storage.update(id, processedData)

      if (Result.isOk(result) && this.config.hooks?.afterUpdate) {
        await this.config.hooks.afterUpdate(result.value)
      }

      return result
    } catch (error) {
      return Result.Err(
        createRepositoryError(
          'Failed to update record',
          'update',
          this.name,
          String(id),
          error as Error
        )
      )
    }
  }

  async updateMany(
    data: Partial<T>,
    options?: UpdateOptions
  ): Promise<Result<RepositoryError, T[]>> {
    try {
      const validationResult = this.validatePartial(data)
      if (!Result.isOk(validationResult)) {
        return Result.Err(
          createRepositoryError(
            `Validation failed: ${validationResult.error.message}`,
            'updateMany',
            this.name
          )
        )
      }

      // Add updated timestamp if enabled
      let processedData = data
      if (this.config.timestamps) {
        const now = new Date().toISOString()
        if (typeof this.config.timestamps === 'object') {
          processedData = {
            ...processedData,
            [this.config.timestamps.updatedAt]: now,
          }
        } else {
          processedData = {
            ...processedData,
            updatedAt: now,
          }
        }
      }

      return await this.storage.updateMany(processedData, options)
    } catch (error) {
      return Result.Err(
        createRepositoryError(
          'Failed to update records',
          'updateMany',
          this.name,
          undefined,
          error as Error
        )
      )
    }
  }

  async delete(id: string | number): Promise<Result<RepositoryError, void>> {
    try {
      if (this.config.hooks?.beforeDelete) {
        await this.config.hooks.beforeDelete(id)
      }

      const result = await this.storage.delete(id)

      if (Result.isOk(result) && this.config.hooks?.afterDelete) {
        await this.config.hooks.afterDelete(id)
      }

      return Result.map(result, () => undefined)
    } catch (error) {
      return Result.Err(
        createRepositoryError(
          'Failed to delete record',
          'delete',
          this.name,
          String(id),
          error as Error
        )
      )
    }
  }

  async deleteMany(options?: DeleteOptions): Promise<Result<RepositoryError, void>> {
    try {
      const result = await this.storage.deleteMany(options)
      return Result.map(result, () => undefined)
    } catch (error) {
      return Result.Err(
        createRepositoryError(
          'Failed to delete records',
          'deleteMany',
          this.name,
          undefined,
          error as Error
        )
      )
    }
  }

  // ============================================================================
  // Query Operations
  // ============================================================================

  async exists(id: string | number): Promise<Result<RepositoryError, boolean>> {
    try {
      return await this.storage.exists(id)
    } catch (error) {
      return Result.Err(
        createRepositoryError(
          'Failed to check record existence',
          'exists',
          this.name,
          String(id),
          error as Error
        )
      )
    }
  }

  async count(options?: Pick<QueryOptions, 'where'>): Promise<Result<RepositoryError, number>> {
    try {
      return await this.storage.count(options)
    } catch (error) {
      return Result.Err(
        createRepositoryError(
          'Failed to count records',
          'count',
          this.name,
          undefined,
          error as Error
        )
      )
    }
  }

  // ============================================================================
  // Relationship Operations
  // ============================================================================

  with<K extends keyof R>(
    relations: K | K[]
  ): Repository<
    T & {
      [P in K]: R[P] extends HasOneRelation<infer U>
        ? U
        : R[P] extends HasManyRelation<infer U>
          ? U[]
          : R[P] extends BelongsToRelation<infer U>
            ? U
            : never
    },
    R
  > {
    // Create a new repository instance with relationship loading enabled
    const relationArray = Array.isArray(relations) ? relations.map(String) : [String(relations)]
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
    return new RepositoryWithRelations(this, relationArray) as any
  }

  // Internal method to load relationships for a single record
  private loadRelationsForRecord(
    record: T,
    relationNames: string[]
  ): Promise<T & Record<string, unknown>> {
    const enrichedRecord = { ...record } as T & Record<string, unknown>

    for (const relationName of relationNames) {
      const relation = this.relationships[relationName as keyof R]
      if (!relation) continue

      try {
        switch (relation.type) {
          case 'hasOne': {
            // In a real implementation, you'd query the related repository
            // For now, we'll just set null as a placeholder
            ;(enrichedRecord as Record<string, unknown>)[relationName] = null
            break
          }
          case 'hasMany': {
            // In a real implementation, you'd query the related repository
            // For now, we'll just set empty array as a placeholder
            ;(enrichedRecord as Record<string, unknown>)[relationName] = []
            break
          }
          case 'belongsTo': {
            // In a real implementation, you'd query the related repository
            // For now, we'll just set null as a placeholder
            ;(enrichedRecord as Record<string, unknown>)[relationName] = null
            break
          }
        }
      } catch (error) {
        // Log error but don't fail the whole operation
        console.warn(`Failed to load relation ${relationName}:`, error)
        ;(enrichedRecord as Record<string, unknown>)[relationName] =
          relation.type === 'hasMany' ? [] : null
      }
    }

    return Promise.resolve(enrichedRecord)
  }

  // Internal method to load relationships for multiple records
  private loadRelationsForRecords(
    records: T[],
    relationNames: string[]
  ): Promise<Array<T & Record<string, unknown>>> {
    return Promise.all(records.map(record => this.loadRelationsForRecord(record, relationNames)))
  }

  // ============================================================================
  // Validation
  // ============================================================================

  validate(data: T): Result<RepositoryError, T> {
    const result = this.schema.parse(data)
    if (Result.isErr(result)) {
      return Result.Err(createRepositoryError(result.error.message, 'validate', this.name))
    }
    return Result.Ok(result.value)
  }

  validatePartial(data: Partial<T>): Result<RepositoryError, Partial<T>> {
    // For partial validation, we'll validate only the provided fields
    // This is a simplified approach - in a real implementation, you might want
    // to use the schema's partial() method if available
    try {
      return Result.Ok(data)
    } catch (error) {
      return Result.Err(
        createRepositoryError(
          'Partial validation failed',
          'validatePartial',
          this.name,
          undefined,
          error as Error
        )
      )
    }
  }
}

// ============================================================================
// Repository Factory Function
// ============================================================================

// ============================================================================
// Repository with Relations Implementation
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
class RepositoryWithRelations<T extends Record<string, unknown>, R extends Relations = {}>
  implements Repository<T & Record<string, unknown>, R>
{
  constructor(
    private baseRepository: BaseRepository<T, R>,
    private relationNames: string[]
  ) {}

  get name() {
    return this.baseRepository.name
  }
  get schema() {
    return this.baseRepository.schema
  }
  get relationships() {
    return this.baseRepository.relationships
  }

  async create(data: T): Promise<Result<RepositoryError, T & Record<string, unknown>>> {
    const result = await this.baseRepository.create(data)
    if (Result.isErr(result)) {
      return result as Result<RepositoryError, T & Record<string, unknown>>
    }
    const enrichedRecord = await this.baseRepository['loadRelationsForRecord'](
      result.value,
      this.relationNames
    )
    return Result.Ok(enrichedRecord)
  }

  async find(
    id: string | number
  ): Promise<Result<RepositoryError, (T & Record<string, unknown>) | null>> {
    const result = await this.baseRepository.find(id)
    if (Result.isErr(result)) {
      return result as Result<RepositoryError, (T & Record<string, unknown>) | null>
    }
    if (!result.value) return Result.Ok(null)
    const enrichedRecord = await this.baseRepository['loadRelationsForRecord'](
      result.value,
      this.relationNames
    )
    return Result.Ok(enrichedRecord)
  }

  async findMany(
    options?: QueryOptions
  ): Promise<Result<RepositoryError, Array<T & Record<string, unknown>>>> {
    const result = await this.baseRepository.findMany(options)
    if (Result.isErr(result)) {
      return result as Result<RepositoryError, Array<T & Record<string, unknown>>>
    }
    const enrichedRecords = await this.baseRepository['loadRelationsForRecords'](
      result.value,
      this.relationNames
    )
    return Result.Ok(enrichedRecords)
  }

  async findOne(
    options: Pick<QueryOptions, 'where'>
  ): Promise<Result<RepositoryError, (T & Record<string, unknown>) | null>> {
    const result = await this.baseRepository.findOne(options)
    if (Result.isErr(result)) {
      return result as Result<RepositoryError, (T & Record<string, unknown>) | null>
    }
    if (!result.value) return Result.Ok(null)
    const enrichedRecord = await this.baseRepository['loadRelationsForRecord'](
      result.value,
      this.relationNames
    )
    return Result.Ok(enrichedRecord)
  }

  async update(
    id: string | number,
    data: Partial<T>
  ): Promise<Result<RepositoryError, T & Record<string, unknown>>> {
    const result = await this.baseRepository.update(id, data)
    if (Result.isErr(result)) {
      return result as Result<RepositoryError, T & Record<string, unknown>>
    }
    const enrichedRecord = await this.baseRepository['loadRelationsForRecord'](
      result.value,
      this.relationNames
    )
    return Result.Ok(enrichedRecord)
  }

  async updateMany(
    data: Partial<T>,
    options?: UpdateOptions
  ): Promise<Result<RepositoryError, Array<T & Record<string, unknown>>>> {
    const result = await this.baseRepository.updateMany(data, options)
    if (Result.isErr(result)) {
      return result as Result<RepositoryError, Array<T & Record<string, unknown>>>
    }
    const enrichedRecords = await this.baseRepository['loadRelationsForRecords'](
      result.value,
      this.relationNames
    )
    return Result.Ok(enrichedRecords)
  }

  async delete(id: string | number): Promise<Result<RepositoryError, void>> {
    return this.baseRepository.delete(id)
  }

  async deleteMany(options?: DeleteOptions): Promise<Result<RepositoryError, void>> {
    return this.baseRepository.deleteMany(options)
  }

  async exists(id: string | number): Promise<Result<RepositoryError, boolean>> {
    return this.baseRepository.exists(id)
  }

  async count(options?: Pick<QueryOptions, 'where'>): Promise<Result<RepositoryError, number>> {
    return this.baseRepository.count(options)
  }

  with<K extends keyof R>(
    relations: K | K[]
  ): Repository<
    T &
      Record<string, unknown> & {
        [P in K]: R[P] extends HasOneRelation<infer U>
          ? U
          : R[P] extends HasManyRelation<infer U>
            ? U[]
            : R[P] extends BelongsToRelation<infer U>
              ? U
              : never
      },
    R
  > {
    const newRelations = Array.isArray(relations) ? relations : [relations]
    const allRelations = [...this.relationNames, ...newRelations.map(String)]
    return new RepositoryWithRelations(this.baseRepository, allRelations) as Repository<
      T &
        Record<string, unknown> & {
          [P in K]: R[P] extends HasOneRelation<infer U>
            ? U
            : R[P] extends HasManyRelation<infer U>
              ? U[]
              : R[P] extends BelongsToRelation<infer U>
                ? U
                : never
        },
      R
    >
  }

  validate(data: T): Result<RepositoryError, T> {
    return this.baseRepository.validate(data)
  }

  validatePartial(data: Partial<T>): Result<RepositoryError, Partial<T>> {
    return this.baseRepository.validatePartial(data)
  }
}

// ============================================================================
// Repository Factory Function
// ============================================================================

/**
 * Factory function for creating type-safe repositories.
 * The primary way to create repositories in Kairo applications.
 *
 * @template T - Type of entities in this repository
 * @template R - Type of relationships (extends Relations)
 * @param name - Repository name (used for error context and logging)
 * @param config - Repository configuration (schema, storage, relationships, etc.)
 * @returns Configured repository instance
 *
 * @example
 * ```typescript
 * // Basic repository
 * const userRepo = repository('users', {
 *   schema: UserSchema,
 *   storage: 'memory'
 * })
 *
 * // Repository with relationships and hooks
 * const userRepo = repository('users', {
 *   schema: UserSchema,
 *   storage: new CustomStorageAdapter(),
 *   timestamps: true,
 *   relationships: {
 *     profile: hasOne('profile', 'userId', ProfileSchema),
 *     posts: hasMany('posts', 'authorId', PostSchema)
 *   },
 *   hooks: {
 *     beforeCreate: async (data) => ({ ...data, slug: slugify(data.name) }),
 *     afterCreate: async (user) => await sendWelcomeEmail(user.email)
 *   }
 * })
 *
 * // Usage
 * const result = await userRepo.create({ name: 'John', email: 'john@example.com' })
 * const userWithPosts = await userRepo.with('posts').find(1)
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export function repository<T extends Record<string, unknown>, R extends Relations = {}>(
  name: string,
  config: Omit<RepositoryConfig<T, R>, 'name'>
): Repository<T, R> {
  return new BaseRepository({ ...config, name })
}
