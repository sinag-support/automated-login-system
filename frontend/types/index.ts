export interface Account {
  id: string
  mobileNumber: string
  storeName: string
  loginDay: string
  status: string
  lastLogin: string | null
  customPassword?: string | null
  defaultPassword?: string
  createdAt?: string
  updatedAt?: string
}

export interface Admin {
  id: string
  email: string
  createdAt: string
}

export interface LoginLog {
  id: string
  accountId: string
  status: string
  error?: string | null
  createdAt: string
}

export interface Stats {
  total: number
  success: number
  failed: number
  needsPassword: number
  pending: number
  uniqueStores: number
  todayLogins: number
}