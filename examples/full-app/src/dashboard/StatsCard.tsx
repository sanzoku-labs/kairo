import React from 'react'
import type { Stats } from '../shared/dashboard'

interface StatsCardProps {
  title: string
  stats: Stats | null
  onRefresh: () => void
}

export function StatsCard({ title, stats, onRefresh }: StatsCardProps) {
  if (!stats) {
    return (
      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>{title}</h3>
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#666' }}>
          Loading statistics...
        </div>
      </div>
    )
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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
      
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="metric">
          <div className="metric-value">{stats.totalLogins}</div>
          <div className="metric-label">Total Logins</div>
        </div>
        
        <div className="metric">
          <div className="metric-value">{stats.accountAge}</div>
          <div className="metric-label">Account Age (days)</div>
        </div>
        
        <div className="metric">
          <div className="metric-value">{stats.settingsUpdated}</div>
          <div className="metric-label">Settings Updated</div>
        </div>
        
        <div className="metric">
          <div className="metric-value">
            {stats.lastLoginAt ? formatDate(stats.lastLoginAt) : 'Never'}
          </div>
          <div className="metric-label">Last Login</div>
        </div>
      </div>
      
      <div style={{ 
        marginTop: '16px', 
        padding: '12px', 
        background: '#f8f9fa', 
        borderRadius: '4px',
        fontSize: '12px',
        color: '#666'
      }}>
        💡 <strong>Tip:</strong> These stats are cached for 1 minute. 
        Click refresh to get the latest data.
      </div>
    </div>
  )
}