# Enterprise Integration Example

This example demonstrates a complete enterprise-grade application using all of Kairo's advanced features together: event-driven architecture, transactions, caching, and plugins.

## Complete E-Commerce Platform

Let's build a comprehensive e-commerce platform that showcases enterprise-level integration patterns.

### Foundation Setup

```typescript
import {
  // Core Kairo
  nativeSchema,
  resource,
  pipeline,
  repository,
  transform,
  rules,
  rule,

  // Advanced features
  createEventBus,
  createTransactionManager,
  CacheManager,
  MemoryStorage,
  RedisStorage,
  createPlugin,
  registerPlugin,
  loadAndEnablePlugin,

  // Testing
  createPerformanceMonitor,
} from 'kairo'

// Initialize core infrastructure
const eventBus = createEventBus({
  maxRetries: 3,
  deadLetterEnabled: true,
})

const transactionManager = createTransactionManager({
  defaultIsolation: 'read-committed',
  defaultTimeout: 30000,
  deadlockDetection: true,
})

const cacheManager = new CacheManager({
  layers: [
    {
      name: 'memory-l1',
      priority: 100,
      storage: new MemoryStorage({ maxSize: 1000 }),
      ttl: 300000, // 5 minutes
    },
    {
      name: 'redis-l2',
      priority: 50,
      storage: new RedisStorage({
        host: 'redis.company.com',
        port: 6379,
        cluster: true,
      }),
      ttl: 3600000, // 1 hour
    },
  ],
  analytics: { enabled: true },
})

const performanceMonitor = createPerformanceMonitor({
  enabled: true,
  metricsInterval: 60000,
})
```

### Data Layer (DATA Pillar)

```typescript
// Domain schemas
const CustomerSchema = nativeSchema.object({
  id: nativeSchema.string().uuid(),
  email: nativeSchema.string().email(),
  firstName: nativeSchema.string().min(1),
  lastName: nativeSchema.string().min(1),
  phone: nativeSchema.string().optional(),
  tier: nativeSchema.enum(['bronze', 'silver', 'gold', 'platinum'] as const),
  addresses: nativeSchema.array(
    nativeSchema.object({
      id: nativeSchema.string().uuid(),
      street: nativeSchema.string(),
      city: nativeSchema.string(),
      state: nativeSchema.string(),
      zipCode: nativeSchema.string(),
      country: nativeSchema.string(),
      isDefault: nativeSchema.boolean(),
    })
  ),
  createdAt: nativeSchema.string().datetime(),
  updatedAt: nativeSchema.string().datetime().optional(),
})

const ProductSchema = nativeSchema.object({
  id: nativeSchema.string().uuid(),
  name: nativeSchema.string().min(1),
  description: nativeSchema.string(),
  price: nativeSchema.number().positive(),
  category: nativeSchema.string(),
  inventory: nativeSchema.object({
    available: nativeSchema.number().min(0),
    reserved: nativeSchema.number().min(0),
    total: nativeSchema.number().min(0),
  }),
  tags: nativeSchema.array(nativeSchema.string()),
  metadata: nativeSchema.record(nativeSchema.string()).optional(),
  active: nativeSchema.boolean(),
  createdAt: nativeSchema.string().datetime(),
  updatedAt: nativeSchema.string().datetime().optional(),
})

const OrderSchema = nativeSchema.object({
  id: nativeSchema.string().uuid(),
  customerId: nativeSchema.string().uuid(),
  items: nativeSchema.array(
    nativeSchema.object({
      productId: nativeSchema.string().uuid(),
      quantity: nativeSchema.number().positive(),
      unitPrice: nativeSchema.number().positive(),
      totalPrice: nativeSchema.number().positive(),
    })
  ),
  shipping: nativeSchema.object({
    addressId: nativeSchema.string().uuid(),
    method: nativeSchema.enum(['standard', 'express', 'overnight'] as const),
    cost: nativeSchema.number().min(0),
    trackingNumber: nativeSchema.string().optional(),
  }),
  payment: nativeSchema.object({
    method: nativeSchema.enum(['credit_card', 'paypal', 'bank_transfer'] as const),
    transactionId: nativeSchema.string().optional(),
    status: nativeSchema.enum(['pending', 'processing', 'completed', 'failed'] as const),
  }),
  totals: nativeSchema.object({
    subtotal: nativeSchema.number().positive(),
    tax: nativeSchema.number().min(0),
    shipping: nativeSchema.number().min(0),
    total: nativeSchema.number().positive(),
  }),
  status: nativeSchema.enum([
    'draft',
    'pending',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
  ] as const),
  createdAt: nativeSchema.string().datetime(),
  updatedAt: nativeSchema.string().datetime().optional(),
})

// Event-driven repositories with caching
import { eventRepository } from 'kairo/events'

const customerRepository = eventRepository({
  name: 'customers',
  schema: CustomerSchema,
  storage: 'postgresql',
  eventBus,
  cache: cacheManager,
  relationships: {
    orders: hasMany('orders', 'customerId', OrderSchema),
  },
  hooks: {
    beforeCreate: data => ({
      ...data,
      tier: 'bronze',
      createdAt: new Date().toISOString(),
    }),
    afterCreate: customer => {
      console.log(`Customer ${customer.firstName} ${customer.lastName} created`)
    },
  },
})

const productRepository = eventRepository({
  name: 'products',
  schema: ProductSchema,
  storage: 'postgresql',
  eventBus,
  cache: cacheManager,
  hooks: {
    beforeUpdate: (data, existing) => ({
      ...data,
      updatedAt: new Date().toISOString(),
    }),
  },
})

const orderRepository = eventRepository({
  name: 'orders',
  schema: OrderSchema,
  storage: 'postgresql',
  eventBus,
  transactionManager,
  cache: cacheManager,
  relationships: {
    customer: belongsTo('customers', 'customerId', CustomerSchema),
  },
})
```

