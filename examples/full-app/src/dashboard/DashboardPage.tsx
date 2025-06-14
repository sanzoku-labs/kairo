import React, { useEffect } from 'react'
import { useSignal } from '../hooks/useSignal'
import { 
  userStats, 
  recentActivities, 
  userSettings,
  dashboardHelpers 
} from '../shared/dashboard'
import { currentUser, authHelpers } from '../shared/auth'
import { StatsCard } from './StatsCard'
import { ActivityFeed } from './ActivityFeed'
import { SettingsPanel } from './SettingsPanel'

export function DashboardPage() {
  const user = useSignal(currentUser)
  const stats = useSignal(userStats)
  const activities = useSignal(recentActivities)
  const settings = useSignal(userSettings)
  
  useEffect(() => {
    // Load dashboard data when component mounts
    dashboardHelpers.loadDashboard()
  }, [])
  
  const handleLogout = () => {
    authHelpers.logout()
  }
  
  const handleRefreshStats = () => {
    dashboardHelpers.refreshStats()
  }
  
  if (!user) {
    return <div>Loading...</div>
  }
  
  return (
    <div>
      {/* Header */}
      <div className="header">
        <div className="logo">Kairo Dashboard</div>
        <div className="user-info">
          <img
            src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
            alt={user.name}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%'
            }}
          />
          <span>{user.name}</span>
          {user.role === 'admin' && (
            <span
              style={{
                background: '#28a745',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px'
              }}
            >
              Admin
            </span>
          )}
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
      
      <div className="container">
        {/* Welcome Section */}
        <div className="card">
          <h1>Welcome back, {user.name}! 👋</h1>
          <p style={{ color: '#666', marginTop: '8px' }}>
            Here's what's happening with your account today.
          </p>
        </div>
        
        {/* Stats Grid */}
        <div className="grid">
          <StatsCard
            title="Account Statistics"
            stats={stats}
            onRefresh={handleRefreshStats}
          />
          
          <ActivityFeed
            title="Recent Activity"
            activities={activities || []}
            onRefresh={() => dashboardHelpers.refreshActivities()}
          />
        </div>
        
        {/* Settings Panel */}
        <SettingsPanel
          settings={settings}
          onUpdateSettings={dashboardHelpers.updateSettings}
        />
      </div>
    </div>
  )
}