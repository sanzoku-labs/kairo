/**
 * Data Processing Integration Scenarios
 *
 * Tests complex data processing workflows that combine all three pillars
 * in realistic data pipeline scenarios.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Result } from '../../core/shared'
import { service } from '../../core/service'
import { data } from '../../core/data'
import { pipeline } from '../../core/pipeline'
import type { TransformMapping } from '../../core/data/types'
import { TestApiServer } from '../utils/test-api-server'
import {
  IntegrationDataGenerator,
  IntegrationSchemas,
  IntegrationPerformance,
} from '../utils/integration-helpers'
import { ResultTestUtils } from '../../test-utils'

describe('Data Processing Integration Scenarios', () => {
  let apiServer: TestApiServer

  beforeEach(() => {
    apiServer = new TestApiServer({
      baseUrl: 'https://api.test.com',
      defaultDelay: 5,
    })
    apiServer.start()
  })

  afterEach(() => {
    apiServer.stop()
  })

  describe('ETL (Extract, Transform, Load) Workflows', () => {
    it('should perform complete ETL pipeline for user data', async () => {
      // Setup raw data source with different format
      const rawUserData = Array.from({ length: 50 }, (_, i) => ({
        user_id: i + 1,
        full_name: `User ${i + 1}`,
        email_addr: `user${i + 1}@company.com`,
        is_active: Math.random() > 0.1,
        dept: ['ENG', 'SALES', 'MKT', 'SUP'][Math.floor(Math.random() * 4)],
        annual_salary: Math.floor(Math.random() * 50000) + 50000,
        hire_date: new Date(
          Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000 * 3
        ).toISOString(),
        skill_set: ['JS', 'TS', 'PY', 'SQL'].slice(0, Math.floor(Math.random() * 3) + 1),
      }))

      apiServer.addEndpoint({
        method: 'GET',
        path: '/raw/users',
        response: { data: rawUserData },
      })

      const etlPipeline = pipeline.compose([
        // EXTRACT: Fetch raw data from API
        async () => {
          const result = await service.get<{ data: unknown[] }>('/raw/users')
          if (Result.isErr(result)) {
            throw new Error(`Extraction failed: ${result.error.message}`)
          }
          return result.value.data
        },

        // TRANSFORM: Convert to standard format
        async (rawData: unknown) => {
          const typedRawData = rawData as unknown[]
          const transformMapping = {
            id: 'user_id',
            name: 'full_name',
            email: 'email_addr',
            active: 'is_active',
            department: (item: { dept: string }) => {
              const deptMap: Record<string, string> = {
                ENG: 'Engineering',
                SALES: 'Sales',
                MKT: 'Marketing',
                SUP: 'Support',
              }
              return deptMap[item.dept] || 'Unknown'
            },
            salary: 'annual_salary',
            joinDate: 'hire_date',
            skills: 'skill_set',
            performance: () => Math.random() * 5 + 3, // Generate performance score
            region: () => ['North', 'South', 'East', 'West'][Math.floor(Math.random() * 4)],
          }

          const transformResults = await pipeline.map(typedRawData, (item: unknown) => {
            const transformed = data.transform(
              item,
              transformMapping as TransformMapping<unknown, unknown>
            )
            if (Result.isErr(transformed)) {
              throw new Error(`Transformation failed: ${transformed.error.message}`)
            }
            return transformed.value
          })

          if (Result.isErr(transformResults)) {
            throw new Error(`Batch transformation failed: ${transformResults.error.message}`)
          }
          return transformResults.value
        },

        // VALIDATE: Ensure data quality
        async (transformedData: unknown) => {
          const typedTransformedData = transformedData as unknown[]
          const validationResults = await pipeline.map(
            typedTransformedData,
            item => {
              const validation = data.validate(item, IntegrationSchemas.user)
              if (Result.isErr(validation)) {
                // Log validation error but continue
                console.warn(`Validation failed for item:`, validation.error.message)
                return null
              }
              return validation.value
            },
            { continueOnError: true }
          )

          if (Result.isErr(validationResults)) {
            throw new Error('Validation pipeline failed')
          }

          // Filter out null values (invalid items)
          const validItems = validationResults.value.filter(item => item !== null)
          return validItems
        },

        // LOAD: Aggregate and summarize
        (validatedData: unknown) => {
          const typedValidatedData = validatedData as unknown[]
          const departmentStats = data.aggregate(typedValidatedData, {
            groupBy: 'department',
            avg: ['salary', 'performance'],
            sum: ['salary'],
            count: 'id',
          })

          const skillStats = data.aggregate(
            typedValidatedData.flatMap((user: unknown) => {
              const typedUser = user as { skills: string[] }
              return typedUser.skills.map(skill => ({ skill, user }))
            }),
            {
              groupBy: 'skill',
              count: 'user',
            }
          )

          return {
            summary: {
              totalUsers: typedValidatedData.length,
              activeUsers: typedValidatedData.filter(
                (user: unknown) => (user as { active: boolean }).active
              ).length,
              averageSalary:
                typedValidatedData.reduce(
                  (sum: number, user: unknown) => sum + (user as { salary: number }).salary,
                  0
                ) / typedValidatedData.length,
            },
            departmentStats: Result.isOk(departmentStats) ? departmentStats.value : {},
            skillStats: Result.isOk(skillStats) ? skillStats.value : {},
          }
        },
      ])

      const { result, duration } = await IntegrationPerformance.measureWorkflow(
        'complete-etl-pipeline',
        async () => etlPipeline([])
      )

      const etlResult = ResultTestUtils.expectOk(result) as {
        summary: {
          totalUsers: number
          activeUsers: number
          averageSalary: number
        }
        departmentStats: unknown
        skillStats: unknown
      }

      // Verify the complete ETL result
      expect(etlResult.summary.totalUsers).toBeGreaterThan(40) // Should have most users valid
      expect(etlResult.summary.activeUsers).toBeGreaterThan(0)
      expect(etlResult.summary.averageSalary).toBeGreaterThan(50000)
      expect(etlResult.departmentStats).toBeDefined()
      expect(etlResult.skillStats).toBeDefined()
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should handle real-time data streaming simulation', async () => {
      // Simulate streaming data by creating multiple batches
      const batches = Array.from({ length: 5 }, (_, batchIndex) =>
        Array.from({ length: 20 }, (_, itemIndex) => ({
          id: batchIndex * 20 + itemIndex + 1,
          timestamp: new Date(Date.now() + batchIndex * 1000).toISOString(),
          value: Math.random() * 100,
          category: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
          source: `sensor-${Math.floor(Math.random() * 10) + 1}`,
        }))
      )

      // Setup streaming endpoints
      batches.forEach((batch, index) => {
        apiServer.addEndpoint({
          method: 'GET',
          path: `/stream/batch/${index}`,
          response: { data: batch, batchId: index },
        })
      })

      const streamingProcessor = async () => {
        const allResults = []

        // Process each batch sequentially (simulating real-time)
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batchResult = await pipeline.compose([
            // Fetch batch
            async () => {
              const result = await service.get(`/stream/batch/${batchIndex}`)
              if (Result.isErr(result)) {
                throw new Error(`Batch ${batchIndex} fetch failed`)
              }
              return result.value
            },

            // Process batch data
            async (batchData: unknown) => {
              const typedBatchData = batchData as { data: unknown[]; batchId: number }
              // Real-time transformations
              const processed = await pipeline.map(
                typedBatchData.data as {
                  value: number
                  category: string
                  source: string
                  timestamp: string
                }[],
                (item: { value: number; category: string; source: string; timestamp: string }) => ({
                  ...item,
                  processed_at: new Date().toISOString(),
                  normalized_value: item.value / 100,
                  batch_id: typedBatchData.batchId,
                })
              )

              if (Result.isErr(processed)) {
                throw new Error(`Batch ${typedBatchData.batchId} processing failed`)
              }

              return processed.value
            },

            // Validate and filter
            async (processedItems: unknown) => {
              const typedProcessedItems = processedItems as unknown[]
              return pipeline.filter(
                typedProcessedItems as { normalized_value: number }[],
                (item: { normalized_value: number }) => item.normalized_value > 0.1 // Filter out very low values
              )
            },
          ])(null)

          if (Result.isOk(batchResult)) {
            const batchValue = batchResult.value
            // batchValue should be a Result from the filter operation
            if (batchValue && typeof batchValue === 'object' && 'tag' in batchValue) {
              const typedBatchValue = batchValue as Result<unknown, unknown>
              if (Result.isOk(typedBatchValue) && Array.isArray(typedBatchValue.value)) {
                allResults.push(...(typedBatchValue.value as unknown[]))
              }
            } else if (Array.isArray(batchValue)) {
              // Direct array result
              allResults.push(...(batchValue as unknown[]))
            }
          }
        }

        // Final aggregation across all batches
        const finalAggregation = data.aggregate(allResults, {
          groupBy: 'category',
          avg: ['normalized_value'],
          sum: ['normalized_value'],
          count: 'id',
        })

        return {
          processedItems: allResults.length,
          aggregation: Result.isOk(finalAggregation) ? finalAggregation.value : {},
        }
      }

      const { result, duration } = await IntegrationPerformance.measureWorkflow(
        'streaming-data-processing',
        streamingProcessor
      )

      expect(result.processedItems).toBeGreaterThan(50) // Should process most items
      expect(result.aggregation).toBeDefined()
      expect(duration).toBeLessThan(2000) // Should be reasonably fast
    })
  })

  describe('Data Quality and Cleansing Workflows', () => {
    it('should perform comprehensive data quality assessment', async () => {
      // Create dataset with intentional quality issues
      const problematicData = [
        // Valid records
        { id: 1, name: 'John Doe', email: 'john@example.com', age: 30, salary: 75000 },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 28, salary: 68000 },

        // Quality issues
        { id: null, name: 'Bob Johnson', email: 'bob@example.com', age: 35, salary: 80000 }, // Missing ID
        { id: 4, name: '', email: 'empty@example.com', age: 25, salary: 55000 }, // Empty name
        { id: 5, name: 'Alice Brown', email: 'not-an-email', age: 32, salary: 72000 }, // Invalid email
        { id: 6, name: 'Charlie Wilson', email: 'charlie@example.com', age: -5, salary: 95000 }, // Invalid age
        { id: 7, name: 'Diana Lee', email: 'diana@example.com', age: 29, salary: -1000 }, // Invalid salary
        {
          id: 8,
          name: 'Extremely Long Name That Exceeds Normal Length Limits For A Person Name Field',
          email: 'long@example.com',
          age: 31,
          salary: 77000,
        }, // Too long name

        // Duplicates
        { id: 9, name: 'John Doe', email: 'john@example.com', age: 30, salary: 75000 }, // Duplicate of ID 1
        { id: 10, name: 'Frank Miller', email: 'frank@example.com', age: 45, salary: 88000 }, // Valid
      ]

      apiServer.addEndpoint({
        method: 'GET',
        path: '/data/problematic',
        response: { records: problematicData },
      })

      const dataQualityPipeline = pipeline.compose([
        // Extract data
        async () => {
          const result = await service.get<{ records: unknown[] }>('/data/problematic')
          if (Result.isErr(result)) {
            throw new Error('Data extraction failed')
          }
          return result.value.records
        },

        // Quality assessment
        (records: unknown) => {
          const typedRecords = records as unknown[]
          const qualityReport = {
            total: typedRecords.length,
            issues: {
              missingId: 0,
              emptyName: 0,
              invalidEmail: 0,
              invalidAge: 0,
              invalidSalary: 0,
              nameTooLong: 0,
              duplicates: 0,
            },
            valid: [] as unknown[],
            fixable: [] as unknown[],
            rejected: [] as unknown[],
          }

          const seenEmails = new Set<string>()

          for (const record of typedRecords) {
            const item = record as {
              id: number | null
              name: string
              email: string
              age: number
              salary: number
            }

            let hasIssues = false
            let isFixable = true

            // Check for issues
            if (item.id === null || item.id === undefined) {
              qualityReport.issues.missingId++
              hasIssues = true
              isFixable = false // Can't fix missing ID
            }

            if (!item.name || item.name.trim() === '') {
              qualityReport.issues.emptyName++
              hasIssues = true
              isFixable = false // Can't fix empty name
            }

            if (item.name && item.name.length > 50) {
              qualityReport.issues.nameTooLong++
              hasIssues = true
              // This is fixable by truncating
            }

            if (!item.email || !/\S+@\S+\.\S+/.test(item.email)) {
              qualityReport.issues.invalidEmail++
              hasIssues = true
              isFixable = false // Can't fix invalid email
            }

            if (item.age < 0 || item.age > 120) {
              qualityReport.issues.invalidAge++
              hasIssues = true
              isFixable = false // Can't fix invalid age
            }

            if (item.salary < 0) {
              qualityReport.issues.invalidSalary++
              hasIssues = true
              isFixable = false // Can't fix negative salary
            }

            if (seenEmails.has(item.email)) {
              qualityReport.issues.duplicates++
              hasIssues = true
              isFixable = false // Can't automatically resolve duplicates
            } else {
              seenEmails.add(item.email)
            }

            // Categorize record
            if (!hasIssues) {
              qualityReport.valid.push(item)
            } else if (isFixable) {
              qualityReport.fixable.push(item)
            } else {
              qualityReport.rejected.push(item)
            }
          }

          return qualityReport
        },

        // Data cleansing for fixable issues
        async (report: unknown) => {
          const typedReport = report as {
            valid: unknown[]
            fixable: unknown[]
            rejected: unknown[]
            issues: Record<string, number>
          }

          const cleanedFixable = await pipeline.map(
            typedReport.fixable as {
              id: number
              name: string
              email: string
              age: number
              salary: number
            }[],
            (item: { id: number; name: string; email: string; age: number; salary: number }) => ({
              ...item,
              name: item.name.length > 50 ? item.name.substring(0, 50).trim() : item.name,
              // Add any other fixable transformations
            })
          )

          const allCleanRecords = [
            ...typedReport.valid,
            ...(Result.isOk(cleanedFixable) ? cleanedFixable.value : []),
          ]

          return {
            originalCount:
              typedReport.valid.length + typedReport.fixable.length + typedReport.rejected.length,
            validCount: typedReport.valid.length,
            fixedCount: Result.isOk(cleanedFixable) ? cleanedFixable.value.length : 0,
            rejectedCount: typedReport.rejected.length,
            issuesSummary: typedReport.issues,
            cleanRecords: allCleanRecords,
            qualityScore:
              (allCleanRecords.length /
                (typedReport.valid.length +
                  typedReport.fixable.length +
                  typedReport.rejected.length)) *
              100,
          }
        },
      ])

      const result = await dataQualityPipeline([])
      const qualityResult = ResultTestUtils.expectOk(result) as {
        originalCount: number
        validCount: number
        fixedCount: number
        rejectedCount: number
        qualityScore: number
        issuesSummary: Record<string, number>
      }

      expect(qualityResult.originalCount).toBe(10)
      expect(qualityResult.validCount).toBe(3) // 3 completely valid records (IDs 1, 2, 10)
      expect(qualityResult.fixedCount).toBe(1) // 1 record with fixable issues (long name)
      expect(qualityResult.rejectedCount).toBe(6) // 6 records with unfixable issues
      expect(qualityResult.qualityScore).toBe(40) // 40% quality score (4 out of 10 usable)

      // Check specific issue counts
      expect(qualityResult.issuesSummary.missingId).toBe(1)
      expect(qualityResult.issuesSummary.emptyName).toBe(1)
      expect(qualityResult.issuesSummary.invalidEmail).toBe(1)
      expect(qualityResult.issuesSummary.invalidAge).toBe(1)
      expect(qualityResult.issuesSummary.invalidSalary).toBe(1)
      expect(qualityResult.issuesSummary.nameTooLong).toBe(1)
      expect(qualityResult.issuesSummary.duplicates).toBe(1)
    })

    it('should perform data enrichment and augmentation', async () => {
      const baseUserData = IntegrationDataGenerator.generateUserDataset(30)

      // Setup additional data sources for enrichment
      apiServer.addEndpoint({
        method: 'GET',
        path: '/users/base',
        response: { users: baseUserData },
      })

      apiServer.addEndpoint({
        method: 'GET',
        path: '/enrichment/departments',
        response: {
          departments: {
            Engineering: { budget: 2000000, headcount: 45, location: 'Building A' },
            Sales: { budget: 1500000, headcount: 32, location: 'Building B' },
            Marketing: { budget: 800000, headcount: 28, location: 'Building B' },
            Support: { budget: 600000, headcount: 29, location: 'Building C' },
            Finance: { budget: 400000, headcount: 15, location: 'Building A' },
          },
        },
      })

      apiServer.addEndpoint({
        method: 'GET',
        path: '/enrichment/skills',
        response: {
          skillCategories: {
            JavaScript: { category: 'Frontend', demand: 'High', averageSalary: 85000 },
            TypeScript: { category: 'Frontend', demand: 'High', averageSalary: 90000 },
            Python: { category: 'Backend', demand: 'Very High', averageSalary: 95000 },
            React: { category: 'Frontend', demand: 'High', averageSalary: 88000 },
            'Node.js': { category: 'Backend', demand: 'High', averageSalary: 87000 },
            SQL: { category: 'Database', demand: 'Medium', averageSalary: 75000 },
            AWS: { category: 'Cloud', demand: 'Very High', averageSalary: 105000 },
          },
        },
      })

      const enrichmentPipeline = pipeline.compose([
        // Fetch base data and enrichment sources
        async () => {
          const operations = [
            () => service.get('/users/base'),
            () => service.get('/enrichment/departments'),
            () => service.get('/enrichment/skills'),
          ]
          return await pipeline.parallel(operations)
        },

        // Enrich user data with additional information
        async (results: unknown) => {
          // pipeline.compose passes the unwrapped value, not the Result object
          const resultsArray = results as unknown[]
          if (!Array.isArray(resultsArray) || resultsArray.length < 3) {
            throw new Error(`Expected 3 results, got ${resultsArray?.length || 'undefined'}`)
          }

          const [usersResult, departmentsResult, skillsResult] = resultsArray.map(result => {
            const typedResult = result as Result<unknown, unknown>
            if (Result.isErr(typedResult)) {
              throw new Error('Failed to fetch individual data source')
            }
            return typedResult.value
          }) as [
            { users: unknown[] },
            {
              departments: Record<string, { budget: number; headcount: number; location: string }>
            },
            {
              skillCategories: Record<
                string,
                { category: string; demand: string; averageSalary: number }
              >
            },
          ]

          const { users } = usersResult
          const { departments } = departmentsResult
          const { skillCategories } = skillsResult

          const enrichedUsers = await pipeline.map(
            users as {
              id: number
              name: string
              email: string
              department: string
              skills: string[]
              salary: number
              performance: number
            }[],
            (user: {
              id: number
              name: string
              email: string
              department: string
              skills: string[]
              salary: number
              performance: number
            }) => {
              // Add department information
              const deptInfo =
                departments[user.department] ||
                ({} as { budget?: number; headcount?: number; location?: string })

              // Calculate skill value
              const skillsInfo = user.skills
                .map(skill => ({
                  name: skill,
                  ...skillCategories[skill],
                }))
                .filter(skill => skill.category) // Only include known skills

              const averageSkillSalary =
                skillsInfo.length > 0
                  ? skillsInfo.reduce((sum, skill) => sum + (skill.averageSalary || 0), 0) /
                    skillsInfo.length
                  : 0

              // Calculate enriched metrics
              const salaryVsMarket =
                averageSkillSalary > 0 ? (user.salary / averageSkillSalary) * 100 : 100
              const skillScore = skillsInfo.filter(
                skill => skill.demand === 'High' || skill.demand === 'Very High'
              ).length

              return {
                ...user,
                // Department enrichment
                departmentBudget: deptInfo.budget || 0,
                departmentHeadcount: deptInfo.headcount || 0,
                departmentLocation: deptInfo.location || 'Unknown',

                // Skills enrichment
                skillsDetailed: skillsInfo,
                skillScore,
                marketSalaryComparison: Math.round(salaryVsMarket),

                // Calculated metrics
                salaryPercentile: 0, // Will be calculated after all users are processed
                retentionRisk:
                  user.performance < 5 && salaryVsMarket < 90
                    ? 'High'
                    : user.performance < 6 && salaryVsMarket < 95
                      ? 'Medium'
                      : 'Low',
              }
            }
          )

          if (Result.isErr(enrichedUsers)) {
            throw new Error('User enrichment failed')
          }

          // Calculate salary percentiles
          const sortedBySalary = [...enrichedUsers.value].sort((a, b) => a.salary - b.salary)
          const enrichedWithPercentiles = enrichedUsers.value.map(user => {
            const rank = sortedBySalary.findIndex(u => u.id === user.id) + 1
            const percentile = Math.round((rank / sortedBySalary.length) * 100)
            return { ...user, salaryPercentile: percentile }
          })

          return enrichedWithPercentiles
        },

        // Generate enriched analytics
        (enrichedUsers: unknown) => {
          const typedEnrichedUsers = enrichedUsers as unknown[]
          const analytics = data.aggregate(typedEnrichedUsers, {
            groupBy: 'department',
            avg: ['salary', 'performance', 'skillScore', 'marketSalaryComparison'],
            sum: ['salary'],
            count: 'id',
          })

          const skillAnalytics = data.aggregate(
            (
              typedEnrichedUsers as {
                skillsDetailed: { name: string; category: string; demand: string }[]
              }[]
            ).flatMap(
              (user: { skillsDetailed: { name: string; category: string; demand: string }[] }) =>
                user.skillsDetailed.map(skill => ({ ...skill, user }))
            ),
            {
              groupBy: 'category',
              count: 'user',
            }
          )

          return {
            enrichedUserCount: typedEnrichedUsers.length,
            departmentAnalytics: Result.isOk(analytics) ? analytics.value : {},
            skillAnalytics: Result.isOk(skillAnalytics) ? skillAnalytics.value : {},
            retentionRisks: {
              high: (typedEnrichedUsers as { retentionRisk: string }[]).filter(
                (user: { retentionRisk: string }) => user.retentionRisk === 'High'
              ).length,
              medium: (typedEnrichedUsers as { retentionRisk: string }[]).filter(
                (user: { retentionRisk: string }) => user.retentionRisk === 'Medium'
              ).length,
              low: (typedEnrichedUsers as { retentionRisk: string }[]).filter(
                (user: { retentionRisk: string }) => user.retentionRisk === 'Low'
              ).length,
            },
          }
        },
      ])

      const { result, duration } = await IntegrationPerformance.measureWorkflow(
        'data-enrichment-pipeline',
        async () => enrichmentPipeline([])
      )

      const enrichmentResult = ResultTestUtils.expectOk(result) as {
        enrichedUserCount: number
        departmentAnalytics: unknown
        skillAnalytics: unknown
        retentionRisks: { high: number; medium: number; low: number }
      }

      expect(enrichmentResult.enrichedUserCount).toBe(30)
      expect(enrichmentResult.departmentAnalytics).toBeDefined()
      expect(enrichmentResult.skillAnalytics).toBeDefined()
      expect(enrichmentResult.retentionRisks.high).toBeGreaterThanOrEqual(0)
      expect(enrichmentResult.retentionRisks.medium).toBeGreaterThanOrEqual(0)
      expect(enrichmentResult.retentionRisks.low).toBeGreaterThanOrEqual(0)
      expect(duration).toBeLessThan(2000) // Should complete within 2 seconds
    })
  })

  describe('Machine Learning Data Preparation', () => {
    it('should prepare feature sets for ML training', async () => {
      const mlDataset = IntegrationDataGenerator.generateUserDataset(200)

      apiServer.addEndpoint({
        method: 'GET',
        path: '/ml/raw-data',
        response: { dataset: mlDataset },
      })

      const mlPrepPipeline = pipeline.compose([
        // Extract raw ML data
        async () => {
          const result = await service.get<{ dataset: unknown[] }>('/ml/raw-data')
          if (Result.isErr(result)) {
            throw new Error('ML data extraction failed')
          }
          return result.value.dataset
        },

        // Feature engineering
        async (rawData: unknown) => {
          const typedRawData = rawData as unknown[]
          const featureEngineering = await pipeline.map(
            typedRawData as {
              id: number
              name: string
              salary: number
              performance: number
              department: string
              skills: string[]
              joinDate: string
              region: string
              active: boolean
            }[],
            (user: {
              id: number
              name: string
              salary: number
              performance: number
              department: string
              skills: string[]
              joinDate: string
              region: string
              active: boolean
            }) => {
              const joinDateObj = new Date(user.joinDate)
              const now = new Date()
              const tenureMonths = Math.floor(
                (now.getTime() - joinDateObj.getTime()) / (1000 * 60 * 60 * 24 * 30)
              )

              // Create feature vector
              return {
                // Identifier
                id: user.id,

                // Numerical features
                salary_normalized: (user.salary - 50000) / 50000, // Normalize salary
                performance_score: user.performance,
                tenure_months: tenureMonths,
                skill_count: user.skills.length,

                // Categorical features (one-hot encoded)
                dept_engineering: user.department === 'Engineering' ? 1 : 0,
                dept_sales: user.department === 'Sales' ? 1 : 0,
                dept_marketing: user.department === 'Marketing' ? 1 : 0,
                dept_support: user.department === 'Support' ? 1 : 0,
                dept_finance: user.department === 'Finance' ? 1 : 0,

                region_north: user.region === 'North' ? 1 : 0,
                region_south: user.region === 'South' ? 1 : 0,
                region_east: user.region === 'East' ? 1 : 0,
                region_west: user.region === 'West' ? 1 : 0,

                // Skill-based features
                has_javascript: user.skills.includes('JavaScript') ? 1 : 0,
                has_typescript: user.skills.includes('TypeScript') ? 1 : 0,
                has_python: user.skills.includes('Python') ? 1 : 0,
                has_react: user.skills.includes('React') ? 1 : 0,

                // Derived features
                salary_per_skill: user.skills.length > 0 ? user.salary / user.skills.length : 0,
                performance_tenure_ratio:
                  tenureMonths > 0 ? user.performance / tenureMonths : user.performance,

                // Target variable (for supervised learning)
                target_high_performer: user.performance > 7 ? 1 : 0,
                target_retention_risk: user.performance < 5 && user.salary < 70000 ? 1 : 0,

                // Keep original for reference
                original_active: user.active,
              }
            }
          )

          if (Result.isErr(featureEngineering)) {
            throw new Error('Feature engineering failed')
          }

          return featureEngineering.value
        },

        // Data splitting and validation
        (features: unknown) => {
          const typedFeatures = features as unknown[]
          // Split into train/validation/test sets
          const shuffled = [...typedFeatures].sort(() => Math.random() - 0.5) // Simple shuffle
          const totalSize = shuffled.length
          const trainSize = Math.floor(totalSize * 0.7)
          const validSize = Math.floor(totalSize * 0.15)

          const trainSet = shuffled.slice(0, trainSize)
          const validSet = shuffled.slice(trainSize, trainSize + validSize)
          const testSet = shuffled.slice(trainSize + validSize)

          // Calculate feature statistics for normalization
          const featureStats = data.aggregate(trainSet, {
            avg: ['salary_normalized', 'performance_score', 'tenure_months', 'skill_count'],
            // Note: For a real ML pipeline, we'd calculate std dev, min, max, etc.
          })

          // Validate feature quality
          const qualityChecks = {
            trainSize: trainSet.length,
            validSize: validSet.length,
            testSize: testSet.length,
            featureCount: Object.keys(trainSet[0] as object).length - 1, // Excluding ID
            missingValues: 0, // Count missing values
            classBalance: {
              highPerformers: (trainSet as { target_high_performer: number }[]).filter(
                (item: { target_high_performer: number }) => item.target_high_performer === 1
              ).length,
              atRisk: (trainSet as { target_retention_risk: number }[]).filter(
                (item: { target_retention_risk: number }) => item.target_retention_risk === 1
              ).length,
            },
          }

          return {
            datasets: { trainSet, validSet, testSet },
            featureStats: Result.isOk(featureStats) ? featureStats.value : {},
            qualityChecks,
            ready: qualityChecks.trainSize > 100 && qualityChecks.featureCount > 10,
          }
        },
      ])

      const { result, duration } = await IntegrationPerformance.measureWorkflow(
        'ml-data-preparation',
        async () => mlPrepPipeline([])
      )

      const mlResult = ResultTestUtils.expectOk(result) as {
        datasets: {
          trainSet: unknown[]
          validSet: unknown[]
          testSet: unknown[]
        }
        qualityChecks: { featureCount: number }
        ready: boolean
      }

      expect(mlResult.datasets.trainSet.length).toBeGreaterThan(100)
      expect(mlResult.datasets.validSet.length).toBeGreaterThan(20)
      expect(mlResult.datasets.testSet.length).toBeGreaterThan(20)
      expect(mlResult.qualityChecks.featureCount).toBeGreaterThan(15)
      expect(mlResult.ready).toBe(true)
      expect(duration).toBeLessThan(1500) // Should complete within 1.5 seconds

      // Verify feature engineering worked correctly
      const firstTrainingSample = mlResult.datasets.trainSet[0] as {
        salary_normalized: number
        dept_engineering: number
        has_javascript: number
        target_high_performer: number
      }

      expect(typeof firstTrainingSample.salary_normalized).toBe('number')
      expect([0, 1]).toContain(firstTrainingSample.dept_engineering)
      expect([0, 1]).toContain(firstTrainingSample.has_javascript)
      expect([0, 1]).toContain(firstTrainingSample.target_high_performer)
    })
  })
})
