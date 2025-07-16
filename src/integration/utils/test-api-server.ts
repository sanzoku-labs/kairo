/**
 * Mock API Server for Integration Testing
 *
 * Provides realistic HTTP endpoints for testing SERVICE pillar integration
 * with other pillars in complex workflows.
 */

// Using standard Response type from global scope

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  response?: unknown
  status?: number
  delay?: number
  headers?: Record<string, string>
  requireAuth?: boolean
  handler?: (context: { params: Record<string, string>, body?: unknown }) => { status: number, body: unknown }
}

export interface ServerConfig {
  baseUrl: string
  defaultDelay: number
  authToken?: string
  rateLimit?: {
    requests: number
    windowMs: number
  }
}

/**
 * Mock API Server for integration testing
 */
export class TestApiServer {
  private readonly endpoints = new Map<string, ApiEndpoint>()
  private readonly requestCounts = new Map<string, number>()
  private lastReset = Date.now()
  private readonly config: ServerConfig

  constructor(config: Partial<ServerConfig> = {}) {
    this.config = {
      baseUrl: 'https://api.test.com',
      defaultDelay: 10,
      ...config,
    }
  }

  /**
   * Register an API endpoint
   */
  addEndpoint(endpoint: ApiEndpoint): void {
    const key = `${endpoint.method}:${endpoint.path}`
    this.endpoints.set(key, endpoint)
  }

  /**
   * Remove an endpoint
   */
  removeEndpoint(method: string, path: string): void {
    const key = `${method}:${path}`
    this.endpoints.delete(key)
  }

  /**
   * Clear all endpoints
   */
  clearEndpoints(): void {
    this.endpoints.clear()
    this.requestCounts.clear()
  }

  /**
   * Setup fetch mock to intercept requests
   */
  start(): void {
    global.fetch = this.createMockFetch()
  }

  /**
   * Restore original fetch
   */
  stop(): void {
    // Note: In a real implementation, we'd restore the original fetch
    // For testing purposes, we'll just clear our state
    this.clearEndpoints()
  }

  /**
   * Get request statistics
   */
  getStats(): Record<string, number> {
    return Object.fromEntries(this.requestCounts)
  }

  /**
   * Reset request counters
   */
  resetStats(): void {
    this.requestCounts.clear()
    this.lastReset = Date.now()
  }

