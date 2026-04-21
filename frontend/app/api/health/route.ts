import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    checks: {}
  }
  
  let healthy = true
  
  // Check 1: Environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  results.checks.env = {
    url: !!supabaseUrl,
    key: !!supabaseKey
  }
  
  if (!supabaseUrl || !supabaseKey) {
    healthy = false
    results.checks.env.error = 'Missing environment variables'
  }
  
  // Check 2: Database connection
  if (supabaseUrl && supabaseKey) {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(supabaseUrl, supabaseKey)
      
      const start = Date.now()
      const { data, error } = await supabase
        .from('accounts')
        .select('id', { count: 'exact', head: true })
      const latency = Date.now() - start
      
      results.checks.database = {
        connected: !error,
        latency: `${latency}ms`,
        error: error?.message || null
      }
      
      if (error) healthy = false
    } catch (err: any) {
      results.checks.database = {
        connected: false,
        error: err.message
      }
      healthy = false
    }
  }
  
  // Check 3: Worker API (optional)
  const workerUrl = process.env.WORKER_API_URL
  if (workerUrl) {
    try {
      const start = Date.now()
      const res = await fetch(`${workerUrl}/health`, {
        signal: AbortSignal.timeout(5000)
      })
      const latency = Date.now() - start
      
      results.checks.worker = {
        connected: res.ok,
        status: res.status,
        latency: `${latency}ms`
      }
    } catch (err: any) {
      results.checks.worker = {
        connected: false,
        error: err.message
      }
    }
  }
  
  return NextResponse.json(
    {
      status: healthy ? 'healthy' : 'unhealthy',
      ...results
    },
    { status: healthy ? 200 : 500 }
  )
}