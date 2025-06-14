import React from 'react'
import { form } from 'kairo'
import { useForm } from '../hooks/useForm'
import { SettingsSchema, UpdateSettingsSchema, type Settings, type UpdateSettings } from '../shared/dashboard'

interface SettingsPanelProps {
  settings: Settings | null
  onUpdateSettings: (updates: UpdateSettings) => Promise<any>
}

// Create a form for settings updates
const settingsForm = form({
  schema: UpdateSettingsSchema,
  validation: 'onChange'
})

export function SettingsPanel({ settings, onUpdateSettings }: SettingsPanelProps) {
  const {
    fields,
    errors,
    isValid,
    isSubmitting,
    submitError,
    setField,
    handleSubmit
  } = useForm(settingsForm)
  
  // Update form when settings load
  React.useEffect(() => {
    if (settings) {
      setField('theme', settings.theme)
      setField('notifications', settings.notifications)
      setField('language', settings.language)
      setField('timezone', settings.timezone)
    }
  }, [settings, setField])
  
  // Handle form submission
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Only send changed fields
    const updates: UpdateSettings = {}
    if (fields.theme !== settings?.theme) updates.theme = fields.theme
    if (fields.notifications !== settings?.notifications) updates.notifications = fields.notifications
    if (fields.language !== settings?.language) updates.language = fields.language
    if (fields.timezone !== settings?.timezone) updates.timezone = fields.timezone
    
    if (Object.keys(updates).length > 0) {
      try {
        await onUpdateSettings(updates)
        // Show success message (in real app, you might use a toast)
        alert('Settings updated successfully!')
      } catch (error) {
        console.error('Failed to update settings:', error)
      }
    }
  }
  
  if (!settings) {
    return (
      <div className="card">
        <h3>Account Settings</h3>
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#666' }}>
          Loading settings...
        </div>
      </div>
    )
  }
  
  const hasChanges = 
    fields.theme !== settings.theme ||
    fields.notifications !== settings.notifications ||
    fields.language !== settings.language ||
    fields.timezone !== settings.timezone
  
  return (
    <div className="card">
      <h3 style={{ marginBottom: '20px' }}>Account Settings</h3>
      
      <form onSubmit={onSubmit} className={isSubmitting ? 'loading' : ''}>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {/* Theme Setting */}
          <div className="form-group">
            <label htmlFor="theme">Theme</label>
            <select
              id="theme"
              value={fields.theme || settings.theme}
              onChange={(e) => setField('theme', e.target.value as any)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
            {errors.theme && (
              <div className="error">{errors.theme[0]}</div>
            )}
          </div>
          
          {/* Language Setting */}
          <div className="form-group">
            <label htmlFor="language">Language</label>
            <select
              id="language"
              value={fields.language || settings.language}
              onChange={(e) => setField('language', e.target.value as any)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
            </select>
            {errors.language && (
              <div className="error">{errors.language[0]}</div>
            )}
          </div>
          
          {/* Notifications Setting */}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={fields.notifications ?? settings.notifications}
                onChange={(e) => setField('notifications', e.target.checked)}
                disabled={isSubmitting}
              />
              Enable Notifications
            </label>
            {errors.notifications && (
              <div className="error">{errors.notifications[0]}</div>
            )}
          </div>
          
          {/* Timezone Setting */}
          <div className="form-group">
            <label htmlFor="timezone">Timezone</label>
            <select
              id="timezone"
              value={fields.timezone || settings.timezone}
              onChange={(e) => setField('timezone', e.target.value)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
            {errors.timezone && (
              <div className="error">{errors.timezone[0]}</div>
            )}
          </div>
        </div>
        
        {submitError && (
          <div className="error" style={{ marginTop: '16px' }}>
            Failed to update settings: {submitError.message}
          </div>
        )}
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid #eee'
        }}>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {hasChanges ? (
              <span style={{ color: '#ffc107' }}>⚠️ You have unsaved changes</span>
            ) : (
              <span style={{ color: '#28a745' }}>✅ All changes saved</span>
            )}
          </div>
          
          <button
            type="submit"
            disabled={!hasChanges || !isValid || isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
      
      <div style={{ 
        marginTop: '16px', 
        padding: '12px', 
        background: '#f8f9fa', 
        borderRadius: '4px',
        fontSize: '12px',
        color: '#666'
      }}>
        💾 <strong>Auto-save:</strong> Settings are cached for 2 minutes. 
        Changes are saved immediately and persist across sessions.
      </div>
    </div>
  )
}