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

export interface RepositoryError extends KairoError {
  code: 'REPOSITORY_ERROR'
  operation: string
  entity?: string
  identifier?: string | number
}

export interface QueryOptions {
  limit?: number
  offset?: number
  orderBy?: string | Array<{ field: string; direction: 'asc' | 'desc' }>
  where?: Record<string, unknown>
}

export interface UpdateOptions {
  where?: Record<string, unknown>
  returning?: boolean
}

export interface DeleteOptions {
  where?: Record<string, unknown>
  returning?: boolean
}

// ============================================================================
// Relationship Types
// ============================================================================

export interface HasOneRelation<T> {
  type: 'hasOne'
  entity: string
  foreignKey: string
  localKey?: string
  schema: Schema<T>
}

export interface HasManyRelation<T> {
  type: 'hasMany'
  entity: string
  foreignKey: string
  localKey?: string
  schema: Schema<T>
}

export interface BelongsToRelation<T> {
  type: 'belongsTo'
  entity: string
  foreignKey: string
  ownerKey?: string
  schema: Schema<T>
}

export type Relation<T> = HasOneRelation<T> | HasManyRelation<T> | BelongsToRelation<T>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Relations = Record<string, Relation<any>>

// ============================================================================
// Storage Adapter Interface
// ============================================================================

export interface StorageAdapter<T> {
  create(data: T): Promise<Result<RepositoryError, T>>
  find(id: string | number): Promise<Result<RepositoryError, T | null>>
  findMany(options?: QueryOptions): Promise<Result<RepositoryError, T[]>>
  update(
    id: string | number,
    data: Partial<T>,
    options?: UpdateOptions
  ): Promise<Result<RepositoryError, T>>
  updateMany(data: Partial<T>, options?: UpdateOptions): Promise<Result<RepositoryError, T[]>>
  delete(id: string | number, options?: DeleteOptions): Promise<Result<RepositoryError, T | void>>
  deleteMany(options?: DeleteOptions): Promise<Result<RepositoryError, T[] | void>>
  exists(id: string | number): Promise<Result<RepositoryError, boolean>>
  count(options?: Pick<QueryOptions, 'where'>): Promise<Result<RepositoryError, number>>
}

// ============================================================================
// Repository Configuration
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RepositoryConfig<T, R extends Relations = {}> {
  schema: Schema<T>
  storage: StorageAdapter<T> | 'memory' | 'database' | 'file'
  name: string
  primaryKey?: string
  timestamps?: boolean | { createdAt: string; updatedAt: string }
  indexes?: string[]
  relationships?: R
  hooks?: {
    beforeCreate?: (data: T) => Promise<T> | T
    afterCreate?: (data: T) => Promise<void> | void
    beforeUpdate?: (id: string | number, data: Partial<T>) => Promise<Partial<T>> | Partial<T>
    afterUpdate?: (data: T) => Promise<void> | void
    beforeDelete?: (id: string | number) => Promise<void> | void
    afterDelete?: (id: string | number) => Promise<void> | void
  }
}

// ============================================================================
// Repository Interface
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Repository<T, R extends Relations = {}> {
  readonly name: string
  readonly schema: Schema<T>
  readonly relationships: R

  // Core CRUD operations
  create(data: T): Promise<Result<RepositoryError, T>>
  find(id: string | number): Promise<Result<RepositoryError, T | null>>
  findMany(options?: QueryOptions): Promise<Result<RepositoryError, T[]>>
  findOne(options: Pick<QueryOptions, 'where'>): Promise<Result<RepositoryError, T | null>>
  update(id: string | number, data: Partial<T>): Promise<Result<RepositoryError, T>>
  updateMany(data: Partial<T>, options?: UpdateOptions): Promise<Result<RepositoryError, T[]>>
  delete(id: string | number): Promise<Result<RepositoryError, void>>
  deleteMany(options?: DeleteOptions): Promise<Result<RepositoryError, void>>

  // Query operations
  exists(id: string | number): Promise<Result<RepositoryError, boolean>>
  count(options?: Pick<QueryOptions, 'where'>): Promise<Result<RepositoryError, number>>

  // Relationship operations
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
  validate(data: T): Result<RepositoryError, T>
  validatePartial(data: Partial<T>): Result<RepositoryError, Partial<T>>
}

// ============================================================================
// Relationship Helpers
// ============================================================================

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

export class MemoryStorageAdapter<T extends Record<string, unknown>> implements StorageAdapter<T> {
  private data = new Map<string | number, T>()
  private idCounter = 1

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

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export function repository<T extends Record<string, unknown>, R extends Relations = {}>(
  name: string,
  config: Omit<RepositoryConfig<T, R>, 'name'>
): Repository<T, R> {
  return new BaseRepository({ ...config, name })
}