### External Systems (INTERFACE Pillar)

```typescript
// Payment gateway integration
const PaymentAPI = resource(
  'payment',
  {
    processPayment: {
      method: 'POST',
      path: '/payments/process',
      body: nativeSchema.object({
        amount: nativeSchema.number().positive(),
        currency: nativeSchema.string().length(3),
        paymentMethod: nativeSchema.object({
          type: nativeSchema.enum(['credit_card', 'paypal'] as const),
          token: nativeSchema.string(),
        }),
        customerId: nativeSchema.string().uuid(),
      }),
      response: nativeSchema.object({
        transactionId: nativeSchema.string(),
        status: nativeSchema.enum(['success', 'failed', 'pending'] as const),
        message: nativeSchema.string().optional(),
      }),
    },

    refundPayment: {
      method: 'POST',
      path: '/payments/:transactionId/refund',
      params: nativeSchema.object({
        transactionId: nativeSchema.string(),
      }),
      body: nativeSchema.object({
        amount: nativeSchema.number().positive(),
        reason: nativeSchema.string(),
      }),
      response: nativeSchema.object({
        refundId: nativeSchema.string(),
        status: nativeSchema.enum(['success', 'failed'] as const),
      }),
    },
  },
  {
    baseUrl: 'https://api.payments.company.com',
    timeout: 10000,
    retry: { times: 3, delay: 1000 },
    cache: {
      manager: cacheManager,
      ttl: 0, // Don't cache payment operations
    },
  }
)

// Inventory management system
const InventoryAPI = resource(
  'inventory',
  {
    checkAvailability: {
      method: 'GET',
      path: '/inventory/check',
      query: nativeSchema.object({
        productIds: nativeSchema.array(nativeSchema.string().uuid()),
      }),
      response: nativeSchema.object({
        items: nativeSchema.array(
          nativeSchema.object({
            productId: nativeSchema.string().uuid(),
            available: nativeSchema.number().min(0),
            reserved: nativeSchema.number().min(0),
          })
        ),
      }),
    },

    reserveInventory: {
      method: 'POST',
      path: '/inventory/reserve',
      body: nativeSchema.object({
        items: nativeSchema.array(
          nativeSchema.object({
            productId: nativeSchema.string().uuid(),
            quantity: nativeSchema.number().positive(),
          })
        ),
        reservationId: nativeSchema.string().uuid(),
      }),
      response: nativeSchema.object({
        reservationId: nativeSchema.string().uuid(),
        status: nativeSchema.enum(['success', 'partial', 'failed'] as const),
        items: nativeSchema.array(
          nativeSchema.object({
            productId: nativeSchema.string().uuid(),
            requested: nativeSchema.number(),
            reserved: nativeSchema.number(),
          })
        ),
      }),
    },

    releaseInventory: {
      method: 'DELETE',
      path: '/inventory/reservations/:reservationId',
      params: nativeSchema.object({
        reservationId: nativeSchema.string().uuid(),
      }),
      response: nativeSchema.object({
        status: nativeSchema.enum(['success', 'not_found'] as const),
      }),
    },
  },
  {
    baseUrl: 'https://api.inventory.company.com',
    timeout: 5000,
    cache: {
      manager: cacheManager,
      ttl: 30000, // Cache availability checks for 30 seconds
      tags: ['inventory'],
    },
  }
)

// Shipping service
const ShippingAPI = resource(
  'shipping',
  {
    calculateShipping: {
      method: 'POST',
      path: '/shipping/calculate',
      body: nativeSchema.object({
        items: nativeSchema.array(
          nativeSchema.object({
            weight: nativeSchema.number().positive(),
            dimensions: nativeSchema.object({
              length: nativeSchema.number(),
              width: nativeSchema.number(),
              height: nativeSchema.number(),
            }),
          })
        ),
        destination: nativeSchema.object({
          zipCode: nativeSchema.string(),
          country: nativeSchema.string(),
        }),
        method: nativeSchema.enum(['standard', 'express', 'overnight'] as const),
      }),
      response: nativeSchema.object({
        cost: nativeSchema.number().min(0),
        estimatedDays: nativeSchema.number().positive(),
      }),
    },

    createShipment: {
      method: 'POST',
      path: '/shipping/shipments',
      body: nativeSchema.object({
        orderId: nativeSchema.string().uuid(),
        items: nativeSchema.array(
          nativeSchema.object({
            productId: nativeSchema.string().uuid(),
            quantity: nativeSchema.number(),
          })
        ),
        destination: nativeSchema.object({
          name: nativeSchema.string(),
          address: nativeSchema.string(),
          city: nativeSchema.string(),
          state: nativeSchema.string(),
          zipCode: nativeSchema.string(),
          country: nativeSchema.string(),
        }),
        method: nativeSchema.string(),
      }),
      response: nativeSchema.object({
        shipmentId: nativeSchema.string(),
        trackingNumber: nativeSchema.string(),
        estimatedDelivery: nativeSchema.string().datetime(),
      }),
    },
  },
  {
    baseUrl: 'https://api.shipping.company.com',
    timeout: 8000,
    cache: {
      manager: cacheManager,
      ttl: 300000, // Cache shipping calculations for 5 minutes
      tags: ['shipping'],
    },
  }
)

// Notification service
const NotificationAPI = resource(
  'notifications',
  {
    sendEmail: {
      method: 'POST',
      path: '/notifications/email',
      body: nativeSchema.object({
        to: nativeSchema.string().email(),
        template: nativeSchema.string(),
        data: nativeSchema.record(nativeSchema.any()),
      }),
      response: nativeSchema.object({
        messageId: nativeSchema.string(),
        status: nativeSchema.enum(['sent', 'queued', 'failed'] as const),
      }),
    },
  },
  {
    baseUrl: 'https://api.notifications.company.com',
    timeout: 5000,
  }
)
```

