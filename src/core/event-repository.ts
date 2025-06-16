/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unsafe-assignment */
import { Result } from './result'
import type { DomainEvent, EventBus } from './events'
import { createEventBus, createEvent } from './event-bus'
import type { Schema } from './native-schema'

/**
 * Repository events for data changes
 */
export interface EntityCreatedEvent<T = unknown> {
  entityId: string
  entityType: string
  entity: T
  timestamp: number
  metadata?: Record<string, unknown>
}

export interface EntityUpdatedEvent<T = unknown> {
  entityId: string
  entityType: string
  previousEntity: T
  updatedEntity: T
  changes: Record<string, unknown>
  timestamp: number
  metadata?: Record<string, unknown>
}

export interface EntityDeletedEvent<T = unknown> {
  entityId: string
  entityType: string
  entity: T
  timestamp: number
  metadata?: Record<string, unknown>
}

export interface QueryExecutedEvent {
  repositoryName: string
  operation: string
  query: Record<string, unknown>
  resultCount: number
  duration: number
  timestamp: number
}

/**
 * Event-aware repository configuration
 */
export interface EventRepositoryConfig<T> {
  name: string
  schema: Schema<T>
  eventBus?: EventBus
  emitEvents?: boolean
  eventPrefix?: string
  storage?: StorageAdapter<T>
  hooks?: {
    beforeCreate?: (entity: T) => T | Promise<T>
    afterCreate?: (entity: T) => void | Promise<void>
    beforeUpdate?: (id: string, updates: Partial<T>, current: T) => Partial<T> | Promise<Partial<T>>
    afterUpdate?: (id: string, entity: T, previous: T) => void | Promise<void>
    beforeDelete?: (id: string, entity: T) => void | Promise<void>
    afterDelete?: (id: string, entity: T) => void | Promise<void>
  }
}

/**
 * Storage adapter interface
 */
export interface StorageAdapter<T> {
  create(id: string, entity: T): Promise<Result<Error, T>>
  findById(id: string): Promise<Result<Error, T | null>>
  findMany(query: Record<string, unknown>): Promise<Result<Error, T[]>>
  update(id: string, updates: Partial<T>): Promise<Result<Error, T>>
  delete(id: string): Promise<Result<Error, T>>
  exists(id: string): Promise<Result<Error, boolean>>
  count(query?: Record<string, unknown>): Promise<Result<Error, number>>
}

/**
 * In-memory storage adapter
 */
