/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-floating-promises */
import { describe, it, expect, beforeEach } from 'vitest'
import { Result } from './result'
import { createEventBus, getGlobalEventBus, setGlobalEventBus, createEvent } from './event-bus'
import { createInMemoryEventStore } from './event-store'
import { createSagaManager, sagaStep, saga } from './saga'
import type { SagaManager, EnhancedSagaDefinition } from './saga'
import { eventPipeline } from './event-pipeline'
import type { EventRepository } from './event-repository'
import { eventRepository } from './event-repository'
import { nativeSchema } from './native-schema'
import type { DomainEvent, EventBus, EventStore } from './events'

describe('Event System', () => {
  describe('Event Bus', () => {
    let eventBus: EventBus

    beforeEach(() => {
      eventBus = createEventBus()
    })

    it('should publish and handle events', async () => {
      const receivedEvents: DomainEvent[] = []

      const subscriptionResult = eventBus.subscribe({
        eventType: 'test.event',
        handler: async event => {
          receivedEvents.push(event)
          return Result.Ok(undefined)
        },
      })

      expect(Result.isOk(subscriptionResult)).toBe(true)

      const event = createEvent('test.event', { message: 'Hello World' })
      const publishResult = await eventBus.publish(event)

      expect(Result.isOk(publishResult)).toBe(true)
      expect(receivedEvents).toHaveLength(1)
      expect(receivedEvents[0]!.type).toBe('test.event')
      expect(receivedEvents[0]!.payload).toEqual({ message: 'Hello World' })
    })

    it('should handle event filtering', async () => {
      const receivedEvents: DomainEvent[] = []

      eventBus.subscribe({
        eventType: 'test.event',
        filter: event => (event.payload as any).priority === 'high',
        handler: async event => {
          receivedEvents.push(event)
          return Result.Ok(undefined)
        },
      })

      await eventBus.publish(createEvent('test.event', { priority: 'low' }))
      await eventBus.publish(createEvent('test.event', { priority: 'high' }))

      expect(receivedEvents).toHaveLength(1)
      expect((receivedEvents[0]!.payload as any).priority).toBe('high')
    })

    it('should handle retry logic and dead letter queue', async () => {
      let attempts = 0

      eventBus.subscribe({
        eventType: 'failing.event',
        handler: async () => {
          attempts++
          return Result.Err(new Error('Always fails'))
        },
        retryPolicy: {
          maxRetries: 2,
          backoffMs: 10,
        },
      })

      const event = createEvent('failing.event', { test: true })
      await eventBus.publish(event)

      expect(attempts).toBe(3) // Initial attempt + 2 retries
      expect(eventBus.getDeadLetterQueue()).toHaveLength(1)
    })

    it('should unsubscribe handlers', async () => {
      const receivedEvents: DomainEvent[] = []

      const subscriptionResult = eventBus.subscribe({
        eventType: 'test.event',
        handler: async event => {
          receivedEvents.push(event)
          return Result.Ok(undefined)
        },
      })

      const subscriptionId = (subscriptionResult as any).value
      await eventBus.publish(createEvent('test.event', {}))

      expect(receivedEvents).toHaveLength(1)

      const unsubscribeResult = eventBus.unsubscribe(subscriptionId)
      expect(Result.isOk(unsubscribeResult)).toBe(true)

      await eventBus.publish(createEvent('test.event', {}))
      expect(receivedEvents).toHaveLength(1) // No new events
    })

    it('should handle global event bus', () => {
      const originalBus = getGlobalEventBus()
      const newBus = createEventBus()

      setGlobalEventBus(newBus)
      expect(getGlobalEventBus()).toBe(newBus)

      // Reset to original
      setGlobalEventBus(originalBus)
    })
  })

  describe('Event Store', () => {
    let eventStore: EventStore

    beforeEach(() => {
      eventStore = createInMemoryEventStore()
    })

    it('should append and retrieve events', async () => {
      const events = [
        createEvent('user.created', { name: 'John' }),
        createEvent('user.updated', { name: 'Jane' }),
      ]

      const appendResult = await eventStore.append('user-123', events)
      expect(Result.isOk(appendResult)).toBe(true)
      expect((appendResult as any).value).toBe(2)

      const streamResult = await eventStore.getStream('user-123')
      expect(Result.isOk(streamResult)).toBe(true)

      const stream = (streamResult as any).value
      expect(stream.events).toHaveLength(2)
      expect(stream.streamId).toBe('user-123')
      expect(stream.version).toBe(2)
    })

    it('should handle optimistic concurrency control', async () => {
      const event1 = createEvent('user.created', { name: 'John' })

      // First append should succeed
      const result1 = await eventStore.append('user-123', [event1], 0)
      expect(Result.isOk(result1)).toBe(true)

      // Second append with wrong expected version should fail
      const event2 = createEvent('user.updated', { name: 'Jane' })
      const result2 = await eventStore.append('user-123', [event2], 0)
      expect(Result.isErr(result2)).toBe(true)
    })

    it('should replay events', async () => {
      const events = [
        createEvent('user.created', { name: 'John' }),
        createEvent('user.updated', { name: 'Jane' }),
      ]

      await eventStore.append('user-123', events)

      const replayedEvents: DomainEvent[] = []
      const replayResult = await eventStore.replay('user-123', async event => {
        replayedEvents.push(event)
        return Result.Ok(undefined)
      })

      expect(Result.isOk(replayResult)).toBe(true)
      expect((replayResult as any).value).toBe(2)
      expect(replayedEvents).toHaveLength(2)
    })

    it('should get all events across streams', async () => {
      await eventStore.append('stream-1', [createEvent('event.a', {})])
      await eventStore.append('stream-2', [createEvent('event.b', {})])

      const allEventsResult = await eventStore.getAllEvents()
      expect(Result.isOk(allEventsResult)).toBe(true)
      expect((allEventsResult as any).value).toHaveLength(2)
    })
  })

  describe('Saga Manager', () => {
    let sagaManager: SagaManager

    beforeEach(() => {
      sagaManager = createSagaManager()
    })

    it('should execute saga steps successfully', async () => {
      let step1Executed = false
      let step2Executed = false

      const testSaga: EnhancedSagaDefinition = saga('test-saga', [
        sagaStep('step1', async () => {
          step1Executed = true
          return Result.Ok('step1-result')
        }),
        sagaStep('step2', async () => {
          step2Executed = true
          return Result.Ok('step2-result')
        }),
      ])

      const result = await sagaManager.execute(testSaga, {})

      expect(result.state).toBe('completed')
      expect(result.completedSteps).toEqual(['step1', 'step2'])
      expect(step1Executed).toBe(true)
      expect(step2Executed).toBe(true)
    })

    it('should handle saga step failures', async () => {
      const testSaga: EnhancedSagaDefinition = saga('failing-saga', [
        sagaStep('step1', async () => Result.Ok('success')),
        sagaStep('step2', async () => Result.Err(new Error('Step 2 failed'))),
      ])

      const result = await sagaManager.execute(testSaga, {})

      expect(result.state).toBe('failed')
      expect(result.failedStep).toBe('step2')
      expect(result.completedSteps).toEqual(['step1'])
      expect(result.error?.message).toBe('Step 2 failed')
    })

    it('should handle saga with retry policy', async () => {
      let attempts = 0

      const testSaga: EnhancedSagaDefinition = saga('retry-saga', [
        sagaStep(
          'failing-step',
          async () => {
            attempts++
            if (attempts < 3) {
              return Result.Err(new Error('Temporary failure'))
            }
            return Result.Ok('success')
          },
          undefined,
          {
            retryPolicy: {
              maxRetries: 2,
              backoffMs: 10,
            },
          }
        ),
      ])

      const result = await sagaManager.execute(testSaga, {})

      expect(result.state).toBe('completed')
      expect(attempts).toBe(3)
    })

    it('should cancel running saga', async () => {
      const testSaga: EnhancedSagaDefinition = saga('long-saga', [
        sagaStep('step1', async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
          return Result.Ok('success')
        }),
      ])

      const resultPromise = sagaManager.execute(testSaga, {})

      // Cancel after a short delay
      setTimeout(() => {
        const activeSagas = sagaManager.getActiveSagas()
        if (activeSagas.length > 0) {
          sagaManager.cancel(activeSagas[0]!.sagaId)
        }
      }, 10)

      const result = await resultPromise
      expect(result.state).toBe('failed')
    })
  })

  describe('Event Pipeline', () => {
    it('should execute pipeline with event emission', async () => {
      const eventBus = createEventBus()
      const receivedEvents: DomainEvent[] = []

      // Subscribe to pipeline events
      eventBus.subscribe({
        eventType: 'pipeline.started',
        handler: async event => {
          receivedEvents.push(event)
          return Result.Ok(undefined)
        },
      })

      eventBus.subscribe({
        eventType: 'pipeline.completed',
        handler: async event => {
          receivedEvents.push(event)
          return Result.Ok(undefined)
        },
      })

      const pipeline = eventPipeline<number>('test-pipeline', { eventBus })
        .map('double', x => x * 2)
        .map('add-ten', x => x + 10)

      const result = await pipeline.execute(5)

      expect(Result.isOk(result)).toBe(true)
      expect((result as any).value).toBe(20) // (5 * 2) + 10

      // Should have received started and completed events
      expect(receivedEvents).toHaveLength(2)
      expect(receivedEvents[0]!.type).toBe('pipeline.started')
      expect(receivedEvents[1]!.type).toBe('pipeline.completed')
    })

    it('should emit custom events', async () => {
      const eventBus = createEventBus()
      const receivedEvents: DomainEvent[] = []

      eventBus.subscribe({
        eventType: 'custom.event',
        handler: async event => {
          receivedEvents.push(event)
          return Result.Ok(undefined)
        },
      })

      const pipeline = eventPipeline<string>('test-pipeline', { eventBus }).emit(
        'custom.event',
        input => ({ message: input })
      )

      await pipeline.execute('Hello World')

      expect(receivedEvents).toHaveLength(1)
      expect(receivedEvents[0]!.type).toBe('custom.event')
      expect(receivedEvents[0]!.payload).toEqual({ message: 'Hello World' })
    })

    it('should handle pipeline failures with events', async () => {
      const eventBus = createEventBus()
      const receivedEvents: DomainEvent[] = []

      eventBus.subscribe({
        eventType: 'pipeline.failed',
        handler: async event => {
          receivedEvents.push(event)
          return Result.Ok(undefined)
        },
      })

      const pipeline = eventPipeline<number>('failing-pipeline', { eventBus }).map('fail', () => {
        throw new Error('Pipeline failed')
      })

      const result = await pipeline.execute(5)

      expect(Result.isErr(result)).toBe(true)
      expect(receivedEvents).toHaveLength(1)
      expect(receivedEvents[0]!.type).toBe('pipeline.failed')
    })
  })

  describe('Event Repository', () => {
    let repository: EventRepository<{ id: string; name: string; email: string }>

    beforeEach(() => {
      const schema = nativeSchema.object({
        id: nativeSchema.string(),
        name: nativeSchema.string(),
        email: nativeSchema.string().email(),
      })

      repository = eventRepository({
        name: 'users',
        schema,
        emitEvents: true,
      })
    })

    it('should emit events on entity creation', async () => {
      const receivedEvents: DomainEvent[] = []

      repository.onCreated(async event => {
        receivedEvents.push(event)
        return Result.Ok(undefined)
      })

      const result = await repository.create({
        name: 'John Doe',
        email: 'john@example.com',
      })

      expect(Result.isOk(result)).toBe(true)
      expect(receivedEvents).toHaveLength(1)
      expect(receivedEvents[0]!.type).toBe('users.created')
      expect((receivedEvents[0]!.payload as any).entity.name).toBe('John Doe')
    })

    it('should emit events on entity updates', async () => {
      const receivedEvents: DomainEvent[] = []

      repository.onUpdated(async event => {
        receivedEvents.push(event)
        return Result.Ok(undefined)
      })

      // Create entity first
      const createResult = await repository.create(
        {
          name: 'John Doe',
          email: 'john@example.com',
        },
        'user-123'
      )

      expect(Result.isOk(createResult)).toBe(true)

      // Update entity
      const updateResult = await repository.update('user-123', {
        name: 'Jane Doe',
      })

      expect(Result.isOk(updateResult)).toBe(true)
      expect(receivedEvents).toHaveLength(1)
      expect(receivedEvents[0]!.type).toBe('users.updated')

      const payload = receivedEvents[0]!.payload as any
      expect(payload.previousEntity.name).toBe('John Doe')
      expect(payload.updatedEntity.name).toBe('Jane Doe')
    })

    it('should emit events on entity deletion', async () => {
      const receivedEvents: DomainEvent[] = []

      repository.onDeleted(async event => {
        receivedEvents.push(event)
        return Result.Ok(undefined)
      })

      // Create entity first
      await repository.create(
        {
          name: 'John Doe',
          email: 'john@example.com',
        },
        'user-123'
      )

      // Delete entity
      const deleteResult = await repository.delete('user-123')

      expect(Result.isOk(deleteResult)).toBe(true)
      expect(receivedEvents).toHaveLength(1)
      expect(receivedEvents[0]!.type).toBe('users.deleted')
      expect((receivedEvents[0]!.payload as any).entity.name).toBe('John Doe')
    })

    it('should handle repository operations without events', async () => {
      const schema = nativeSchema.object({
        id: nativeSchema.string(),
        name: nativeSchema.string(),
      })

      const noEventRepo = eventRepository({
        name: 'items',
        schema,
        emitEvents: false,
      })

      const result = await noEventRepo.create({ name: 'Test Item' })
      expect(Result.isOk(result)).toBe(true)

      // No events should be in the event bus
      expect(noEventRepo.getEventBus().getSubscriptions()).toHaveLength(0)
    })
  })

  describe('Integration Tests', () => {
    it('should handle complex event-driven workflow', async () => {
      const eventBus = createEventBus()

      const receivedEvents: DomainEvent[] = []

      // Subscribe to all events
      eventBus.subscribe({
        eventType: 'user.created',
        handler: async event => {
          receivedEvents.push(event)
          return Result.Ok(undefined)
        },
      })

      // Create event-driven repository
      const userSchema = nativeSchema.object({
        id: nativeSchema.string(),
        name: nativeSchema.string(),
        email: nativeSchema.string(),
      })

      const userRepo = eventRepository({
        name: 'users',
        schema: userSchema,
        eventBus,
      })

      // Create event-driven pipeline
      const userPipeline = eventPipeline<{ name: string; email: string }>('user-pipeline', {
        eventBus,
      })
        .map('validate', input => {
          if (!input.name || !input.email) {
            throw new Error('Name and email required')
          }
          return input
        })
        .emit('user.validated')

      // Execute the workflow
      const userData = { name: 'John Doe', email: 'john@example.com' }

      const pipelineResult = await userPipeline.execute(userData)
      expect(Result.isOk(pipelineResult)).toBe(true)

      const repoResult = await userRepo.create(userData)
      expect(Result.isOk(repoResult)).toBe(true)

      // Should have received events from both pipeline and repository
      expect(receivedEvents.length).toBeGreaterThan(0)
    })
  })
})
