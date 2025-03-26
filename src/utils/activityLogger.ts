import { createClient } from '@supabase/supabase-js'

// Types for activity log entries
export type ActivityLogType = {
  agent_id: string
  agent_name: string
  agent_department: string
  agent_role: string
  action_type: string
  action_description: string
  target_resource: string
  target_resource_id?: string | null
  status: string
  ip_address?: string
  browser?: string
  operating_system?: string
  additional_details?: any
  error_details?: any
}

// Helper function to get browser info
const getBrowserInfo = () => {
  if (typeof window === 'undefined') return { browser: 'unknown', os: 'unknown' }
  
  const userAgent = window.navigator.userAgent
  const browser = {
    browser: 'unknown' as string,
    os: 'unknown' as string
  }

  // Detect browser
  if (userAgent.indexOf('Chrome') > -1) browser.browser = 'Chrome'
  else if (userAgent.indexOf('Safari') > -1) browser.browser = 'Safari'
  else if (userAgent.indexOf('Firefox') > -1) browser.browser = 'Firefox'
  else if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident/') > -1) browser.browser = 'IE'
  else if (userAgent.indexOf('Edge') > -1) browser.browser = 'Edge'

  // Detect OS
  if (userAgent.indexOf('Windows') > -1) browser.os = 'Windows'
  else if (userAgent.indexOf('Mac') > -1) browser.os = 'MacOS'
  else if (userAgent.indexOf('Linux') > -1) browser.os = 'Linux'
  else if (userAgent.indexOf('Android') > -1) browser.os = 'Android'
  else if (userAgent.indexOf('iOS') > -1) browser.os = 'iOS'

  return browser
}

// Main activity logger class
export class ActivityLogger {
  private static supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  static async log({
    agent_id,
    agent_name,
    agent_department,
    agent_role,
    action_type,
    action_description,
    target_resource,
    target_resource_id = null,
    status = 'success',
    additional_details = {},
    error_details = null
  }: Omit<ActivityLogType, 'ip_address' | 'browser' | 'operating_system'>) {
    try {
      const browserInfo = getBrowserInfo()
      
      const logEntry = {
        agent_id,
        agent_name,
        agent_department,
        agent_role,
        action_type,
        action_description,
        target_resource,
        target_resource_id,
        status,
        browser: browserInfo.browser,
        operating_system: browserInfo.os,
        additional_details,
        error_details,
        // IP address will be captured by Supabase automatically through RLS policies
      }

      const { error } = await this.supabase
        .from('activity_logs')
        .insert([logEntry])

      if (error) {
        console.error('Failed to log activity:', error)
      }
    } catch (error) {
      console.error('Error in activity logger:', error)
    }
  }

  // Convenience method for auth-related logging
  static async logAuth({
    userId,
    userName,
    department,
    role,
    action,
    status = 'success',
    error = null
  }: {
    userId: string 
    userName: string
    department: string
    role: string
    action: 'login' | 'logout' | 'register'
    status?: string
    error?: any
  }) {
    return this.log({
      agent_id: userId ,
      agent_name: userName,
      agent_department: department,
      agent_role: role,
      action_type: `auth_${action}`,
      action_description: `User ${action}`,
      target_resource: 'auth',
      status,
      error_details: error,
      additional_details: { timestamp: new Date().toISOString() }
    })
  }
} 