### Business Logic (PROCESS Pillar)

```typescript
import { transaction, transactionStep } from 'kairo/transactions'

// Business rules
const orderValidationRules = rules('order-validation', {
  customerExists: rule()
    .async(order => customerRepository.exists(order.customerId))
    .require(exists => exists)
    .message('Customer not found'),

  inventoryAvailable: rule()
    .async(order =>
      InventoryAPI.checkAvailability.run({
        productIds: order.items.map(item => item.productId),
      })
    )
    .require(result =>
      result.match({
        Ok: availability => {
          return order.items.every(orderItem => {
            const availableItem = availability.items.find(
              item => item.productId === orderItem.productId
            )
            return availableItem && availableItem.available >= orderItem.quantity
          })
        },
        Err: () => false,
      })
    )
    .message('Insufficient inventory'),

  minimumOrderValue: rule()
    .require(order => order.totals.subtotal >= 25)
    .message('Minimum order value is $25'),

  validShippingAddress: rule()
    .async(order => customerRepository.find(order.customerId))
    .require(result =>
      result.match({
        Ok: customer => {
          return customer.addresses.some(addr => addr.id === order.shipping.addressId)
        },
        Err: () => false,
      })
    )
    .message('Invalid shipping address'),
})

// Complex order processing pipeline with transactions
const processOrderPipeline = pipeline('process-order')
  .input(OrderSchema.omit(['id', 'status', 'createdAt', 'updatedAt']))
  .validateAll(orderValidationRules)
  .map(order => ({
    ...order,
    id: generateUUID(),
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
  }))
  .transaction(async (order, context) => {
    // Execute complex order processing transaction
    const orderTransaction = transaction(
      'process-order',
      [
        transactionStep('reserve-inventory', async order => {
          const reservation = await InventoryAPI.reserveInventory.run({
            items: order.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
            reservationId: generateUUID(),
          })

          return { ...order, reservationId: reservation.reservationId }
        }),

        transactionStep('process-payment', async order => {
          const payment = await PaymentAPI.processPayment.run({
            amount: order.totals.total,
            currency: 'USD',
            paymentMethod: order.payment,
            customerId: order.customerId,
          })

          return {
            ...order,
            payment: {
              ...order.payment,
              transactionId: payment.transactionId,
              status: payment.status === 'success' ? 'completed' : 'failed',
            },
          }
        }),

        transactionStep('create-order-record', async order => {
          if (order.payment.status === 'failed') {
            throw new PaymentError('Payment failed')
          }

          const savedOrder = await orderRepository.create({
            ...order,
            status: 'processing',
          })

          return savedOrder
        }),

        transactionStep('create-shipment', async order => {
          const customer = await customerRepository.find(order.customerId)
          const shippingAddress = customer.value?.addresses.find(
            addr => addr.id === order.shipping.addressId
          )

          const shipment = await ShippingAPI.createShipment.run({
            orderId: order.id,
            items: order.items,
            destination: {
              name: `${customer.value?.firstName} ${customer.value?.lastName}`,
              address: shippingAddress?.street || '',
              city: shippingAddress?.city || '',
              state: shippingAddress?.state || '',
              zipCode: shippingAddress?.zipCode || '',
              country: shippingAddress?.country || '',
            },
            method: order.shipping.method,
          })

          return {
            ...order,
            shipping: {
              ...order.shipping,
              trackingNumber: shipment.trackingNumber,
            },
          }
        }),
      ],
      {
        isolation: 'serializable',
        timeout: 60000,
        onRollback: async (context, error) => {
          // Comprehensive rollback handling
          if (context.reservationId) {
            await InventoryAPI.releaseInventory.run({
              reservationId: context.reservationId,
            })
          }

          if (context.payment?.transactionId) {
            await PaymentAPI.refundPayment.run({
              transactionId: context.payment.transactionId,
              amount: context.totals.total,
              reason: 'Order processing failed',
            })
          }

          // Log failure for analytics
          await auditService.logOrderFailure({
            orderId: context.id,
            error: error.message,
            stage: context.currentStep,
          })
        },
      }
    )

    return await transactionManager.execute(orderTransaction, order)
  })
  .emit('order.processing-completed')
  .step('send-confirmation', async order => {
    await NotificationAPI.sendEmail.run({
      to: order.customer.email,
      template: 'order-confirmation',
      data: {
        orderNumber: order.id,
        customerName: `${order.customer.firstName} ${order.customer.lastName}`,
        items: order.items,
        total: order.totals.total,
        trackingNumber: order.shipping.trackingNumber,
      },
    })
    return order
  })
  .cache({
    manager: cacheManager,
    key: order => `processed-order:${order.id}`,
    ttl: 3600000,
    tags: ['order', 'processed'],
  })
  .trace('order-processing-completed')
```

