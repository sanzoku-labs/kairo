/* eslint-disable @typescript-eslint/require-await */
import { Result } from '../../core/result'
import type { EventStore, EventStream, EventStoreEntry, DomainEvent, EventHandler } from './events'

/**
 * Event store configuration
 */
export interface EventStoreConfig {
  readonly maxEventsPerStream?: number
  readonly snapshotFrequency?: number
  readonly retentionPeriodMs?: number
}

/**
 * Event snapshot for performance optimization
 */
export interface EventSnapshot<T = unknown> {
  readonly streamId: string
  readonly streamVersion: number
  readonly timestamp: number
  readonly data: T
}

/**
 * Storage adapter interface for different persistence backends
 */
export interface EventStorageAdapter {
  appendEvents(
    streamId: string,
    events: EventStoreEntry[],
    expectedVersion?: number
  ): Promise<Result<Error, number>>
  getEvents(streamId: string, fromVersion?: number): Promise<Result<Error, EventStoreEntry[]>>
  getAllEvents(fromTimestamp?: number): Promise<Result<Error, EventStoreEntry[]>>
  saveSnapshot<T>(snapshot: EventSnapshot<T>): Promise<Result<Error, void>>
  getSnapshot(streamId: string): Promise<Result<Error, EventSnapshot | null>>
  deleteStream(streamId: string): Promise<Result<Error, void>>
}

/**
 * In-memory storage adapter for development and testing
 */
export class InMemoryEventStorageAdapter implements EventStorageAdapter {
  private streams = new Map<string, EventStoreEntry[]>()
  private snapshots = new Map<string, EventSnapshot>()
  private globalEvents: EventStoreEntry[] = []