  /**
   * Create mock fetch implementation
   */
  private createMockFetch() {
    return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : 'unknown'
      const method = (init?.method || 'GET').toUpperCase()

      // Extract path from URL - handle both absolute and relative URLs
      let path: string
      try {
        if (url.startsWith('/')) {
          // Relative URL
          path = url.split('?')[0] || url // Remove query params for matching
        } else {
          // Absolute URL
          const urlObj = new URL(url)
          path = urlObj.pathname
        }
      } catch {
        // Fallback for invalid URLs
        path = url.startsWith('/') ? url.split('?')[0] || url : '/unknown'
      }

      // Check rate limiting (use base path without query params)
      if (this.config.rateLimit) {
        const basePath = path.split('?')[0] // Remove query parameters for rate limiting
        const key = `${method}:${basePath}`
        const count = this.requestCounts.get(key) || 0

        if (Date.now() - this.lastReset > this.config.rateLimit.windowMs) {
          this.resetStats()
        } else if (count >= this.config.rateLimit.requests) {
          return this.createErrorResponse(429, 'Too Many Requests', url)
        }

        this.requestCounts.set(key, count + 1)
      }

      // Find matching endpoint
      const endpointKey = `${method}:${path}`
      let endpoint = this.endpoints.get(endpointKey)

      // If not found, try to match dynamic routes (e.g., /users/:id)
      let routeParams: Record<string, string> = {}
      if (!endpoint) {
        for (const [key, ep] of this.endpoints.entries()) {
          const colonIndex = key.indexOf(':')
          if (colonIndex === -1) continue

          const epMethod = key.substring(0, colonIndex)
          const fullEpPath = key.substring(colonIndex + 1) // Get everything after method:
          if (epMethod === method && this.matchesRoute(fullEpPath, path)) {
            endpoint = ep
            routeParams = this.extractRouteParams(fullEpPath, path)
            break
          }
        }
      }

      if (!endpoint) {
        return this.createErrorResponse(404, 'Not Found', url)
      }

      // Check authentication if required
      if (endpoint.requireAuth) {
        const authHeader = init?.headers
          ? (init.headers as Record<string, string>)['Authorization']
          : undefined

        if (!authHeader || authHeader !== `Bearer ${this.config.authToken}`) {
          return this.createErrorResponse(401, 'Unauthorized', url)
        }
      }

      // Add artificial delay
      const delay = endpoint.delay ?? this.config.defaultDelay
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      // Parse request body if present
      let requestBody: unknown
      if (init?.body) {
        try {
          requestBody = typeof init.body === 'string' ? JSON.parse(init.body) : init.body
        } catch {
          requestBody = init.body
        }
      }

      // Create successful response
      return this.createSuccessResponse(endpoint, url, routeParams, requestBody)
    }
  }

  /**
   * Create a successful response
   */
  private createSuccessResponse(endpoint: ApiEndpoint, url: string, params: Record<string, string> = {}, body?: unknown): Response {
    let responseData: unknown
    let responseStatus: number

    if (endpoint.handler) {
      const handlerResult = endpoint.handler({ params, body })
      responseData = handlerResult.body
      responseStatus = handlerResult.status
    } else {
      responseData = endpoint.response
      responseStatus = endpoint.status || 200
    }

    const headers = new Headers({
      'content-type': 'application/json',
      ...endpoint.headers,
    })

    return {
      ok: responseStatus >= 200 && responseStatus < 300,
      status: responseStatus,
      statusText: this.getStatusText(responseStatus),
      headers,
      url,
      json: async () => {
        await Promise.resolve()
        return responseData
      },
      text: async () => {
        await Promise.resolve()
        return JSON.stringify(responseData)
      },
      blob: async () => {
        await Promise.resolve()
        return new Blob([JSON.stringify(responseData)])
      },
    } as Response
  }

  /**
   * Create an error response
   */
  private createErrorResponse(status: number, statusText: string, url: string): Response {
    const headers = new Headers({ 'content-type': 'application/json' })
    const errorBody = { error: statusText, status }

    return {
      ok: false,
      status,
      statusText,
      headers,
      url,
      json: async () => {
        await Promise.resolve()
        return errorBody
      },
      text: async () => {
        await Promise.resolve()
        return JSON.stringify(errorBody)
      },
      blob: async () => {
        await Promise.resolve()
        return new Blob([JSON.stringify(errorBody)])
      },
    } as Response
  }

  /**
   * Check if a dynamic route matches a path
   */
  private matchesRoute(routePath: string, actualPath: string): boolean {
    // Simple pattern matching for routes like /users/1 matching /users/:id
    const routeParts = routePath.split('/')
    const pathParts = actualPath.split('/')

    if (routeParts.length !== pathParts.length) {
      return false
    }

    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i]
      const pathPart = pathParts[i]

      // Skip empty parts
      if (!routePart && !pathPart) continue

      // If route part starts with :, it's a parameter, so it matches any value
      if (routePart && routePart.startsWith(':')) {
        continue
      }

      // Exact match required for non-parameter parts
      if (routePart !== pathPart) {
        return false
      }
    }

    return true
  }

  /**
   * Extract parameters from a dynamic route
   */
  private extractRouteParams(routePath: string, actualPath: string): Record<string, string> {
    const routeParts = routePath.split('/')
    const pathParts = actualPath.split('/')
    const params: Record<string, string> = {}

    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i]
      const pathPart = pathParts[i]

      // If route part starts with :, it's a parameter
      if (routePart && routePart.startsWith(':')) {
        const paramName = routePart.slice(1) // Remove the :
        if (pathPart) {
          params[paramName] = pathPart
        }
      }
    }

    return params
  }

  /**
   * Get standard HTTP status text
   */
  private getStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    }
    return statusTexts[status] || 'Unknown'
  }
}

/**
 * Predefined API endpoints for common testing scenarios
 */
export class TestApiEndpoints {
  /**
   * User management endpoints
   */
  static users = {
    list: {
      method: 'GET' as const,
      path: '/users',
      response: {
        users: [
          {
            id: 1,
            name: 'John Doe',
            email: 'john@example.com',
            active: true,
            department: 'Engineering',
            salary: 85000,
            joinDate: '2022-01-15T00:00:00Z',
            skills: ['JavaScript', 'TypeScript'],
            performance: 8.5,
            region: 'North',
          },
          {
            id: 2,
            name: 'Jane Smith',
            email: 'jane@example.com',
            active: true,
            department: 'Sales',
            salary: 75000,
            joinDate: '2021-06-10T00:00:00Z',
            skills: ['Sales', 'CRM'],
            performance: 7.8,
            region: 'South',
          },
          {
            id: 3,
            name: 'Bob Johnson',
            email: 'bob@example.com',
            active: false,
            department: 'Marketing',
            salary: 65000,
            joinDate: '2020-03-20T00:00:00Z',
            skills: ['Marketing', 'SEO'],
            performance: 6.2,
            region: 'East',
          },
        ],
        total: 3,
        page: 1,
        limit: 10,
      },
    },

    getById: {
      method: 'GET' as const,
      path: '/users/:id',
      response: {
        id: 1, // Return user with ID 1 to match the test expectation
        name: 'John Doe',
        email: 'john@example.com',
        active: true,
        department: 'Engineering',
        salary: 85000,
        joinDate: '2022-01-15T00:00:00Z',
        skills: ['JavaScript', 'TypeScript'],
        performance: 8.5,
        region: 'North',
      },
    },

    create: {
      method: 'POST' as const,
      path: '/users',
      response: {
        id: 4,
        name: 'Integration Test User',
        email: 'integration@test.com',
        active: true,
        department: 'Engineering',
        salary: 80000,
        joinDate: new Date().toISOString(),
        skills: ['JavaScript', 'TypeScript'],
        performance: 7.5,
        region: 'North',
      },
      status: 201,
    },

    update: {
      method: 'PUT' as const,
      path: '/users/:id',
      response: {
        id: 4,
        name: 'Integration Test User (Updated)',
        email: 'integration@updated.com',
        active: true,
        department: 'Engineering',
        salary: 85000,
        joinDate: new Date().toISOString(),
        skills: ['JavaScript', 'TypeScript'],
        performance: 7.5,
        region: 'North',
      },
    },

    delete: {
      method: 'DELETE' as const,
      path: '/users/:id',
      response: { success: true },
      status: 204,
    },
  }