### Plugin System Integration

```typescript
// Comprehensive plugins for enterprise features

// Audit plugin for compliance
const auditPlugin = createPlugin('audit', {
  metadata: {
    version: '1.0.0',
    description: 'Comprehensive audit logging for compliance',
  },

  pipelineHooks: {
    beforeExecute: async (input, context) => {
      const auditId = await auditService.startAudit({
        operation: context.pipelineName,
        user: context.user,
        timestamp: new Date().toISOString(),
        inputHash: hashInput(input),
      })

      return { ...input, auditId }
    },

    afterExecute: async (result, input, context) => {
      await auditService.completeAudit({
        auditId: input.auditId,
        success: result.tag === 'Ok',
        outputHash: result.tag === 'Ok' ? hashOutput(result.value) : null,
        error: result.tag === 'Err' ? result.error.message : null,
      })

      return result
    },
  },

  repositoryHooks: {
    beforeCreate: async (data, context) => ({
      ...data,
      auditMetadata: {
        createdBy: context.user?.id,
        createdAt: new Date().toISOString(),
        source: 'api',
      },
    }),

    afterCreate: async (entity, context) => {
      await auditService.logDataChange({
        action: 'create',
        entityType: context.repositoryName,
        entityId: entity.id,
        userId: context.user?.id,
        changes: entity,
      })
      return entity
    },
  },

  eventHooks: {
    beforePublish: async (event, context) => {
      return {
        ...event,
        metadata: {
          ...event.metadata,
          auditId: generateUUID(),
          publishedBy: context.user?.id,
          publishedAt: new Date().toISOString(),
        },
      }
    },
  },
})

// Security plugin for authentication and authorization
const securityPlugin = createPlugin('security', {
  metadata: {
    version: '1.0.0',
    description: 'Enterprise security and authorization',
    dependencies: ['audit'],
  },

  resourceHooks: {
    beforeRequest: async (request, context) => {
      const token = await authService.getToken()
      return {
        ...request,
        headers: {
          ...request.headers,
          Authorization: `Bearer ${token}`,
          'X-User-ID': context.user?.id,
          'X-Request-ID': generateUUID(),
        },
      }
    },

    onError: async (error, request, context) => {
      if (error.status === 401) {
        await authService.refreshToken()
        return { retry: true }
      }

      if (error.status === 403) {
        await securityService.logUnauthorizedAccess({
          user: context.user,
          resource: request.url,
          timestamp: new Date().toISOString(),
        })
      }

      return { error }
    },
  },

  pipelineSteps: {
    authorize: (permission: string) => async (data, context) => {
      const hasPermission = await authService.checkPermission(context.user, permission)

      if (!hasPermission) {
        throw new AuthorizationError(`Permission denied: ${permission}`)
      }

      return data
    },

    validateApiKey: () => async (data, context) => {
      if (!context.apiKey || !(await apiKeyService.validate(context.apiKey))) {
        throw new AuthenticationError('Invalid API key')
      }

      return data
    },
  },

  schemaExtensions: {
    '*': {
      createdBy: { type: 'string', format: 'uuid', optional: true },
      updatedBy: { type: 'string', format: 'uuid', optional: true },
      securityLevel: {
        type: 'string',
        enum: ['public', 'internal', 'confidential', 'restricted'],
        default: 'internal',
      },
    },
  },
})

// Performance monitoring plugin
const performancePlugin = createPlugin('performance', {
  metadata: {
    version: '1.0.0',
    description: 'Real-time performance monitoring and optimization',
  },

  pipelineHooks: {
    beforeExecute: async (input, context) => {
      const span = performanceMonitor.startSpan({
        operation: context.pipelineName,
        tags: {
          pipeline: context.pipelineName,
          user: context.user?.id,
        },
      })

      return { ...input, performanceSpan: span }
    },

    afterExecute: async (result, input, context) => {
      const span = input.performanceSpan
      span.setStatus(result.tag === 'Ok' ? 'success' : 'error')
      span.finish()

      // Alert on slow operations
      if (span.duration > 5000) {
        await alertingService.notify({
          type: 'slow_operation',
          operation: context.pipelineName,
          duration: span.duration,
          user: context.user?.id,
        })
      }

      return result
    },
  },

  cacheHooks: {
    beforeGet: async (key, context) => {
      performanceMonitor.increment('cache.requests', {
        key: key.substring(0, 20), // Limit key length for metrics
      })
      return key
    },

    afterGet: async (key, result, context) => {
      performanceMonitor.increment(result.tag === 'Ok' ? 'cache.hits' : 'cache.misses', {
        key: key.substring(0, 20),
      })
    },
  },
})

// Register and activate all plugins
await Promise.all([
  registerPlugin(auditPlugin),
  registerPlugin(securityPlugin),
  registerPlugin(performancePlugin),
])

await Promise.all([
  loadAndEnablePlugin('audit'),
  loadAndEnablePlugin('security'),
  loadAndEnablePlugin('performance'),
])
```

