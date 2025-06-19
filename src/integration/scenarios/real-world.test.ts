/**
 * Real-World Integration Scenarios
 *
 * Tests complex business scenarios that combine all three pillars
 * in realistic, production-like workflows.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Result } from '../../core/shared'
import { service } from '../../core/service'
import { data } from '../../core/data'
import { pipeline } from '../../core/pipeline'
import { TestApiServer } from '../utils/test-api-server'
import {
  IntegrationDataGenerator,
  IntegrationSchemas,
  IntegrationPerformance,
} from '../utils/integration-helpers'
import { ResultTestUtils } from '../../test-utils'

describe('Real-World Integration Scenarios', () => {
  let apiServer: TestApiServer

  beforeEach(() => {
    apiServer = new TestApiServer({
      baseUrl: 'https://api.production.com',
      defaultDelay: 25, // Slightly more realistic delays
      authToken: 'prod-token-456',
    })
    apiServer.start()
  })

  afterEach(() => {
    apiServer.stop()
  })

  describe('E-Commerce Platform Scenarios', () => {
    it('should handle complete order processing workflow', async () => {
      const customers = IntegrationDataGenerator.generateUserDataset(20)
      const products = IntegrationDataGenerator.generateProductDataset(15)
      const orders = IntegrationDataGenerator.generateOrderDataset(customers, products, 50)

      // Setup comprehensive e-commerce API
      apiServer.addEndpoint({
        method: 'GET',
        path: '/customers',
        response: { customers },
      })

      apiServer.addEndpoint({
        method: 'GET',
        path: '/inventory',
        response: { products },
      })

      apiServer.addEndpoint({
        method: 'GET',
        path: '/orders/pending',
        response: {
          orders: (orders as { status: string }[]).filter(
            (order: { status: string }) => order.status === 'pending'
          ),
        },
      })

      apiServer.addEndpoint({
        method: 'POST',
        path: '/orders/process',
        response: {
          processed: true,
          orderId: 'batch-123',
          timestamp: new Date().toISOString(),
        },
      })

      apiServer.addEndpoint({
        method: 'POST',
        path: '/notifications/send',
        response: { sent: true, count: 0 },
      })

      const orderProcessingWorkflow = pipeline.compose([
        // Step 1: Fetch all required data
        async () => {
          const fetchOperations = [
            () => service.get('/customers'),
            () => service.get('/inventory'),
            () => service.get('/orders/pending'),
          ]

          const allData = await pipeline.parallel(fetchOperations, {
            maxConcurrency: 3,
            failFast: true,
          })

          if (Result.isErr(allData)) {
            throw new Error('Failed to fetch required data')
          }

          const dataArray = allData.value as unknown[]

          // Extract data from Result objects
          const customersResult = dataArray[0] as Result<unknown, { customers: unknown[] }>
          const inventoryResult = dataArray[1] as Result<unknown, { products: unknown[] }>
          const ordersResult = dataArray[2] as Result<unknown, { orders: unknown[] }>

          return {
            customers: Result.isOk(customersResult) ? customersResult.value.customers : [],
            inventory: Result.isOk(inventoryResult) ? inventoryResult.value.products : [],
            pendingOrders: Result.isOk(ordersResult) ? ordersResult.value.orders : [],
          }
        },

        // Step 2: Validate and enrich order data
        async (businessData: unknown) => {
          const typedBusinessData = businessData as {
            customers: unknown[]
            inventory: unknown[]
            pendingOrders: unknown[]
          }
          // Create lookup maps for fast data enrichment
          const customerMap = new Map()
          const inventoryMap = new Map()

          // Validate and index customers
          for (const customer of typedBusinessData.customers) {
            const validation = data.validate(customer, IntegrationSchemas.user)
            if (Result.isOk(validation)) {
              customerMap.set(validation.value.id, validation.value)
            }
          }

          // Validate and index inventory
          for (const product of typedBusinessData.inventory) {
            const validation = data.validate(product, IntegrationSchemas.product)
            if (Result.isOk(validation)) {
              inventoryMap.set(validation.value.id, validation.value)
            }
          }

          // Enrich and validate orders
          const enrichedOrders = await pipeline.map(
            typedBusinessData.pendingOrders,
            (order: unknown) => {
              const typedOrder = order as {
                id: string
                userId: number
                products: { productId: string; quantity: number; price: number }[]
                total: number
                status: string
                createdAt: string
                region: string
              }
              const customer = customerMap.get(typedOrder.userId) as
                | {
                    id: number
                    name: string
                    email: string
                    department: string
                    salary: number
                    region: string
                  }
                | undefined
              if (!customer) {
                throw new Error(`Customer ${typedOrder.userId} not found`)
              }

              // Validate inventory availability
              const orderProducts = typedOrder.products.map(orderProduct => {
                const product = inventoryMap.get(orderProduct.productId) as
                  | { id: string; name: string; inStock: boolean; category: string; price: number }
                  | undefined
                if (!product) {
                  throw new Error(`Product ${orderProduct.productId} not found`)
                }

                return {
                  ...orderProduct,
                  productName: product.name,
                  availableStock: product.inStock,
                  category: product.category,
                }
              })

              // Calculate enriched order data
              return {
                ...typedOrder,
                customer: customer as {
                  id: number
                  name: string
                  email: string
                  department: string
                  salary: number
                  region: string
                },
                enrichedProducts: orderProducts,
                customerSegment:
                  (customer as { salary: number }).salary > 80000 ? 'premium' : 'standard',
                fulfillmentPriority:
                  (customer as { region: string }).region === 'North' ? 'high' : 'normal',
                estimatedShipping: typedOrder.total > 100 ? 'free' : 'standard',
              }
            },
            { continueOnError: false }
          )

          if (Result.isErr(enrichedOrders)) {
            throw new Error('Order enrichment failed')
          }

          return {
            enrichedOrders: enrichedOrders.value,
            customerCount: customerMap.size,
            inventoryCount: inventoryMap.size,
          }
        },

        // Step 3: Process orders by priority and segment
        async (orderData: unknown) => {
          const typedOrderData = orderData as {
            enrichedOrders: {
              id: string
              customerSegment: string
              fulfillmentPriority: string
              total: number
              customer: { email: string; name: string }
            }[]
            customerCount: number
            inventoryCount: number
          }
          // Group orders by processing priority
          const orderGroups = data.groupBy(typedOrderData.enrichedOrders, [
            'fulfillmentPriority',
            'customerSegment',
          ])

          if (Result.isErr(orderGroups)) {
            throw new Error('Order grouping failed')
          }

          // Process high-priority orders first
          const processingSequence = [
            { fulfillmentPriority: 'high', customerSegment: 'premium' },
            { fulfillmentPriority: 'high', customerSegment: 'standard' },
            { fulfillmentPriority: 'normal', customerSegment: 'premium' },
            { fulfillmentPriority: 'normal', customerSegment: 'standard' },
          ]

          const processedBatches = []

          for (const batch of processingSequence) {
            const batchKey = `${batch.fulfillmentPriority}-${batch.customerSegment}`
            const batchOrders = orderGroups.value[batchKey] || []

            if (batchOrders.length > 0) {
              // Process this batch
              const batchResult = await service.post('/orders/process', {
                data: {
                  orders: batchOrders.map((order: { id: string }) => order.id),
                  priority: batch.fulfillmentPriority,
                  segment: batch.customerSegment,
                },
              })

              if (Result.isOk(batchResult)) {
                processedBatches.push({
                  ...batch,
                  orderCount: batchOrders.length,
                  processedAt: new Date().toISOString(),
                  result: batchResult.value,
                })

                // Send notifications for this batch
                const notificationData = {
                  customers: batchOrders.map(
                    (order: { customer: { email: string; name: string } }) => ({
                      email: order.customer.email,
                      name: order.customer.name,
                    })
                  ),
                  type:
                    batch.fulfillmentPriority === 'high'
                      ? 'priority_processing'
                      : 'standard_processing',
                }

                await service.post('/notifications/send', { data: notificationData })
              }
            }
          }

          return {
            ...typedOrderData,
            processedBatches,
            totalProcessed: processedBatches.reduce((sum, batch) => sum + batch.orderCount, 0),
          }
        },

        // Step 4: Generate business analytics
        (processedData: unknown) => {
          const typedProcessedData = processedData as {
            enrichedOrders: {
              total: number
              customerSegment: string
              fulfillmentPriority: string
              enrichedProducts: { category: string; productId: string; quantity: number }[]
            }[]
            processedBatches: { priority: string; segment: string; orderCount: number }[]
            totalProcessed: number
            customerCount: number
            inventoryCount: number
          }
          // Calculate business metrics
          const analytics = data.aggregate(typedProcessedData.enrichedOrders, {
            groupBy: 'customerSegment',
            sum: ['total'],
            avg: ['total'],
            count: 'id',
          })

          // Calculate product analytics
          const allProducts = typedProcessedData.enrichedOrders.flatMap(
            order => order.enrichedProducts
          )
          const productAnalytics = data.aggregate(allProducts, {
            groupBy: 'category',
            sum: ['quantity'],
            count: 'productId',
          })

          return {
            processingMetrics: {
              totalOrders: typedProcessedData.enrichedOrders.length,
              processedOrders: typedProcessedData.totalProcessed,
              processingRate:
                (typedProcessedData.totalProcessed / typedProcessedData.enrichedOrders.length) *
                100,
              batchCount: typedProcessedData.processedBatches.length,
            },
            orderAnalytics: Result.isOk(analytics) ? analytics.value : {},
            productAnalytics: Result.isOk(productAnalytics) ? productAnalytics.value : {},
            businessInsights: {
              premiumCustomerOrders: typedProcessedData.enrichedOrders.filter(
                order => order.customerSegment === 'premium'
              ).length,
              highPriorityOrders: typedProcessedData.enrichedOrders.filter(
                order => order.fulfillmentPriority === 'high'
              ).length,
              averageOrderValue:
                typedProcessedData.enrichedOrders.reduce((sum, order) => sum + order.total, 0) /
                typedProcessedData.enrichedOrders.length,
            },
          }
        },
      ])

      const { result, duration, memoryUsage } = await IntegrationPerformance.measureWorkflow(
        'ecommerce-order-processing',
        async () => orderProcessingWorkflow(null)
      )

      const workflowResult = ResultTestUtils.expectOk(result) as {
        processingMetrics: {
          totalOrders: number
          processedOrders: number
          processingRate: number
          batchCount: number
        }
        orderAnalytics: unknown
        productAnalytics: unknown
        businessInsights: {
          premiumCustomerOrders: number
          highPriorityOrders: number
          averageOrderValue: number
        }
      }

      // Verify business logic execution
      expect(workflowResult.processingMetrics.totalOrders).toBeGreaterThan(0)
      expect(workflowResult.processingMetrics.processedOrders).toBeGreaterThan(0)
      expect(workflowResult.processingMetrics.processingRate).toBeGreaterThan(0)
      expect(workflowResult.orderAnalytics).toBeDefined()
      expect(workflowResult.productAnalytics).toBeDefined()
      expect(workflowResult.businessInsights.averageOrderValue).toBeGreaterThan(0)

      // Performance verification
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
      if (memoryUsage) {
        expect(memoryUsage.delta).toBeLessThan(50 * 1024 * 1024) // Should use less than 50MB
      }
    })

    it('should handle customer support ticket workflow', async () => {
      // Generate support ticket data
      const supportTickets = Array.from({ length: 30 }, (_, i) => ({
        id: `ticket-${i + 1}`,
        customerId: Math.floor(Math.random() * 20) + 1,
        subject: `Support Issue ${i + 1}`,
        description: `Customer needs help with issue ${i + 1}`,
        priority: ['low', 'medium', 'high', 'urgent'][Math.floor(Math.random() * 4)],
        category: ['technical', 'billing', 'product', 'account'][Math.floor(Math.random() * 4)],
        status: 'open',
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        assignedTo: null,
      }))

      const supportAgents = Array.from({ length: 5 }, (_, i) => ({
        id: `agent-${i + 1}`,
        name: `Agent ${i + 1}`,
        specialties: [
          ['technical'],
          ['billing', 'account'],
          ['product'],
          ['technical', 'product'],
          ['billing'],
        ][i],
        currentWorkload: Math.floor(Math.random() * 5),
        maxCapacity: 8,
        shiftStart: '09:00',
        shiftEnd: '17:00',
      }))

      // Setup support system API
      apiServer.addEndpoint({
        method: 'GET',
        path: '/support/tickets/open',
        response: { tickets: supportTickets },
      })

      apiServer.addEndpoint({
        method: 'GET',
        path: '/support/agents/available',
        response: { agents: supportAgents },
      })

      apiServer.addEndpoint({
        method: 'POST',
        path: '/support/tickets/assign',
        response: { assigned: true, assignments: [] },
      })

      apiServer.addEndpoint({
        method: 'GET',
        path: '/analytics/support/sla',
        response: {
          slaTargets: {
            urgent: { responseTime: 15, resolutionTime: 120 }, // minutes
            high: { responseTime: 60, resolutionTime: 480 },
            medium: { responseTime: 240, resolutionTime: 1440 },
            low: { responseTime: 1440, resolutionTime: 4320 },
          },
        },
      })

      const supportWorkflow = pipeline.compose([
        // Fetch support data
        async () => {
          const supportOperations = [
            () => service.get('/support/tickets/open'),
            () => service.get('/support/agents/available'),
            () => service.get('/analytics/support/sla'),
          ]

          const supportData = await pipeline.parallel(supportOperations)

          if (Result.isErr(supportData)) {
            throw new Error('Failed to fetch support data')
          }

          const supportArray = supportData.value as unknown[]

          // Extract data from Result objects
          const ticketsResult = supportArray[0] as Result<unknown, { tickets: unknown[] }>
          const agentsResult = supportArray[1] as Result<unknown, { agents: unknown[] }>
          const slaResult = supportArray[2] as Result<
            unknown,
            { slaTargets: Record<string, unknown> }
          >

          return {
            tickets: Result.isOk(ticketsResult) ? ticketsResult.value.tickets : [],
            agents: Result.isOk(agentsResult) ? agentsResult.value.agents : [],
            slaTargets: Result.isOk(slaResult) ? slaResult.value.slaTargets : {},
          }
        },

        // Prioritize and categorize tickets
        async (supportData: unknown) => {
          const typedSupportData = supportData as {
            tickets: {
              id: string
              priority: string
              category: string
              createdAt: string
              customerId: number
            }[]
            agents: {
              id: string
              specialties: string[]
              currentWorkload: number
              maxCapacity: number
            }[]
            slaTargets: Record<string, { responseTime: number; resolutionTime: number }>
          }

          // Calculate urgency scores based on priority and age
          const scoredTickets = await pipeline.map(typedSupportData.tickets, ticket => {
            const createdTime = new Date(ticket.createdAt).getTime()
            const ageMinutes = (Date.now() - createdTime) / (1000 * 60)

            const priorityScores = { urgent: 100, high: 75, medium: 50, low: 25 }
            const baseScore = priorityScores[ticket.priority as keyof typeof priorityScores] || 25

            // Add urgency based on SLA breach risk
            const sla = typedSupportData.slaTargets[ticket.priority]
            const slaRisk = sla ? Math.min(ageMinutes / sla.responseTime, 2) : 0

            const urgencyScore = baseScore + slaRisk * 25

            return {
              ...ticket,
              urgencyScore,
              ageMinutes,
              slaRisk: slaRisk > 1 ? 'breached' : slaRisk > 0.8 ? 'critical' : 'normal',
            }
          })

          if (Result.isErr(scoredTickets)) {
            throw new Error('Ticket scoring failed')
          }

          // Sort by urgency score
          const prioritizedTickets = scoredTickets.value.sort(
            (a, b) => b.urgencyScore - a.urgencyScore
          )

          return {
            ...typedSupportData,
            prioritizedTickets,
          }
        },

        // Intelligent agent assignment
        async (workflowData: unknown) => {
          const typedWorkflowData = workflowData as {
            prioritizedTickets: {
              id: string
              category: string
              priority: string
              urgencyScore: number
              slaRisk: string
            }[]
            agents: {
              id: string
              specialties: string[]
              currentWorkload: number
              maxCapacity: number
            }[]
          }

          const assignments = []

          // Smart assignment algorithm
          for (const ticket of typedWorkflowData.prioritizedTickets) {
            // Find agents who can handle this category
            const capableAgents = typedWorkflowData.agents.filter(
              agent =>
                agent.specialties.includes(ticket.category) &&
                agent.currentWorkload < agent.maxCapacity
            )

            if (capableAgents.length === 0) {
              // No specialized agents available, assign to least busy general agent
              const availableAgents = typedWorkflowData.agents.filter(
                agent => agent.currentWorkload < agent.maxCapacity
              )

              if (availableAgents.length > 0) {
                const leastBusy = availableAgents.reduce((min, agent) =>
                  agent.currentWorkload < min.currentWorkload ? agent : min
                )

                assignments.push({
                  ticketId: ticket.id,
                  agentId: leastBusy.id,
                  assignmentReason: 'general_availability',
                  priority: ticket.priority,
                  slaRisk: ticket.slaRisk,
                })

                leastBusy.currentWorkload++
              } else {
                assignments.push({
                  ticketId: ticket.id,
                  agentId: null,
                  assignmentReason: 'no_capacity',
                  priority: ticket.priority,
                  slaRisk: ticket.slaRisk,
                })
              }
            } else {
              // Assign to least busy capable agent
              const bestAgent = capableAgents.reduce((min, agent) =>
                agent.currentWorkload < min.currentWorkload ? agent : min
              )

              assignments.push({
                ticketId: ticket.id,
                agentId: bestAgent.id,
                assignmentReason: 'specialty_match',
                priority: ticket.priority,
                slaRisk: ticket.slaRisk,
              })

              bestAgent.currentWorkload++
            }
          }

          // Send assignments to system
          const assignmentResult = await service.post('/support/tickets/assign', {
            data: { assignments },
          })

          if (Result.isErr(assignmentResult)) {
            throw new Error('Assignment submission failed')
          }

          return {
            assignments,
            assignmentStats: {
              totalTickets: typedWorkflowData.prioritizedTickets.length,
              assigned: assignments.filter(a => a.agentId !== null).length,
              unassigned: assignments.filter(a => a.agentId === null).length,
              specialtyMatches: assignments.filter(a => a.assignmentReason === 'specialty_match')
                .length,
              slaBreached: assignments.filter(a => a.slaRisk === 'breached').length,
              slaCritical: assignments.filter(a => a.slaRisk === 'critical').length,
            },
          }
        },

        // Generate support analytics
        (assignmentData: unknown) => {
          const typedAssignmentData = assignmentData as {
            assignments: {
              priority: string
              slaRisk: string
              agentId: string | null
              assignmentReason: string
            }[]
            assignmentStats: Record<string, number>
          }

          const analytics = data.aggregate(typedAssignmentData.assignments, {
            groupBy: 'priority',
            count: 'ticketId',
          })

          const stats = typedAssignmentData.assignmentStats
          const efficiencyMetrics = {
            assignmentRate: ((stats.assigned || 0) / (stats.totalTickets || 1)) * 100,
            specialtyMatchRate: ((stats.specialtyMatches || 0) / (stats.assigned || 1)) * 100,
            slaRiskRate:
              (((stats.slaBreached || 0) + (stats.slaCritical || 0)) / (stats.totalTickets || 1)) *
              100,
          }

          return {
            ...typedAssignmentData,
            analytics: Result.isOk(analytics) ? analytics.value : {},
            efficiencyMetrics,
          }
        },
      ])

      const result = await supportWorkflow(null)
      const supportResult = ResultTestUtils.expectOk(result) as {
        assignmentStats: Record<string, number>
        efficiencyMetrics: Record<string, number>
        analytics: unknown
      }

      expect(supportResult.assignmentStats.totalTickets).toBe(30)
      expect(supportResult.assignmentStats.assigned).toBeGreaterThan(0)
      expect(supportResult.efficiencyMetrics.assignmentRate).toBeGreaterThan(0)
      expect(supportResult.efficiencyMetrics.specialtyMatchRate).toBeGreaterThanOrEqual(0)
      expect(supportResult.analytics).toBeDefined()
    })
  })

  describe('Financial Services Scenarios', () => {
    it('should handle fraud detection and risk assessment workflow', async () => {
      // Generate transaction data with some suspicious patterns
      const transactions = Array.from({ length: 100 }, (_, i) => {
        const isSuspicious = Math.random() < 0.1 // 10% suspicious transactions

        return {
          id: `txn-${i + 1}`,
          userId: Math.floor(Math.random() * 50) + 1,
          amount: isSuspicious
            ? Math.floor(Math.random() * 5000) + 5000 // High amounts for suspicious
            : Math.floor(Math.random() * 500) + 10, // Normal amounts
          currency: 'USD',
          merchant: isSuspicious
            ? ['Overseas Casino', 'Unknown Vendor', 'High Risk Merchant'][
                Math.floor(Math.random() * 3)
              ]
            : ['Amazon', 'Starbucks', 'Gas Station', 'Grocery Store'][
                Math.floor(Math.random() * 4)
              ],
          location: isSuspicious
            ? ['Unknown', 'Foreign Country', 'High Risk Location'][Math.floor(Math.random() * 3)]
            : ['New York', 'California', 'Texas', 'Florida'][Math.floor(Math.random() * 4)],
          timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          paymentMethod: ['credit_card', 'debit_card', 'bank_transfer'][
            Math.floor(Math.random() * 3)
          ],
          isSuspicious, // Mark for testing purposes
        }
      })

      const userProfiles = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        averageMonthlySpend: Math.floor(Math.random() * 2000) + 500,
        preferredMerchants: ['Amazon', 'Starbucks', 'Gas Station'],
        typicalLocations: ['New York', 'California'],
        riskScore: Math.random() * 100,
        accountAge: Math.floor(Math.random() * 5) + 1, // years
      }))

      // Setup fraud detection API
      apiServer.addEndpoint({
        method: 'GET',
        path: '/transactions/recent',
        response: { transactions },
      })

      apiServer.addEndpoint({
        method: 'GET',
        path: '/users/profiles',
        response: { profiles: userProfiles },
      })

      apiServer.addEndpoint({
        method: 'POST',
        path: '/fraud/alerts',
        response: { alertsCreated: 0, alertIds: [] },
      })

      apiServer.addEndpoint({
        method: 'POST',
        path: '/risk/assessment',
        response: { assessmentId: 'assessment-123', completed: true },
      })

      const fraudDetectionWorkflow = pipeline.compose([
        // Fetch transaction and user data
        async () => {
          const dataOperations = [
            () => service.get('/transactions/recent'),
            () => service.get('/users/profiles'),
          ]

          const fraudData = await pipeline.parallel(dataOperations)

          if (Result.isErr(fraudData)) {
            throw new Error('Failed to fetch fraud detection data')
          }

          const fraudArray = fraudData.value as unknown[]

          // Extract data from Result objects
          const transactionsResult = fraudArray[0] as Result<unknown, { transactions: unknown[] }>
          const profilesResult = fraudArray[1] as Result<unknown, { profiles: unknown[] }>

          return {
            transactions: Result.isOk(transactionsResult)
              ? transactionsResult.value.transactions
              : [],
            userProfiles: Result.isOk(profilesResult) ? profilesResult.value.profiles : [],
          }
        },

        // Risk scoring and anomaly detection
        async (fraudData: unknown) => {
          const typedFraudData = fraudData as {
            transactions: {
              id: string
              userId: number
              amount: number
              merchant: string
              location: string
              timestamp: string
              paymentMethod: string
            }[]
            userProfiles: {
              id: number
              averageMonthlySpend: number
              preferredMerchants: string[]
              typicalLocations: string[]
              riskScore: number
            }[]
          }

          // Create user profile lookup
          const profileMap = new Map()
          typedFraudData.userProfiles.forEach(profile => {
            profileMap.set(profile.id, profile)
          })

          // Score each transaction for fraud risk
          const scoredTransactions = await pipeline.map(
            typedFraudData.transactions,
            transaction => {
              const userProfile = profileMap.get(transaction.userId) as
                | {
                    riskScore: number
                    averageMonthlySpend: number
                    preferredMerchants: string[]
                    typicalLocations: string[]
                  }
                | undefined
              if (!userProfile) {
                return { ...transaction, riskScore: 50, riskFactors: ['unknown_user'] }
              }

              let riskScore = (userProfile as { riskScore: number }).riskScore
              const riskFactors = []

              // Amount-based risk
              if (
                transaction.amount >
                (userProfile as { averageMonthlySpend: number }).averageMonthlySpend * 0.5
              ) {
                riskScore += 20
                riskFactors.push('high_amount')
              }

              // Merchant risk
              if (
                !(userProfile as { preferredMerchants: string[] }).preferredMerchants.includes(
                  transaction.merchant
                )
              ) {
                riskScore += 15
                riskFactors.push('unusual_merchant')
              }

              // Location risk
              if (
                !(userProfile as { typicalLocations: string[] }).typicalLocations.includes(
                  transaction.location
                )
              ) {
                riskScore += 25
                riskFactors.push('unusual_location')
              }

              // Time-based risk (late night transactions)
              const hour = new Date(transaction.timestamp).getHours()
              if (hour < 6 || hour > 22) {
                riskScore += 10
                riskFactors.push('unusual_time')
              }

              // Payment method risk
              if (transaction.paymentMethod === 'bank_transfer' && transaction.amount > 1000) {
                riskScore += 15
                riskFactors.push('high_risk_payment')
              }

              return {
                ...transaction,
                riskScore: Math.min(riskScore, 100),
                riskFactors,
                riskLevel: riskScore > 80 ? 'high' : riskScore > 60 ? 'medium' : 'low',
              }
            }
          )

          if (Result.isErr(scoredTransactions)) {
            throw new Error('Transaction scoring failed')
          }

          return {
            scoredTransactions: scoredTransactions.value,
            userProfiles: typedFraudData.userProfiles,
          }
        },

        // Generate fraud alerts and risk assessments
        async (riskData: unknown) => {
          const typedRiskData = riskData as {
            scoredTransactions: {
              id: string
              userId: number
              amount: number
              riskScore: number
              riskLevel: string
              riskFactors: string[]
            }[]
            userProfiles: unknown[]
          }

          // Filter high-risk transactions
          const highRiskTransactions = typedRiskData.scoredTransactions.filter(
            txn => txn.riskLevel === 'high'
          )
          const mediumRiskTransactions = typedRiskData.scoredTransactions.filter(
            txn => txn.riskLevel === 'medium'
          )

          // Create fraud alerts for high-risk transactions
          let alertResults = { alertsCreated: 0, alertIds: [] }
          if (highRiskTransactions.length > 0) {
            const alertData = {
              transactions: highRiskTransactions.map(txn => ({
                transactionId: txn.id,
                userId: txn.userId,
                riskScore: txn.riskScore,
                riskFactors: txn.riskFactors,
                amount: txn.amount,
              })),
              alertType: 'fraud_detection',
              priority: 'high',
            }

            const alertResult = await service.post('/fraud/alerts', { data: alertData })
            if (Result.isOk(alertResult)) {
              alertResults = alertResult.value as { alertsCreated: number; alertIds: never[] }
            }
          }

          // Risk assessment for medium-risk transactions
          let assessmentResults = { assessmentId: null, completed: false }
          if (mediumRiskTransactions.length > 0) {
            const assessmentData = {
              transactions: mediumRiskTransactions.map(txn => txn.id),
              assessmentType: 'automated_review',
              priority: 'medium',
            }

            const assessmentResult = await service.post('/risk/assessment', {
              data: assessmentData,
            })
            if (Result.isOk(assessmentResult)) {
              assessmentResults = assessmentResult.value as {
                assessmentId: null
                completed: boolean
              }
            }
          }

          return {
            ...typedRiskData,
            fraudAlerts: alertResults,
            riskAssessment: assessmentResults,
            riskSummary: {
              totalTransactions: typedRiskData.scoredTransactions.length,
              highRisk: highRiskTransactions.length,
              mediumRisk: mediumRiskTransactions.length,
              lowRisk: typedRiskData.scoredTransactions.filter(txn => txn.riskLevel === 'low')
                .length,
            },
          }
        },

        // Generate fraud analytics and insights
        (fraudResults: unknown) => {
          const typedFraudResults = fraudResults as {
            scoredTransactions: {
              riskLevel: string
              riskFactors: string[]
              amount: number
              userId: number
            }[]
            riskSummary: Record<string, number>
            fraudAlerts: { alertsCreated: number }
          }
          // Analyze risk patterns
          const riskAnalytics = data.aggregate(typedFraudResults.scoredTransactions, {
            groupBy: 'riskLevel',
            avg: ['amount', 'riskScore'],
            sum: ['amount'],
            count: 'id',
          })

          // Analyze risk factors
          const allRiskFactors = typedFraudResults.scoredTransactions.flatMap(txn =>
            (txn.riskFactors || []).map(factor => ({ factor, transaction: txn }))
          )

          const factorAnalytics = data.aggregate(allRiskFactors, {
            groupBy: 'factor',
            count: 'transaction',
          })

          // Calculate fraud rates and effectiveness metrics
          const riskSummary = typedFraudResults.riskSummary
          const fraudMetrics = {
            fraudDetectionRate:
              ((riskSummary.highRisk || 0) / (riskSummary.totalTransactions || 1)) * 100,
            alertGenerationRate:
              (typedFraudResults.fraudAlerts.alertsCreated / (riskSummary.highRisk || 1)) * 100,
            falsePositiveEstimate: Math.max(
              0,
              (riskSummary.highRisk || 0) - typedFraudResults.fraudAlerts.alertsCreated
            ),
            riskDistribution: {
              high: ((riskSummary.highRisk || 0) / (riskSummary.totalTransactions || 1)) * 100,
              medium: ((riskSummary.mediumRisk || 0) / (riskSummary.totalTransactions || 1)) * 100,
              low: ((riskSummary.lowRisk || 0) / (riskSummary.totalTransactions || 1)) * 100,
            },
          }

          return {
            ...typedFraudResults,
            riskAnalytics: Result.isOk(riskAnalytics) ? riskAnalytics.value : {},
            factorAnalytics: Result.isOk(factorAnalytics) ? factorAnalytics.value : {},
            fraudMetrics,
          }
        },
      ])

      const { result, duration } = await IntegrationPerformance.measureWorkflow(
        'fraud-detection-workflow',
        async () => fraudDetectionWorkflow(null)
      )

      const fraudResult = ResultTestUtils.expectOk(result) as {
        riskSummary: Record<string, number>
        fraudMetrics: Record<string, number>
        riskAnalytics: unknown
        factorAnalytics: unknown
      }

      expect(fraudResult.riskSummary.totalTransactions).toBe(100)
      expect(fraudResult.riskSummary.highRisk).toBeGreaterThanOrEqual(0)
      expect(fraudResult.riskSummary.mediumRisk).toBeGreaterThanOrEqual(0)
      expect(fraudResult.riskSummary.lowRisk).toBeGreaterThanOrEqual(0)
      expect(fraudResult.fraudMetrics.fraudDetectionRate).toBeGreaterThanOrEqual(0)
      expect(fraudResult.riskAnalytics).toBeDefined()
      expect(fraudResult.factorAnalytics).toBeDefined()
      expect(duration).toBeLessThan(3000) // Should complete within 3 seconds
    })
  })

  describe('Healthcare Data Processing Scenarios', () => {
    it('should handle patient data processing with privacy compliance', async () => {
      // Generate anonymized patient data
      const patientRecords = Array.from({ length: 50 }, (_, i) => ({
        patientId: `patient-${String(i + 1).padStart(4, '0')}`,
        age: Math.floor(Math.random() * 80) + 18,
        gender: Math.random() > 0.5 ? 'M' : 'F',
        diagnosis: ['hypertension', 'diabetes', 'asthma', 'depression', 'arthritis'][
          Math.floor(Math.random() * 5)
        ],
        treatmentPlan: `treatment-${Math.floor(Math.random() * 10) + 1}`,
        lastVisit: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
        medications: Math.floor(Math.random() * 5) + 1,
        riskFactors: Math.floor(Math.random() * 3),
        region: ['north', 'south', 'east', 'west'][Math.floor(Math.random() * 4)],
      }))

      // Setup healthcare API
      apiServer.addEndpoint({
        method: 'GET',
        path: '/patients/records',
        response: { records: patientRecords },
        requireAuth: true,
      })

      apiServer.addEndpoint({
        method: 'POST',
        path: '/analytics/population-health',
        response: { analysisId: 'pop-health-123', status: 'completed' },
      })

      apiServer.addEndpoint({
        method: 'POST',
        path: '/compliance/audit-log',
        response: { logged: true, auditId: 'audit-456' },
      })

      const healthcareWorkflow = pipeline.compose([
        // Secure data extraction with audit logging
        async () => {
          // Log data access attempt
          await service.post('/compliance/audit-log', {
            data: {
              action: 'patient_data_access',
              timestamp: new Date().toISOString(),
              purpose: 'population_health_analysis',
            },
            headers: { Authorization: 'Bearer prod-token-456' },
          })

          // Fetch patient records
          const recordsResult = await service.get('/patients/records', {
            headers: { Authorization: 'Bearer prod-token-456' },
          })

          if (Result.isErr(recordsResult)) {
            throw new Error('Failed to fetch patient records')
          }

          return (recordsResult.value as { records: unknown[] }).records
        },

        // Data anonymization and validation
        async (records: unknown) => {
          const typedRecords = records as {
            patientId: string
            age: number
            gender: string
            diagnosis: string
            treatmentPlan: string
            lastVisit: string
            medications: number
            riskFactors: number
            region: string
          }[]

          // Anonymize sensitive data
          const anonymizedRecords = await pipeline.map(typedRecords, record => ({
            // Remove direct identifiers
            recordId: `anon-${Math.random().toString(36).substr(2, 9)}`,

            // Keep analytical fields
            ageGroup:
              record.age < 30
                ? '18-29'
                : record.age < 50
                  ? '30-49'
                  : record.age < 70
                    ? '50-69'
                    : '70+',
            gender: record.gender,
            diagnosis: record.diagnosis,
            treatmentCategory: record.treatmentPlan.split('-')[0], // Extract category only

            // Derived fields for analysis
            daysSinceLastVisit: Math.floor(
              (Date.now() - new Date(record.lastVisit).getTime()) / (1000 * 60 * 60 * 24)
            ),
            medicationLoad:
              record.medications > 3 ? 'high' : record.medications > 1 ? 'medium' : 'low',
            riskLevel: record.riskFactors > 2 ? 'high' : record.riskFactors > 0 ? 'medium' : 'low',
            region: record.region,

            // Compliance fields
            anonymizedAt: new Date().toISOString(),
            dataRetentionCategory: 'research',
          }))

          if (Result.isErr(anonymizedRecords)) {
            throw new Error('Data anonymization failed')
          }

          return anonymizedRecords.value
        },

        // Population health analysis
        async (anonymizedData: unknown) => {
          const typedAnonymizedData = anonymizedData as {
            ageGroup: string
            gender: string
            diagnosis: string
            treatmentCategory: string
            daysSinceLastVisit: number
            medicationLoad: string
            riskLevel: string
            region: string
          }[]

          // Multiple analytical perspectives
          const analyses = await pipeline.parallel([
            // Demographic analysis
            () =>
              data.aggregate(typedAnonymizedData as unknown[], {
                groupBy: 'ageGroup',
                count: 'recordId',
              }),

            // Clinical analysis
            () =>
              data.aggregate(typedAnonymizedData as unknown[], {
                groupBy: 'diagnosis',
                avg: ['daysSinceLastVisit'],
                count: 'recordId',
              }),

            // Treatment analysis
            () =>
              data.aggregate(typedAnonymizedData as unknown[], {
                groupBy: 'treatmentCategory',
                count: 'recordId',
              }),

            // Geographic analysis
            () =>
              data.aggregate(typedAnonymizedData as unknown[], {
                groupBy: 'region',
                count: 'recordId',
              }),
          ])

          if (Result.isErr(analyses)) {
            throw new Error('Population health analysis failed')
          }

          const analysesArray = analyses.value as unknown[]
          const [demographics, clinical, treatment, geographic] = analysesArray

          return {
            anonymizedRecords: (typedAnonymizedData as unknown[]).length,
            demographics: (() => {
              const typedDemo = demographics as Result<unknown, unknown>
              return demographics &&
                typeof demographics === 'object' &&
                'tag' in demographics &&
                Result.isOk(typedDemo)
                ? (typedDemo.value as Record<string, unknown>)
                : ({} as Record<string, unknown>)
            })(),
            clinical: (() => {
              const typedClinical = clinical as Result<unknown, unknown>
              return clinical &&
                typeof clinical === 'object' &&
                'tag' in clinical &&
                Result.isOk(typedClinical)
                ? (typedClinical.value as Record<string, unknown>)
                : ({} as Record<string, unknown>)
            })(),
            treatment: (() => {
              const typedTreatment = treatment as Result<unknown, unknown>
              return treatment &&
                typeof treatment === 'object' &&
                'tag' in treatment &&
                Result.isOk(typedTreatment)
                ? (typedTreatment.value as Record<string, unknown>)
                : ({} as Record<string, unknown>)
            })(),
            geographic: (() => {
              const typedGeographic = geographic as Result<unknown, unknown>
              return geographic &&
                typeof geographic === 'object' &&
                'tag' in geographic &&
                Result.isOk(typedGeographic)
                ? (typedGeographic.value as Record<string, unknown>)
                : ({} as Record<string, unknown>)
            })(),
          }
        },

        // Generate health insights and submit results
        async (analysisResults: unknown) => {
          const typedAnalysisResults = analysisResults as {
            anonymizedRecords: number
            demographics: Record<string, unknown>
            clinical: Record<string, unknown>
            treatment: Record<string, unknown>
            geographic: Record<string, unknown>
          }
          // Calculate population health metrics
          const healthInsights = {
            populationSize: typedAnalysisResults.anonymizedRecords,
            analysisCompletedAt: new Date().toISOString(),
            keyFindings: {
              totalPatients: typedAnalysisResults.anonymizedRecords,
              diagnosisDistribution: Object.keys(typedAnalysisResults.clinical).length,
              treatmentVariation: Object.keys(typedAnalysisResults.treatment).length,
              geographicCoverage: Object.keys(typedAnalysisResults.geographic).length,
            },
            complianceMetrics: {
              dataAnonymized: true,
              auditTrail: true,
              retentionPolicyApplied: true,
              analysisPermitted: true,
            },
          }

          // Submit analysis to population health system
          const submissionResult = await service.post('/analytics/population-health', {
            data: {
              analysis: analysisResults,
              insights: healthInsights,
              metadata: {
                analysisType: 'population_health',
                complianceLevel: 'HIPAA_compliant',
                dataSource: 'anonymized_patient_records',
              },
            },
            headers: { Authorization: 'Bearer prod-token-456' },
          })

          // Log completion for compliance
          await service.post('/compliance/audit-log', {
            data: {
              action: 'population_health_analysis_completed',
              timestamp: new Date().toISOString(),
              recordsProcessed: typedAnalysisResults.anonymizedRecords,
              complianceStatus: 'verified',
            },
            headers: { Authorization: 'Bearer prod-token-456' },
          })

          return {
            ...typedAnalysisResults,
            healthInsights,
            submissionResult: Result.isOk(submissionResult) ? submissionResult.value : null,
            workflowCompleted: true,
          }
        },
      ])

      const { result, duration } = await IntegrationPerformance.measureWorkflow(
        'healthcare-data-processing',
        async () => healthcareWorkflow(null)
      )

      const healthcareResult = ResultTestUtils.expectOk(result) as {
        anonymizedRecords: number
        healthInsights: {
          populationSize: number
          complianceMetrics: { dataAnonymized: boolean }
        }
        demographics: unknown
        clinical: unknown
        treatment: unknown
        geographic: unknown
        workflowCompleted: boolean
      }

      expect(healthcareResult.anonymizedRecords).toBe(50)
      expect(healthcareResult.healthInsights.populationSize).toBe(50)
      expect(healthcareResult.healthInsights.complianceMetrics.dataAnonymized).toBe(true)
      expect(healthcareResult.demographics).toBeDefined()
      expect(healthcareResult.clinical).toBeDefined()
      expect(healthcareResult.treatment).toBeDefined()
      expect(healthcareResult.geographic).toBeDefined()
      expect(healthcareResult.workflowCompleted).toBe(true)
      expect(duration).toBeLessThan(4000) // Should complete within 4 seconds
    })
  })
})
