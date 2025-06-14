import React from 'react'
import { loginForm } from '../shared/auth'
import { useForm } from '../hooks/useForm'

export function LoginPage() {
  const {
    fields,
    errors,
    isValid,
    isSubmitting,
    submitError,
    setField,
    handleSubmit
  } = useForm(loginForm)
  
  return (
    <div className="container">
      <div style={{ 
        maxWidth: '400px', 
        margin: '100px auto',
        textAlign: 'center'
      }}>
        <div className="card">
          <h1 style={{ marginBottom: '24px', color: '#0066cc' }}>
            Welcome to Kairo
          </h1>
          
          <p style={{ marginBottom: '32px', color: '#666' }}>
            Sign in to access your dashboard
          </p>
          
          <form onSubmit={handleSubmit} className={isSubmitting ? 'loading' : ''}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={fields.email || ''}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="Enter your email"
                disabled={isSubmitting}
              />
              {errors.email && (
                <div className="error">{errors.email[0]}</div>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={fields.password || ''}
                onChange={(e) => setField('password', e.target.value)}
                placeholder="Enter your password"
                disabled={isSubmitting}
              />
              {errors.password && (
                <div className="error">{errors.password[0]}</div>
              )}
            </div>
            
            {submitError && (
              <div className="error" style={{ marginBottom: '16px' }}>
                {submitError.message}
              </div>
            )}
            
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              style={{ width: '100%' }}
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          
          <div style={{ marginTop: '24px', fontSize: '14px', color: '#666' }}>
            <p><strong>Demo accounts:</strong></p>
            <p>User: demo@kairo.dev / password</p>
            <p>Admin: admin@kairo.dev / admin123</p>
          </div>
        </div>
      </div>
    </div>
  )
}