### Event-Driven Workflows

```typescript
import { saga, sagaStep } from 'kairo/events'

// Comprehensive order fulfillment saga
const orderFulfillmentSaga = saga(
  'order-fulfillment',
  [
    sagaStep('validate-order', async input => {
      const order = await orderRepository.find(input.orderId)
      if (order.tag === 'Err') {
        throw new NotFoundError(`Order ${input.orderId} not found`)
      }

      if (order.value.status !== 'processing') {
        throw new InvalidStateError(`Order ${input.orderId} is not in processing state`)
      }

      return { ...input, order: order.value }
    }),

    sagaStep('pick-items', async input => {
      const pickingResult = await warehouseService.pickItems({
        orderId: input.orderId,
        items: input.order.items,
      })

      return { ...input, pickingId: pickingResult.id }
    }),

    sagaStep('pack-order', async input => {
      const packingResult = await warehouseService.packOrder({
        pickingId: input.pickingId,
        orderId: input.orderId,
      })

      return { ...input, packageId: packingResult.id }
    }),

    sagaStep('generate-shipping-label', async input => {
      const label = await ShippingAPI.generateLabel.run({
        packageId: input.packageId,
        orderId: input.orderId,
      })

      return { ...input, shippingLabel: label }
    }),

    sagaStep('update-order-status', async input => {
      await orderRepository.update(input.orderId, {
        status: 'shipped',
        shipping: {
          ...input.order.shipping,
          trackingNumber: input.shippingLabel.trackingNumber,
          shippedAt: new Date().toISOString(),
        },
      })

      return input
    }),

    sagaStep('notify-customer', async input => {
      await NotificationAPI.sendEmail.run({
        to: input.order.customer.email,
        template: 'order-shipped',
        data: {
          orderNumber: input.orderId,
          trackingNumber: input.shippingLabel.trackingNumber,
          estimatedDelivery: input.shippingLabel.estimatedDelivery,
        },
      })

      return input
    }),
  ],
  {
    rollbackOnFailure: true,
    eventBus: eventBus,
    compensations: {
      'pick-items': async context => {
        await warehouseService.cancelPicking(context.pickingId)
      },
      'pack-order': async context => {
        await warehouseService.unpackOrder(context.packageId)
      },
      'generate-shipping-label': async context => {
        await ShippingAPI.cancelLabel.run({ labelId: context.shippingLabel.id })
      },
      'update-order-status': async context => {
        await orderRepository.update(context.orderId, {
          status: 'processing',
          shipping: {
            ...context.order.shipping,
            trackingNumber: null,
            shippedAt: null,
          },
        })
      },
    },
  }
)

// Event subscriptions for cross-service coordination
eventBus.subscribe({
  eventType: 'orders.created',
  handler: async event => {
    // Start order processing workflow
    const result = await processOrderPipeline.run(event.payload)

    result.match({
      Ok: order => {
        console.log(`Order ${order.id} processed successfully`)
      },
      Err: error => {
        console.error(`Order processing failed:`, error)
        // Handle failure - could trigger customer notification, refund, etc.
      },
    })

    return Result.Ok(undefined)
  },
})

eventBus.subscribe({
  eventType: 'orders.updated',
  filter: event => event.payload.status === 'processing',
  handler: async event => {
    // Trigger fulfillment saga
    await sagaManager.execute(orderFulfillmentSaga, {
      orderId: event.payload.id,
    })

    return Result.Ok(undefined)
  },
})

// Cache invalidation on events
eventBus.subscribe({
  eventPattern: /^(customers|products|orders)\.(created|updated|deleted)$/,
  handler: async event => {
    const [entity, action] = event.type.split('.')

    // Invalidate related caches
    await cacheManager.invalidateByTag(entity)

    if (entity === 'products') {
      // Also invalidate inventory caches
      await cacheManager.invalidateByTag('inventory')
    }

    return Result.Ok(undefined)
  },
})
```

