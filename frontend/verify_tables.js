
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

console.log('URL:', supabaseUrl)
console.log('Key:', supabaseAnonKey ? supabaseAnonKey.substring(0, 10) + '...' : 'MISSING')

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkTables() {
    console.log('Checking "collections" table...')
    const { data, error } = await supabase
        .from('collections')
        .select('count(*)', { count: 'exact', head: true })

    if (error) {
        console.error('❌ Error accessing "collections":', JSON.stringify(error, null, 2))
    } else {
        console.log('✅ "collections" table accessible!')
    }
}

checkTables()
