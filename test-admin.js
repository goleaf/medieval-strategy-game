// Test script to verify admin features work
const baseURL = 'http://localhost:3000'

async function testAdminFeatures() {
  console.log('🧪 Testing Admin Features...\n')

  try {
    // Test 1: Admin Login
    console.log('1. Testing Admin Login...')
    const loginResponse = await fetch(`${baseURL}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    })

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`)
    }

    const loginData = await loginResponse.json()
    console.log('✅ Admin login successful')
    const token = loginData.data.token

    // Test 2: Get World Config
    console.log('2. Testing World Config...')
    const configResponse = await fetch(`${baseURL}/api/admin/world/config`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!configResponse.ok) {
      throw new Error(`World config failed: ${configResponse.status}`)
    }

    const configData = await configResponse.json()
    console.log('✅ World config retrieved')

    // Test 3: Get Players
    console.log('3. Testing Player Management...')
    const playersResponse = await fetch(`${baseURL}/api/admin/players`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!playersResponse.ok) {
      throw new Error(`Players failed: ${playersResponse.status}`)
    }

    const playersData = await playersResponse.json()
    console.log(`✅ Players retrieved: ${playersData.data.length} players`)

    // Test 4: Get Speed Templates
    console.log('4. Testing Speed Templates...')
    const speedResponse = await fetch(`${baseURL}/api/admin/speed-templates`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!speedResponse.ok) {
      throw new Error(`Speed templates failed: ${speedResponse.status}`)
    }

    const speedData = await speedResponse.json()
    console.log('✅ Speed templates retrieved')

    // Test 5: Get Unit Balance
    console.log('5. Testing Unit Balance...')
    const unitsResponse = await fetch(`${baseURL}/api/admin/units/balance`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!unitsResponse.ok) {
      throw new Error(`Unit balance failed: ${unitsResponse.status}`)
    }

    const unitsData = await unitsResponse.json()
    console.log('✅ Unit balance retrieved')

    // Test 6: Get Stats
    console.log('6. Testing System Stats...')
    const statsResponse = await fetch(`${baseURL}/api/admin/stats`)

    if (!statsResponse.ok) {
      throw new Error(`Stats failed: ${statsResponse.status}`)
    }

    const statsData = await statsResponse.json()
    console.log('✅ System stats retrieved')

    console.log('\n🎉 All admin features tested successfully!')
    console.log('\n📋 Admin Dashboard Access:')
    console.log(`   URL: ${baseURL}/admin/dashboard`)
    console.log('   Login: admin / admin123')
    console.log('   Token:', token.substring(0, 50) + '...')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.log('\n🔧 Troubleshooting:')
    console.log('1. Make sure the server is running: npm run dev')
    console.log('2. Check if admin user exists in database')
    console.log('3. Verify JWT_SECRET is set in .env.local')
  }
}

testAdminFeatures()
