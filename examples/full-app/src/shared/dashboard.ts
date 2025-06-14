import { signal, resource, schema, resourceUtils, pipeline } from 'kairo'
import { z } from 'zod'
import { authHelpers } from './auth'

// ===== SCHEMAS =====

export const ActivitySchema = schema(z.object({
  id: z.string(),
  type: z.enum(['login', 'logout', 'profile_update', 'settings_change']),
  description: z.string(),
  timestamp: z.string(),
  metadata: z.record(z.unknown()).optional()
}))

export const StatsSchema = schema(z.object({
  totalLogins: z.number(),
  lastLoginAt: z.string().optional(),
  accountAge: z.number(), // days
  settingsUpdated: z.number()
}))

export const SettingsSchema = schema(z.object({
  theme: z.enum(['light', 'dark', 'auto']),
  notifications: z.boolean(),
  language: z.enum(['en', 'fr', 'es']),
  timezone: z.string()
}))

export const UpdateSettingsSchema = schema(z.object({
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  notifications: z.boolean().optional(),
  language: z.enum(['en', 'fr', 'es']).optional(),
  timezone: z.string().optional()
}))

// ===== TYPES =====

export type Activity = z.infer<typeof ActivitySchema.zod>
export type Stats = z.infer<typeof StatsSchema.zod>
export type Settings = z.infer<typeof SettingsSchema.zod>
export type UpdateSettings = z.infer<typeof UpdateSettingsSchema.zod>

// ===== DASHBOARD STATE =====

export const dashboardState = signal<{
  stats: Stats | null
  activities: Activity[]
  settings: Settings | null
  isLoading: boolean
}>({
  stats: null,
  activities: [],
  settings: null,
  isLoading: false
})

// Derived signals
export const userStats = dashboardState.map(state => state.stats)
export const recentActivities = dashboardState.map(state => state.activities)
export const userSettings = dashboardState.map(state => state.settings)

// ===== MOCK DATA GENERATOR =====

const mockData = {
  generateStats(): Stats {
    const accountCreated = new Date('2024-01-01')
    const now = new Date()
    const accountAge = Math.floor((now.getTime() - accountCreated.getTime()) / (1000 * 60 * 60 * 24))
    
    return {
      totalLogins: Math.floor(Math.random() * 50) + 10,
      lastLoginAt: new Date().toISOString(),
      accountAge,
      settingsUpdated: Math.floor(Math.random() * 5) + 1
    }
  },
  
  generateActivities(): Activity[] {
    const activities: Activity[] = []
    const types: Activity['type'][] = ['login', 'logout', 'profile_update', 'settings_change']
    
    for (let i = 0; i < 10; i++) {
      const date = new Date()
      date.setHours(date.getHours() - i * 2)
      
      activities.push({
        id: `activity-${i}`,
        type: types[Math.floor(Math.random() * types.length)],
        description: this.getActivityDescription(types[Math.floor(Math.random() * types.length)]),
        timestamp: date.toISOString(),
        metadata: {
          ip: '192.168.1.' + Math.floor(Math.random() * 255),
          userAgent: 'Chrome/91.0'
        }
      })
    }
    
    return activities
  },
  
  getActivityDescription(type: Activity['type']): string {
    const descriptions = {
      login: 'User signed in',
      logout: 'User signed out',
      profile_update: 'Profile information updated',
      settings_change: 'Account settings modified'
    }
    return descriptions[type]
  },
  
  generateSettings(): Settings {
    return {
      theme: 'light',
      notifications: true,
      language: 'en',
      timezone: 'UTC'
    }
  }
}

// ===== MOCK API =====

const mockDashboardApi = {
  async getStats(token: string): Promise<Stats> {
    await new Promise(resolve => setTimeout(resolve, 800))
    
    if (!token.startsWith('mock-jwt-token')) {
      throw new Error('Unauthorized')
    }
    
    return mockData.generateStats()
  },
  
  async getActivities(token: string): Promise<Activity[]> {
    await new Promise(resolve => setTimeout(resolve, 600))
    
    if (!token.startsWith('mock-jwt-token')) {
      throw new Error('Unauthorized')
    }
    
    return mockData.generateActivities()
  },
  
  async getSettings(token: string): Promise<Settings> {
    await new Promise(resolve => setTimeout(resolve, 400))
    
    if (!token.startsWith('mock-jwt-token')) {
      throw new Error('Unauthorized')
    }
    
    // Get from localStorage or return defaults
    const stored = localStorage.getItem('user_settings')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        // Fall through to defaults
      }
    }
    
    return mockData.generateSettings()
  },
  
  async updateSettings(token: string, updates: UpdateSettings): Promise<Settings> {
    await new Promise(resolve => setTimeout(resolve, 500))
    
    if (!token.startsWith('mock-jwt-token')) {
      throw new Error('Unauthorized')
    }
    
    // Get current settings
    const current = await this.getSettings(token)
    const updated = { ...current, ...updates }
    
    // Save to localStorage
    localStorage.setItem('user_settings', JSON.stringify(updated))
    
    return updated
  }
}

