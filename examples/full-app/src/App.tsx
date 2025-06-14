import React, { useEffect, useState } from 'react'
import { useSignal } from './hooks/useSignal'
import { isAuthenticated, authHelpers } from './shared/auth'
import { LoginPage } from './auth/LoginPage'
import { DashboardPage } from './dashboard/DashboardPage'

export function App() {
  const isAuth = useSignal(isAuthenticated)
  const [isInitializing, setIsInitializing] = useState(true)
  
  useEffect(() => {
    // Initialize auth state from localStorage on app start
    const initializeAuth = async () => {
      try {
        await authHelpers.initialize()
      } catch (error) {
        console.error('Failed to initialize auth:', error)
      } finally {
        setIsInitializing(false)
      }
    }
    
    initializeAuth()
  }, [])
  
  // Show loading screen while initializing
  if (isInitializing) {
    return (
      <div className="container">
        <div style={{ 
          textAlign: 'center', 
          marginTop: '100px',
          padding: '40px',
          color: '#666'
        }}>
          <div style={{ 
            fontSize: '24px', 
            marginBottom: '16px',
            color: '#0066cc'
          }}>
            ⚡ Kairo
          </div>
          <div>Loading application...</div>
        </div>
      </div>
    )
  }
  
  // Show appropriate page based on auth state
  return isAuth ? <DashboardPage /> : <LoginPage />
}