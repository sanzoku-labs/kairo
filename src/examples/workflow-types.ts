// Type definitions for workflow examples
export interface CreateUserRequest {
  name: string
  email: string
  password: string
  country?: string
  age?: number
}

export interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

export interface WelcomeEmailRequest {
  email: string
  name: string
}

export interface WelcomeEmailResponse {
  success: boolean
}

export interface ProfilePreferences {
  theme: string
  notifications: boolean
}

export interface CreateProfileRequest {
  userId: string
  preferences: ProfilePreferences
}

export interface Profile {
  id: string
  userId: string
  preferences: ProfilePreferences
}

export interface Order {
  id: string
  customerId: string
  items: OrderItem[]
  total: number
  paymentMethod: string
  shippingAddress: ShippingAddress
}

export interface OrderItem {
  productId: string
  quantity: number
  price: number
}

export interface ShippingAddress {
  street: string
  city: string
  country: string
}

export interface PaymentRequest {
  amount: number
  method: string
  customerId: string
}

export interface ShipmentRequest {
  orderId: string
  address: ShippingAddress
  items: OrderItem[]
}

export interface NotificationRequest {
  customerId: string
  orderId: string
  type: string
}

export interface MigrationInput {
  batchSize: number
  totalRecords: number
}

export interface MigrationState {
  batchSize: number
  totalRecords: number
  processedCount: number
  currentBatch: number
}

export interface BatchRequest {
  offset: number
  limit: number
}

export interface MigrationItem {
  id: string
  data: unknown
  migrated: boolean
  migratedAt: string
}

export interface InsertResult {
  insertedCount: number
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy'
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy'
  services: {
    database: boolean
    redis: boolean
    externalAPI: boolean
    fileSystem: boolean
  }
}