### API Layer and Usage

```typescript
// Express.js integration with enterprise middleware
import express from 'express'
import { rateLimit } from 'express-rate-limit'

const app = express()

// Enterprise middleware
app.use(express.json())
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  })
)

// Order creation endpoint
app.post('/api/orders', async (req, res) => {
  try {
    // Extract user context
    const user = await authService.validateToken(req.headers.authorization)
    const context = { user, apiKey: req.headers['x-api-key'] }

    // Process order with full enterprise features
    const result = await processOrderPipeline.run(req.body, context)

    result.match({
      Ok: order => {
        res.status(201).json({
          success: true,
          data: order,
          traceId: order.auditId,
        })
      },
      Err: error => {
        res.status(400).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            traceId: error.traceId,
          },
        })
      },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    })
  }
})

// Health check endpoint with comprehensive monitoring
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {},
    performance: {},
    cache: {},
  }

  try {
    // Check database connectivity
    health.services.database = await databaseService.healthCheck()

    // Check external services
    health.services.payment = await PaymentAPI.healthCheck()
    health.services.inventory = await InventoryAPI.healthCheck()
    health.services.shipping = await ShippingAPI.healthCheck()

    // Check event bus
    health.services.eventBus = await eventBus.healthCheck()

    // Performance metrics
    health.performance = performanceMonitor.getMetrics()

    // Cache analytics
    health.cache = cacheManager.getAnalytics()

    // Overall status
    const allHealthy = Object.values(health.services).every(service => service.healthy)

    health.status = allHealthy ? 'healthy' : 'degraded'

    res.status(allHealthy ? 200 : 503).json(health)
  } catch (error) {
    health.status = 'unhealthy'
    health.error = error.message
    res.status(503).json(health)
  }
})

// Metrics endpoint for monitoring
app.get('/api/metrics', async (req, res) => {
  const metrics = {
    performance: performanceMonitor.getMetrics(),
    cache: cacheManager.getAnalytics(),
    events: eventBus.getStatistics(),
    transactions: transactionManager.getMetrics(),
    timestamp: new Date().toISOString(),
  }

  res.json(metrics)
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 Enterprise e-commerce API running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`)
  console.log(`📈 Metrics: http://localhost:${PORT}/api/metrics`)
})
```

### Testing the Complete System

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { integrationTesting } from 'kairo/testing'

describe('Enterprise E-Commerce Integration', () => {
  let testContext: any

  beforeAll(async () => {
    // Set up test environment
    testContext = await integrationTesting.createTestEnvironment({
      services: ['database', 'redis', 'eventBus'],
      plugins: ['audit', 'security', 'performance'],
      mockExternalAPIs: true,
    })
  })

  afterAll(async () => {
    await testContext.cleanup()
  })

  it('should process a complete order flow', async () => {
    // Create test customer
    const customer = await customerRepository.create({
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      tier: 'bronze',
      addresses: [
        {
          id: generateUUID(),
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'US',
          isDefault: true,
        },
      ],
    })

    // Create test product
    const product = await productRepository.create({
      name: 'Test Product',
      description: 'A test product',
      price: 49.99,
      category: 'electronics',
      inventory: {
        available: 100,
        reserved: 0,
        total: 100,
      },
      tags: ['test'],
      active: true,
    })

    // Process order
    const orderData = {
      customerId: customer.id,
      items: [
        {
          productId: product.id,
          quantity: 2,
          unitPrice: 49.99,
          totalPrice: 99.98,
        },
      ],
      shipping: {
        addressId: customer.addresses[0].id,
        method: 'standard',
        cost: 9.99,
      },
      payment: {
        method: 'credit_card',
        status: 'pending',
      },
      totals: {
        subtotal: 99.98,
        tax: 8.0,
        shipping: 9.99,
        total: 117.97,
      },
    }

    const result = await processOrderPipeline.run(orderData)

    expect(result.tag).toBe('Ok')

    if (result.tag === 'Ok') {
      const order = result.value

      // Verify order was created
      expect(order.id).toBeDefined()
      expect(order.status).toBe('processing')
      expect(order.payment.status).toBe('completed')

      // Verify events were emitted
      const events = await testContext.getEmittedEvents()
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'orders.created',
          payload: expect.objectContaining({ id: order.id }),
        })
      )

      // Verify audit trail
      const auditLogs = await testContext.getAuditLogs()
      expect(auditLogs).toContainEqual(
        expect.objectContaining({
          operation: 'process-order',
          success: true,
        })
      )

      // Verify cache was populated
      const cachedOrder = await cacheManager.get(`processed-order:${order.id}`)
      expect(cachedOrder.tag).toBe('Ok')

      // Verify performance metrics
      const metrics = performanceMonitor.getMetrics()
      expect(metrics.operationsCount).toBeGreaterThan(0)
    }
  })

  it('should handle order processing failures with proper rollback', async () => {
    // Mock payment failure
    testContext.mockPaymentAPI.processPayment.mockRejectedValue(new Error('Payment declined'))

    const orderData = {
      // ... order data
    }

    const result = await processOrderPipeline.run(orderData)

    expect(result.tag).toBe('Err')

    // Verify rollback occurred
    expect(testContext.mockInventoryAPI.releaseInventory).toHaveBeenCalled()

    // Verify audit log shows failure
    const auditLogs = await testContext.getAuditLogs()
    expect(auditLogs).toContainEqual(
      expect.objectContaining({
        operation: 'process-order',
        success: false,
      })
    )
  })

  it('should maintain performance under load', async () => {
    const promises = Array.from({ length: 100 }, (_, i) =>
      processOrderPipeline.run({
        // ... test order data
        customerId: `customer-${i}`,
      })
    )

    const results = await Promise.allSettled(promises)

    // Verify most requests succeeded
    const successes = results.filter(r => r.status === 'fulfilled').length
    expect(successes).toBeGreaterThan(90) // 90% success rate

    // Verify performance metrics are within acceptable ranges
    const metrics = performanceMonitor.getMetrics()
    expect(metrics.averageLatency).toBeLessThan(1000) // < 1 second
    expect(metrics.p95Latency).toBeLessThan(2000) // < 2 seconds

    // Verify cache hit rate
    const cacheMetrics = cacheManager.getAnalytics()
    expect(cacheMetrics.hitRate).toBeGreaterThan(0.7) // > 70% hit rate
  })
})
```

This enterprise integration example demonstrates:

- **Complete Three-Pillar Architecture**: DATA, INTERFACE, and PROCESS pillars working together
- **Event-Driven Workflows**: Events driving business processes across services
- **ACID Transactions**: Complex multi-step operations with automatic rollback
- **Multi-Level Caching**: Performance optimization with intelligent invalidation
- **Plugin System**: Extensible architecture with enterprise features
- **Comprehensive Monitoring**: Performance, audit, and health monitoring
- **Production-Ready**: Error handling, security, and scalability patterns
- **Testing Strategy**: Integration testing covering all features

The result is a fully functional, enterprise-grade e-commerce platform built entirely with declarative patterns that eliminate infrastructure complexity while providing maximum business value.