// ===== PIPELINES =====

export const getDashboardStatsPipeline = pipeline('get-dashboard-stats')
  .map(() => {
    const { token } = authHelpers.requireAuth()
    return token
  })
  .map(async (token) => {
    const stats = await mockDashboardApi.getStats(token)
    
    // Update dashboard state
    dashboardState.update(state => ({
      ...state,
      stats
    }))
    
    return stats
  })
  .validate(StatsSchema)
  .cache(60000) // Cache for 1 minute
  .trace('dashboard-stats-loaded')

export const getDashboardActivitiesPipeline = pipeline('get-dashboard-activities')
  .map(() => {
    const { token } = authHelpers.requireAuth()
    return token
  })
  .map(async (token) => {
    const activities = await mockDashboardApi.getActivities(token)
    
    // Update dashboard state
    dashboardState.update(state => ({
      ...state,
      activities
    }))
    
    return activities
  })
  .validate(schema(z.array(ActivitySchema.zod)))
  .cache(30000) // Cache for 30 seconds
  .trace('dashboard-activities-loaded')

export const getUserSettingsPipeline = pipeline('get-user-settings')
  .map(() => {
    const { token } = authHelpers.requireAuth()
    return token
  })
  .map(async (token) => {
    const settings = await mockDashboardApi.getSettings(token)
    
    // Update dashboard state
    dashboardState.update(state => ({
      ...state,
      settings
    }))
    
    return settings
  })
  .validate(SettingsSchema)
  .cache(120000) // Cache for 2 minutes
  .trace('user-settings-loaded')

export const updateUserSettingsPipeline = pipeline('update-user-settings')
  .input(UpdateSettingsSchema)
  .map(async (updates) => {
    const { token } = authHelpers.requireAuth()
    const settings = await mockDashboardApi.updateSettings(token, updates)
    
    // Update dashboard state
    dashboardState.update(state => ({
      ...state,
      settings
    }))
    
    return settings
  })
  .validate(SettingsSchema)
  .trace('user-settings-updated')

// ===== RESOURCE DEFINITIONS =====

export const DashboardResource = resource('dashboard', {
  getStats: {
    method: 'GET',
    path: '/api/dashboard/stats',
    response: StatsSchema,
    cache: { ttl: 60000 }
  },
  
  getActivities: {
    method: 'GET', 
    path: '/api/dashboard/activities',
    response: schema(z.array(ActivitySchema.zod)),
    cache: { ttl: 30000 }
  },
  
  getSettings: {
    method: 'GET',
    path: '/api/user/settings',
    response: SettingsSchema,
    cache: { ttl: 120000 }
  },
  
  updateSettings: {
    method: 'PUT',
    path: '/api/user/settings',
    body: UpdateSettingsSchema,
    response: SettingsSchema
  }
})

// ===== DASHBOARD HELPERS =====

export const dashboardHelpers = {
  async loadDashboard() {
    dashboardState.update(state => ({ ...state, isLoading: true }))
    
    try {
      // Load all dashboard data in parallel
      await Promise.all([
        getDashboardStatsPipeline.run({}),
        getDashboardActivitiesPipeline.run({}),
        getUserSettingsPipeline.run({})
      ])
    } finally {
      dashboardState.update(state => ({ ...state, isLoading: false }))
    }
  },
  
  async refreshStats() {
    return await getDashboardStatsPipeline.run({})
  },
  
  async refreshActivities() {
    return await getDashboardActivitiesPipeline.run({})
  },
  
  async updateSettings(updates: UpdateSettings) {
    return await updateUserSettingsPipeline.run(updates)
  },
  
  formatActivityTime(timestamp: string): string {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60))
      return `${diffMins}m ago`
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else {
      const diffDays = Math.floor(diffHours / 24)
      return `${diffDays}d ago`
    }
  }
}