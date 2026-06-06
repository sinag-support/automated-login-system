import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface Account {
  id: string
  mobile_number: string
  store_name: string
  defaultPassword: string
  customPassword: string | null
  login_day: string
  status: string
  last_login: string | null
}

export async function getSettings(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
  
  if (error) {
    console.error('Failed to fetch settings:', error)
    return {}
  }
  
  const settings: Record<string, string> = {}
  data.forEach((item: any) => {
    settings[item.key] = item.value
  })
  
  return settings
}

export async function getAccountsForToday(): Promise<Account[]> {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const today = days[new Date().getDay()]

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('login_day', today)

  if (error) {
    console.error('Failed to fetch accounts:', error)
    return []
  }

  return data || []
}

export async function getAccountsForDay(day: string): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('login_day', day)

  if (error) {
    console.error('Failed to fetch accounts:', error)
    return []
  }

  return data || []
}

export async function updateAccountStatus(
  id: string,
  status: string,
  lastLogin: Date = new Date()
) {
  const { error } = await supabase
    .from('accounts')
    .update({
      status,
      last_login: lastLogin.toISOString()
    })
    .eq('id', id)

  if (error) {
    console.error(`Failed to update account ${id}:`, error)
  }
}

export async function createLoginLog(accountId: string, status: string, errorMessage?: string) {
  const { error } = await supabase
    .from('login_logs')
    .insert({
      account_id: accountId,
      status,
      error: errorMessage,
      created_at: new Date().toISOString()
    })

  if (error) {
    console.error('Failed to create login log:', error)
  }
}

// Get weekly report for an account
export async function getAccountWeeklyStatus(accountId: string): Promise<{
  loggedThisWeek: boolean
  lastLogin: string | null
  loginCountThisWeek: number
}> {
  const startOfWeek = new Date()
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1)
  startOfWeek.setHours(0, 0, 0, 0)
  
  const { data, error, count } = await supabase
    .from('login_logs')
    .select('*', { count: 'exact' })
    .eq('account_id', accountId)
    .eq('status', 'success')
    .gte('created_at', startOfWeek.toISOString())
  
  if (error) {
    console.error('Failed to get weekly status:', error)
    return { loggedThisWeek: false, lastLogin: null, loginCountThisWeek: 0 }
  }
  
  const account = await supabase
    .from('accounts')
    .select('last_login')
    .eq('id', accountId)
    .single()
  
  return {
    loggedThisWeek: (count || 0) > 0,
    lastLogin: account.data?.last_login || null,
    loginCountThisWeek: count || 0
  }
}

// Generate weekly report for all accounts - FIXED
export async function generateWeeklyReport(): Promise<{
  total: number
  successful: number
  failed: number
  pending: number
  byDay: Record<string, { total: number; success: number; failed: number }>
}> {
  const startOfWeek = new Date()
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1)
  startOfWeek.setHours(0, 0, 0, 0)
  
  // Get all accounts
  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
  
  // Get this week's logs
  const { data: logs } = await supabase
    .from('login_logs')
    .select('*')
    .gte('created_at', startOfWeek.toISOString())
  
  // Initialize byDay with all days
  const byDay: Record<string, { total: number; success: number; failed: number }> = {}
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  
  daysOfWeek.forEach(day => {
    byDay[day] = { total: 0, success: 0, failed: 0 }
  })
  
  let successful = 0
  let failed = 0
  let pending = 0
  
  accounts?.forEach(account => {
    const day = account.login_day
    
    // Only count valid days
    if (byDay[day]) {
      byDay[day].total += 1
    }
    
    const accountLogs = logs?.filter(l => l.account_id === account.id) || []
    const hasSuccess = accountLogs.some(l => l.status === 'success')
    
    if (hasSuccess) {
      successful++
      if (byDay[day]) {
        byDay[day].success += 1
      }
    } else if (accountLogs.length > 0) {
      failed++
      if (byDay[day]) {
        byDay[day].failed += 1
      }
    } else {
      pending++
    }
  })
  
  return {
    total: accounts?.length || 0,
    successful,
    failed,
    pending,
    byDay
  }
}

// Helper: Check if account was successful this week
export function isSuccessfulThisWeek(lastLogin: string | null): boolean {
  if (!lastLogin) return false
  
  const lastLoginDate = new Date(lastLogin)
  const today = new Date()
  
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay() + 1)
  startOfWeek.setHours(0, 0, 0, 0)
  
  return lastLoginDate >= startOfWeek
}

// Save a weekly report snapshot
export async function saveWeeklyReport(report: {
  week_start: string;
  week_end: string;
  total: number;
  successful: number;
  failed: number;
  pending: number;
  needsPassword: number;
  byDay: Record<string, { total: number; success: number; failed: number }>;
}) {
  const { error } = await supabase
    .from('weekly_reports')
    .insert({
      week_start: report.week_start,
      week_end: report.week_end,
      total: report.total,
      successful: report.successful,
      failed: report.failed,
      pending: report.pending,
      needs_password: report.needsPassword,
      by_day: report.byDay,
      created_at: new Date().toISOString()
    });
  
  if (error) {
    console.error('Failed to save weekly report:', error);
    return false;
  }
  return true;
}

// Get list of saved reports
export async function getWeeklyReportHistory() {
  const { data, error } = await supabase
    .from('weekly_reports')
    .select('id, week_start, week_end, total, successful, failed, pending, needs_password, created_at')
    .order('week_start', { ascending: false })
    .limit(20);
  
  if (error) return [];
  return data;
}

// Get a specific report by ID
export async function getWeeklyReportById(id: string) {
  const { data, error } = await supabase
    .from('weekly_reports')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) return null;
  return data;
}

export async function generateWeeklyReportForRange(startDate: string, endDate: string) {
  // Fetch accounts as they existed at that time? We can't time travel, so we use current account list
  // but filter login_logs for that week. For a snapshot, we rely on the login_logs from that period.
  const { data: logs } = await supabase
    .from('login_logs')
    .select('*')
    .gte('created_at', startDate)
    .lte('created_at', endDate + 'T23:59:59');
  
  const { data: accounts } = await supabase.from('accounts').select('*');
  
  const byDay: Record<string, { total: number; success: number; failed: number }> = {};
  ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].forEach(day => {
    byDay[day] = { total: 0, success: 0, failed: 0 };
  });
  
  let successful = 0, failed = 0, pending = 0, needsPassword = 0;
  
  accounts?.forEach(account => {
    const day = account.login_day;
    if (byDay[day]) byDay[day].total++;
    
    const accountLogs = logs?.filter(l => l.account_id === account.id) || [];
    const hasSuccess = accountLogs.some(l => l.status === 'success');
    
    if (hasSuccess) {
      successful++;
      if (byDay[day]) byDay[day].success++;
    } else if (accountLogs.length > 0) {
      failed++;
      if (byDay[day]) byDay[day].failed++;
    } else {
      pending++;
    }
  });
  
  return {
    total: accounts?.length || 0,
    successful,
    failed,
    pending,
    needsPassword: accounts?.filter(a => a.status === 'needs_password_update').length || 0,
    byDay
  };
}

export async function getAccountsByStatus(status: string): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('status', status)

  if (error) {
    console.error(`Failed to fetch accounts with status ${status}:`, error)
    return []
  }
  return data || []
}