  async appendEvents(
    streamId: string,
    events: EventStoreEntry[],
    expectedVersion?: number
  ): Promise<Result<Error, number>> {
    try {
      const existingEvents = this.streams.get(streamId) || []
      const currentVersion = existingEvents.length

      // Check expected version for optimistic concurrency control
      if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
        return Result.Err(
          new Error(
            `Concurrency conflict: expected version ${expectedVersion}, but current version is ${currentVersion}`
          )
        )
      }

      // Add stream version to events
      const versionedEvents = events.map((event, index) => ({
        ...event,
        streamId,
        streamVersion: currentVersion + index + 1,
      }))

      // Append to stream
      const updatedEvents = [...existingEvents, ...versionedEvents]
      this.streams.set(streamId, updatedEvents)

      // Add to global events for cross-stream queries
      this.globalEvents.push(...versionedEvents)

      return Result.Ok(updatedEvents.length)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  async getEvents(
    streamId: string,
    fromVersion?: number
  ): Promise<Result<Error, EventStoreEntry[]>> {
    try {
      const events = this.streams.get(streamId) || []
      const filteredEvents =
        fromVersion !== undefined
          ? events.filter(event => event.streamVersion >= fromVersion)
          : events

      return Result.Ok(filteredEvents)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  async getAllEvents(fromTimestamp?: number): Promise<Result<Error, EventStoreEntry[]>> {
    try {
      const filteredEvents =
        fromTimestamp !== undefined
          ? this.globalEvents.filter(event => event.timestamp >= fromTimestamp)
          : this.globalEvents

      // Sort by timestamp to maintain chronological order
      const sortedEvents = filteredEvents.sort((a, b) => a.timestamp - b.timestamp)
      return Result.Ok(sortedEvents)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  async saveSnapshot<T>(snapshot: EventSnapshot<T>): Promise<Result<Error, void>> {
    try {
      this.snapshots.set(snapshot.streamId, snapshot)
      return Result.Ok(undefined)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  async getSnapshot(streamId: string): Promise<Result<Error, EventSnapshot | null>> {
    try {
      const snapshot = this.snapshots.get(streamId) || null
      return Result.Ok(snapshot)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  async deleteStream(streamId: string): Promise<Result<Error, void>> {
    try {
      // Remove stream events
      this.streams.delete(streamId)

      // Remove from global events
      this.globalEvents = this.globalEvents.filter(event => event.streamId !== streamId)

      // Remove snapshot
      this.snapshots.delete(streamId)

      return Result.Ok(undefined)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  // Additional methods for testing and debugging
  getStreamIds(): string[] {
    return Array.from(this.streams.keys())
  }

  getEventCount(): number {
    return this.globalEvents.length
  }

  clear(): void {
    this.streams.clear()
    this.snapshots.clear()
    this.globalEvents.length = 0
  }
}

/**
 * Event store implementation
 */
export class KairoEventStore implements EventStore {
  constructor(private readonly adapter: EventStorageAdapter = new InMemoryEventStorageAdapter()) {}

  /**
   * Append events to a stream with optimistic concurrency control
   */
  async append<T>(
    streamId: string,
    events: DomainEvent<T>[],
    expectedVersion?: number
  ): Promise<Result<Error, number>> {
    try {
      if (events.length === 0) {
        return Result.Err(new Error('Cannot append empty event list'))
      }

      // Convert domain events to store entries
      const storeEntries: EventStoreEntry<T>[] = events.map(event => ({
        ...event,
        streamId,
        streamVersion: 0, // Will be set by adapter
        causationId: event.metadata?.causationId as string,
        correlationId: event.metadata?.correlationId as string,
      }))

      return await this.adapter.appendEvents(streamId, storeEntries, expectedVersion)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Get event stream by ID
   */
  async getStream(streamId: string, fromVersion?: number): Promise<Result<Error, EventStream>> {
    try {
      const eventsResult = await this.adapter.getEvents(streamId, fromVersion)
      if (Result.isErr(eventsResult)) {
        return eventsResult
      }

      const events = eventsResult.value
      const streamVersion = events.length > 0 ? Math.max(...events.map(e => e.streamVersion)) : 0

      const stream: EventStream = {
        streamId,
        streamType: events.length > 0 ? events[0]?.aggregateType || 'unknown' : 'unknown',
        version: streamVersion,
        events,
      }

      return Result.Ok(stream)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Get all events across all streams
   */
  async getAllEvents(fromTimestamp?: number): Promise<Result<Error, EventStoreEntry[]>> {
    return await this.adapter.getAllEvents(fromTimestamp)
  }

  /**
   * Replay events from a stream through a handler
   */
  async replay(streamId: string, handler: EventHandler): Promise<Result<Error, number>> {
    try {
      const streamResult = await this.getStream(streamId)
      if (Result.isErr(streamResult)) {
        return Result.Err(streamResult.error)
      }

      const stream = streamResult.value
      let processedCount = 0

      for (const event of stream.events) {
        const result = await handler(event)
        if (Result.isErr(result)) {
          return Result.Err(
            new Error(
              `Replay failed at event ${event.id} (version ${event.streamVersion}): ${result.error.message}`
            )
          )
        }
        processedCount++
      }

      return Result.Ok(processedCount)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Create a snapshot of the current stream state
   */
  async saveSnapshot<T>(
    streamId: string,
    data: T,
    streamVersion: number
  ): Promise<Result<Error, void>> {
    try {
      const snapshot: EventSnapshot<T> = {
        streamId,
        streamVersion,
        timestamp: Date.now(),
        data,
      }

      return await this.adapter.saveSnapshot(snapshot)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Get the latest snapshot for a stream
   */
  async getSnapshot(streamId: string): Promise<Result<Error, EventSnapshot | null>> {
    return await this.adapter.getSnapshot(streamId)
  }

  /**
   * Delete an entire event stream (use with caution)
   */
  async deleteStream(streamId: string): Promise<Result<Error, void>> {
    return await this.adapter.deleteStream(streamId)
  }

  /**
   * Get stream statistics
   */
  async getStreamStats(streamId: string): Promise<
    Result<
      Error,
      {
        eventCount: number
        firstEventTimestamp: number | null
        lastEventTimestamp: number | null
        streamVersion: number
      }
    >
  > {
    try {
      const streamResult = await this.getStream(streamId)
      if (Result.isErr(streamResult)) {
        return Result.Err(streamResult.error)
      }

      const stream = streamResult.value
      const events = stream.events

      const stats = {
        eventCount: events.length,
        firstEventTimestamp: events.length > 0 ? events[0]?.timestamp || null : null,
        lastEventTimestamp: events.length > 0 ? events[events.length - 1]?.timestamp || null : null,
        streamVersion: stream.version,
      }

      return Result.Ok(stats)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }

  /**
   * Project events from multiple streams into a read model
   */
  async project<TReadModel>(
    streamIds: string[],
    initialState: TReadModel,
    projector: (state: TReadModel, event: EventStoreEntry) => TReadModel,
    fromTimestamp?: number
  ): Promise<Result<Error, TReadModel>> {
    try {
      let currentState = initialState

      for (const streamId of streamIds) {
        const streamResult = await this.getStream(streamId)
        if (Result.isErr(streamResult)) {
          continue // Skip streams that don't exist or have errors
        }

        const stream = streamResult.value
        const relevantEvents = fromTimestamp
          ? stream.events.filter(event => event.timestamp >= fromTimestamp)
          : stream.events

        for (const event of relevantEvents) {
          currentState = projector(currentState, event)
        }
      }

      return Result.Ok(currentState)
    } catch (error) {
      return Result.Err(error as Error)
    }
  }
}

/**
 * Create a new event store instance
 */
export function createEventStore(adapter?: EventStorageAdapter): EventStore {
  return new KairoEventStore(adapter)
}

/**
 * Create an in-memory event store (useful for testing)
 */
export function createInMemoryEventStore(): EventStore {
  return new KairoEventStore(new InMemoryEventStorageAdapter())
}
