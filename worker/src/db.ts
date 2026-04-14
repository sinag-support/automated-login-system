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

export async function createLoginLog(accountId: string, status: string, error?: string) {
  const { error } = await supabase
    .from('login_logs')
    .insert({
      account_id: accountId,
      status,
      error,
      created_at: new Date().toISOString()
    })

  if (error) {
    console.error('Failed to create login log:', error)
  }
}

export async function getAccountsNeedingPasswordUpdate(): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('status', 'needs_password_update')

  if (error) {
    console.error('Failed to fetch accounts:', error)
    return []
  }

  return data || []
}