  /**
   * Product management endpoints
   */
  static products = {
    list: {
      method: 'GET' as const,
      path: '/products',
      response: {
        products: [
          {
            id: 'p1',
            name: 'Laptop',
            price: 1299.99,
            category: 'Electronics',
            brand: 'TechCorp',
            inStock: true,
            rating: 4.5,
            reviews: 120,
            tags: ['popular', 'electronics'],
          },
          {
            id: 'p2',
            name: 'Mouse',
            price: 29.99,
            category: 'Electronics',
            brand: 'TechCorp',
            inStock: true,
            rating: 4.2,
            reviews: 85,
            tags: ['accessories'],
          },
          {
            id: 'p3',
            name: 'Desk',
            price: 199.99,
            category: 'Furniture',
            brand: 'HomeStyle',
            inStock: false,
            rating: 3.8,
            reviews: 32,
            tags: ['furniture'],
          },
        ],
        total: 3,
      },
    },

    getById: {
      method: 'GET' as const,
      path: '/products/p1',
      response: {
        id: 'p1',
        name: 'Laptop',
        price: 1299.99,
        category: 'Electronics',
        inStock: true,
        description: 'High-performance laptop',
        specifications: {
          cpu: 'Intel Core i7',
          ram: '16GB',
          storage: '512GB SSD',
        },
      },
    },
  }

  /**
   * Order management endpoints
   */
  static orders = {
    list: {
      method: 'GET' as const,
      path: '/orders',
      response: {
        orders: [
          {
            id: 'o1',
            userId: 1,
            products: ['p1'],
            total: 1299.99,
            status: 'delivered',
            createdAt: '2024-01-15T10:00:00Z',
            region: 'North',
          },
          {
            id: 'o2',
            userId: 2,
            products: ['p2'],
            total: 59.98,
            status: 'pending',
            createdAt: '2024-01-16T14:30:00Z',
            region: 'South',
          },
        ],
        total: 2,
      },
    },

    create: {
      method: 'POST' as const,
      path: '/orders',
      response: {
        id: 'o3',
        userId: 1,
        products: [{ productId: 'p1', quantity: 1, price: 1299.99 }],
        total: 1299.99,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
      status: 201,
    },
  }

  /**
   * Analytics endpoints
   */
  static analytics = {
    userStats: {
      method: 'GET' as const,
      path: '/analytics/users',
      response: {
        totalUsers: 150,
        activeUsers: 134,
        departmentBreakdown: {
          Engineering: 45,
          Sales: 32,
          Marketing: 28,
          Support: 29,
        },
        averageSalary: 78500,
        retentionRate: 0.89,
      },
    },

    salesStats: {
      method: 'GET' as const,
      path: '/analytics/sales',
      response: {
        totalRevenue: 245780.5,
        totalOrders: 189,
        averageOrderValue: 1300.43,
        topProducts: [
          { productId: 'p1', sales: 45, revenue: 58499.55 },
          { productId: 'p3', sales: 23, revenue: 4599.77 },
        ],
      },
    },
  }

  /**
   * Error simulation endpoints
   */
  static errors = {
    serverError: {
      method: 'GET' as const,
      path: '/error/server',
      response: { error: 'Internal server error' },
      status: 500,
    },

    notFound: {
      method: 'GET' as const,
      path: '/error/notfound',
      response: { error: 'Resource not found' },
      status: 404,
    },

    unauthorized: {
      method: 'GET' as const,
      path: '/error/auth',
      response: { error: 'Unauthorized' },
      status: 401,
      requireAuth: true,
    },

    timeout: {
      method: 'GET' as const,
      path: '/error/timeout',
      response: { message: 'This will timeout' },
      delay: 5000, // 5 second delay
    },
  }
}
