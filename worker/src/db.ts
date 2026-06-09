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

export async function getAccountsByStatusAndDay(status: string, day: string): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('status', status)
    .eq('login_day', day)

  if (error) {
    console.error(`Failed to fetch accounts for ${day} with status ${status}:`, error)
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