export class InMemoryStorageAdapter<T extends Record<string, unknown>>
  implements StorageAdapter<T>
{
  private data = new Map<string, T>()

  async create(id: string, entity: T): Promise<Result<Error, T>> {
    try {
      if (this.data.has(id)) {
        return Result.Err(new Error(`Entity with id ${id} already exists`))
      }

      const entityWithId = { ...entity, id } as T
      this.data.set(id, entityWithId)
      return Result.Ok(entityWithId)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  async findById(id: string): Promise<Result<Error, T | null>> {
    try {
      const entity = this.data.get(id) || null
      return Result.Ok(entity)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  async findMany(query: Record<string, unknown>): Promise<Result<Error, T[]>> {
    try {
      const entities = Array.from(this.data.values())

      if (Object.keys(query).length === 0) {
        return Result.Ok(entities)
      }

      const filtered = entities.filter(entity => {
        return Object.entries(query).every(([key, value]) => {
          return entity[key] === value
        })
      })

      return Result.Ok(filtered)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  async update(id: string, updates: Partial<T>): Promise<Result<Error, T>> {
    try {
      const existing = this.data.get(id)
      if (!existing) {
        return Result.Err(new Error(`Entity with id ${id} not found`))
      }

      const updated = { ...existing, ...updates } as T
      this.data.set(id, updated)
      return Result.Ok(updated)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  async delete(id: string): Promise<Result<Error, T>> {
    try {
      const existing = this.data.get(id)
      if (!existing) {
        return Result.Err(new Error(`Entity with id ${id} not found`))
      }

      this.data.delete(id)
      return Result.Ok(existing)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  async exists(id: string): Promise<Result<Error, boolean>> {
    try {
      return Result.Ok(this.data.has(id))
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  async count(query?: Record<string, unknown>): Promise<Result<Error, number>> {
    try {
      if (!query || Object.keys(query).length === 0) {
        return Result.Ok(this.data.size)
      }

      const findResult = await this.findMany(query)
      if (Result.isErr(findResult)) {
        return findResult
      }

      return Result.Ok(findResult.value.length)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  // Debug methods
  clear(): void {
    this.data.clear()
  }

  getAll(): T[] {
    return Array.from(this.data.values())
  }
}

/**
 * Event-driven repository implementation
 */
export class EventRepository<T extends Record<string, unknown>> {
  private readonly eventBus: EventBus
  private readonly storage: StorageAdapter<T>
  private readonly entityType: string
  private readonly eventPrefix: string

  constructor(private readonly config: EventRepositoryConfig<T>) {
    this.eventBus = config.eventBus || createEventBus()
    this.storage = config.storage || new InMemoryStorageAdapter<T>()
    this.entityType = config.name
    this.eventPrefix = config.eventPrefix || config.name.toLowerCase()
  }

  /**
   * Create a new entity with event emission
   */
  async create(entity: Omit<T, 'id'>, id?: string): Promise<Result<Error, T>> {
    const startTime = Date.now()
    const entityId =
      id || `${this.entityType}_${Date.now()}_${Math.random().toString(36).substring(2)}`

    try {
      // Validate entity
      const validationResult = this.config.schema.parse(entity)
      if (Result.isErr(validationResult)) {
        return Result.Err(new Error(validationResult.error.message))
      }

      let processedEntity = validationResult.value

      // Run before create hook
      if (this.config.hooks?.beforeCreate) {
        processedEntity = await this.config.hooks.beforeCreate(processedEntity)
      }

      // Create entity
      const createResult = await this.storage.create(entityId, processedEntity)
      if (Result.isErr(createResult)) {
        return createResult
      }

      const createdEntity = createResult.value

      // Emit entity created event
      if (this.config.emitEvents !== false) {
        await this.eventBus.publish(
          createEvent<EntityCreatedEvent<T>>(
            `${this.eventPrefix}.created`,
            {
              entityId,
              entityType: this.entityType,
              entity: createdEntity,
              timestamp: Date.now(),
            },
            {
              aggregateId: entityId,
              aggregateType: this.entityType,
            }
          )
        )
      }

      // Emit query executed event
      if (this.config.emitEvents !== false) {
        await this.eventBus.publish(
          createEvent<QueryExecutedEvent>('repository.query.executed', {
            repositoryName: this.config.name,
            operation: 'create',
            query: { entity: processedEntity },
            resultCount: 1,
            duration: Date.now() - startTime,
            timestamp: Date.now(),
          })
        )
      }

      // Run after create hook
      if (this.config.hooks?.afterCreate) {
        await this.config.hooks.afterCreate(createdEntity)
      }

      return Result.Ok(createdEntity)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Result<Error, T | null>> {
    const startTime = Date.now()

    try {
      const result = await this.storage.findById(id)

      // Emit query executed event
      if (this.config.emitEvents !== false) {
        await this.eventBus.publish(
          createEvent<QueryExecutedEvent>('repository.query.executed', {
            repositoryName: this.config.name,
            operation: 'findById',
            query: { id },
            resultCount: Result.isOk(result) && result.value ? 1 : 0,
            duration: Date.now() - startTime,
            timestamp: Date.now(),
          })
        )
      }

      return result
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Find multiple entities with query
   */
  async findMany(query: Record<string, unknown> = {}): Promise<Result<Error, T[]>> {
    const startTime = Date.now()

    try {
      const result = await this.storage.findMany(query)

      // Emit query executed event
      if (this.config.emitEvents !== false) {
        await this.eventBus.publish(
          createEvent<QueryExecutedEvent>('repository.query.executed', {
            repositoryName: this.config.name,
            operation: 'findMany',
            query,
            resultCount: Result.isOk(result) ? result.value.length : 0,
            duration: Date.now() - startTime,
            timestamp: Date.now(),
          })
        )
      }

      return result
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Update entity with event emission
   */
  async update(id: string, updates: Partial<T>): Promise<Result<Error, T>> {
    const startTime = Date.now()

    try {
      // Get current entity
      const currentResult = await this.storage.findById(id)
      if (Result.isErr(currentResult)) {
        return currentResult
      }

      const currentEntity = currentResult.value
      if (!currentEntity) {
        return Result.Err(new Error(`Entity with id ${id} not found`))
      }

      // Run before update hook
      let processedUpdates = updates
      if (this.config.hooks?.beforeUpdate) {
        processedUpdates = await this.config.hooks.beforeUpdate(id, updates, currentEntity)
      }

      // Update entity
      const updateResult = await this.storage.update(id, processedUpdates)
      if (Result.isErr(updateResult)) {
        return updateResult
      }

      const updatedEntity = updateResult.value

      // Calculate changes
      const changes: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(processedUpdates)) {
        if (currentEntity[key] !== value) {
          changes[key] = { from: currentEntity[key], to: value }
        }
      }

      // Emit entity updated event
      if (this.config.emitEvents !== false) {
        await this.eventBus.publish(
          createEvent<EntityUpdatedEvent<T>>(
            `${this.eventPrefix}.updated`,
            {
              entityId: id,
              entityType: this.entityType,
              previousEntity: currentEntity,
              updatedEntity,
              changes,
              timestamp: Date.now(),
            },
            {
              aggregateId: id,
              aggregateType: this.entityType,
            }
          )
        )
      }

      // Emit query executed event
      if (this.config.emitEvents !== false) {
        await this.eventBus.publish(
          createEvent<QueryExecutedEvent>('repository.query.executed', {
            repositoryName: this.config.name,
            operation: 'update',
            query: { id, updates: processedUpdates },
            resultCount: 1,
            duration: Date.now() - startTime,
            timestamp: Date.now(),
          })
        )
      }

      // Run after update hook
      if (this.config.hooks?.afterUpdate) {
        await this.config.hooks.afterUpdate(id, updatedEntity, currentEntity)
      }

      return Result.Ok(updatedEntity)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Delete entity with event emission
   */
  async delete(id: string): Promise<Result<Error, T>> {
    const startTime = Date.now()

    try {
      // Get current entity
      const currentResult = await this.storage.findById(id)
      if (Result.isErr(currentResult)) {
        return currentResult
      }

      const currentEntity = currentResult.value
      if (!currentEntity) {
        return Result.Err(new Error(`Entity with id ${id} not found`))
      }

      // Run before delete hook
      if (this.config.hooks?.beforeDelete) {
        await this.config.hooks.beforeDelete(id, currentEntity)
      }

      // Delete entity
      const deleteResult = await this.storage.delete(id)
      if (Result.isErr(deleteResult)) {
        return deleteResult
      }

      const deletedEntity = deleteResult.value

      // Emit entity deleted event
      if (this.config.emitEvents !== false) {
        await this.eventBus.publish(
          createEvent<EntityDeletedEvent<T>>(
            `${this.eventPrefix}.deleted`,
            {
              entityId: id,
              entityType: this.entityType,
              entity: deletedEntity,
              timestamp: Date.now(),
            },
            {
              aggregateId: id,
              aggregateType: this.entityType,
            }
          )
        )
      }

      // Emit query executed event
      if (this.config.emitEvents !== false) {
        await this.eventBus.publish(
          createEvent<QueryExecutedEvent>('repository.query.executed', {
            repositoryName: this.config.name,
            operation: 'delete',
            query: { id },
            resultCount: 1,
            duration: Date.now() - startTime,
            timestamp: Date.now(),
          })
        )
      }

      // Run after delete hook
      if (this.config.hooks?.afterDelete) {
        await this.config.hooks.afterDelete(id, deletedEntity)
      }

      return Result.Ok(deletedEntity)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Check if entity exists
   */
  async exists(id: string): Promise<Result<Error, boolean>> {
    return await this.storage.exists(id)
  }

  /**
   * Count entities
   */
  async count(query?: Record<string, unknown>): Promise<Result<Error, number>> {
    return await this.storage.count(query)
  }

  /**
   * Get the event bus for external subscriptions
   */
  getEventBus(): EventBus {
    return this.eventBus
  }

  /**
   * Subscribe to repository events
   */
  onCreated(
    handler: (event: DomainEvent<EntityCreatedEvent<T>>) => Promise<Result<Error, void>>
  ): Result<Error, string> {
    return this.eventBus.subscribe({
      eventType: `${this.eventPrefix}.created`,
      handler,
    })
  }

  onUpdated(
    handler: (event: DomainEvent<EntityUpdatedEvent<T>>) => Promise<Result<Error, void>>
  ): Result<Error, string> {
    return this.eventBus.subscribe({
      eventType: `${this.eventPrefix}.updated`,
      handler,
    })
  }

  onDeleted(
    handler: (event: DomainEvent<EntityDeletedEvent<T>>) => Promise<Result<Error, void>>
  ): Result<Error, string> {
    return this.eventBus.subscribe({
      eventType: `${this.eventPrefix}.deleted`,
      handler,
    })
  }
}

/**
 * Create an event-driven repository
 */
export function eventRepository<T extends Record<string, unknown>>(
  config: EventRepositoryConfig<T>
): EventRepository<T> {
  return new EventRepository(config)
}
