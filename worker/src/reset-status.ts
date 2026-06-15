import { createClient } from '@supabase/supabase-js'

async function resetAllToPending() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('Resetting all accounts to pending...')

  // Update all rows by using a condition that never matches real UUIDs
  // '00000000-0000-0000-0000-000000000000' is a valid UUID format but won't exist
  const { error: updateError } = await supabase
    .from('accounts')
    .update({ status: 'pending' })
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (updateError) {
    console.error('Update failed:', updateError.message)
    process.exit(1)
  }

  console.log('✅ All accounts have been reset to pending.')
}

resetAllToPending().catch(err => {
  console.error('Unhandled error:', err)
  process.exit(1)
})