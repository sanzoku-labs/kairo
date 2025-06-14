import React from 'react'
import type { Activity } from '../shared/dashboard'
import { dashboardHelpers } from '../shared/dashboard'

interface ActivityFeedProps {
  title: string
  activities: Activity[]
  onRefresh: () => void
}

export function ActivityFeed({ title, activities, onRefresh }: ActivityFeedProps) {
  const getActivityIcon = (type: Activity['type']) => {
    const icons = {
      login: '🔐',
      logout: '🚪',
      profile_update: '👤',
      settings_change: '⚙️'
    }
    return icons[type] || '📝'
  }
  
  const getActivityColor = (type: Activity['type']) => {
    const colors = {
      login: '#28a745',
      logout: '#6c757d',
      profile_update: '#0066cc',
      settings_change: '#ffc107'
    }
    return colors[type] || '#666'
  }
  
  return (
    <div className="card">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3>{title}</h3>
        <button
          onClick={onRefresh}
          style={{
            background: 'transparent',
            border: '1px solid #ddd',
            padding: '4px 8px',
            fontSize: '12px',
            borderRadius: '4px',
            color: '#666'
          }}
        >
          Refresh
        </button>
      </div>
      
      {activities.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#666' }}>
          Loading activities...
        </div>
      ) : (
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {activities.map((activity) => (
            <div
              key={activity.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '1px solid #f0f0f0'
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: getActivityColor(activity.type),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '12px',
                  fontSize: '14px'
                }}
              >
                {getActivityIcon(activity.type)}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '500', fontSize: '14px' }}>
                  {activity.description}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {dashboardHelpers.formatActivityTime(activity.timestamp)}
                  {activity.metadata?.ip && (
                    <span> • {activity.metadata.ip}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div style={{ 
        marginTop: '16px', 
        padding: '12px', 
        background: '#f8f9fa', 
        borderRadius: '4px',
        fontSize: '12px',
        color: '#666'
      }}>
        🔄 <strong>Real-time:</strong> Activity feed is cached for 30 seconds. 
        Recent actions appear here automatically.
      </div>
    </div>
  )
}