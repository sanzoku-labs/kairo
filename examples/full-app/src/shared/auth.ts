import { signal, createSignal, pipeline, schema, resource, form } from 'kairo'
import { z } from 'zod'

// ===== SCHEMAS =====

export const LoginSchema = schema(z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters')
}))

export const UserSchema = schema(z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatar: z.string().optional(),
  role: z.enum(['user', 'admin']),
  createdAt: z.string(),
  lastLoginAt: z.string().optional()
}))

export const AuthResponseSchema = schema(z.object({
  user: UserSchema.zod,
  token: z.string(),
  expiresIn: z.number()
}))

// ===== TYPES =====

export type User = z.infer<typeof UserSchema.zod>
export type LoginCredentials = z.infer<typeof LoginSchema.zod>
export type AuthResponse = z.infer<typeof AuthResponseSchema.zod>

// ===== AUTH STATE =====

export const authState = signal<{
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false
})

// Derived signals
export const currentUser = authState.map(state => state.user)
export const isAuthenticated = authState.map(state => state.isAuthenticated)
export const authToken = authState.map(state => state.token)

// ===== MOCK API =====

// In a real app, this would be your actual API
const mockApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Mock validation
    if (credentials.email === 'demo@kairo.dev' && credentials.password === 'password') {
      return {
        user: {
          id: '1',
          email: 'demo@kairo.dev',
          name: 'Demo User',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
          role: 'user' as const,
          createdAt: '2024-01-01T00:00:00Z',
          lastLoginAt: new Date().toISOString()
        },
        token: 'mock-jwt-token-' + Date.now(),
        expiresIn: 3600
      }
    }
    
    if (credentials.email === 'admin@kairo.dev' && credentials.password === 'admin123') {
      return {
        user: {
          id: '2',
          email: 'admin@kairo.dev',
          name: 'Admin User',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
          role: 'admin' as const,
          createdAt: '2024-01-01T00:00:00Z',
          lastLoginAt: new Date().toISOString()
        },
        token: 'mock-jwt-token-admin-' + Date.now(),
        expiresIn: 3600
      }
    }
    
    throw new Error('Invalid email or password')
  },
  
  async getProfile(token: string): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Mock token validation
    if (!token.startsWith('mock-jwt-token')) {
      throw new Error('Invalid token')
    }
    
    const isAdmin = token.includes('admin')
    return {
      id: isAdmin ? '2' : '1',
      email: isAdmin ? 'admin@kairo.dev' : 'demo@kairo.dev',
      name: isAdmin ? 'Admin User' : 'Demo User',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${isAdmin ? 'admin' : 'demo'}`,
      role: isAdmin ? 'admin' : 'user',
      createdAt: '2024-01-01T00:00:00Z',
      lastLoginAt: new Date().toISOString()
    }
  }
}

// ===== PIPELINES =====

export const loginPipeline = pipeline('auth-login')
  .input(LoginSchema)
  .map(async (credentials) => {
    // Set loading state
    authState.update(state => ({ ...state, isLoading: true }))
    
    try {
      const response = await mockApi.login(credentials)
      
      // Store token in localStorage (in real app, use secure storage)
      localStorage.setItem('auth_token', response.token)
      localStorage.setItem('auth_user', JSON.stringify(response.user))
      
      // Update auth state
      authState.set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false
      })
      
      return response
    } catch (error) {
      authState.update(state => ({ ...state, isLoading: false }))
      throw error
    }
  })
  .validate(AuthResponseSchema)
  .trace('login-completed')

export const logoutPipeline = pipeline('auth-logout')
  .map(() => {
    // Clear storage
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    
    // Reset auth state
    authState.set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false
    })
    
    return { success: true }
  })
  .trace('logout-completed')

export const initAuthPipeline = pipeline('auth-init')
  .map(async () => {
    const token = localStorage.getItem('auth_token')
    const userJson = localStorage.getItem('auth_user')
    
    if (!token || !userJson) {
      return null
    }
    
    try {
      // Validate stored user data
      const user = JSON.parse(userJson)
      const validatedUser = UserSchema.parse(user)
      
      if (validatedUser.tag === 'Ok') {
        // Optionally refresh profile from API
        const freshProfile = await mockApi.getProfile(token)
        
        authState.set({
          user: freshProfile,
          token,
          isAuthenticated: true,
          isLoading: false
        })
        
        return { user: freshProfile, token }
      }
    } catch (error) {
      // Invalid stored data, clear it
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
    }
    
    return null
  })
  .trace('auth-init-completed')

// ===== FORMS =====

export const loginForm = form({
  schema: LoginSchema,
  onSubmit: loginPipeline,
  validation: 'onBlur',
  initialValues: {
    email: '',
    password: ''
  }
})

// ===== AUTH HELPERS =====

export const authHelpers = {
  async initialize() {
    authState.update(state => ({ ...state, isLoading: true }))
    await initAuthPipeline.run({})
  },
  
  async login(credentials: LoginCredentials) {
    return await loginForm.submit.run()
  },
  
  async logout() {
    return await logoutPipeline.run({})
  },
  
  requireAuth() {
    const state = authState.get()
    if (!state.isAuthenticated) {
      throw new Error('Authentication required')
    }
    return state
  },
  
  getAuthHeaders() {
    const token = authToken.get()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
}