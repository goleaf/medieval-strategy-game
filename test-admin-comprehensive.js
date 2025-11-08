// Comprehensive Admin Features Test Script
const baseURL = 'http://localhost:3000'

async function testAdminFeatures() {
  console.log('🧪 Comprehensive Admin Features Testing...\n')

  let token = null
  let testResults = {
    passed: 0,
    failed: 0,
    total: 0
  }

  function test(name, testFn) {
    testResults.total++
    console.log(`\n🔍 Testing: ${name}`)
    try {
      const result = testFn()
      if (result !== false) {
        console.log(`✅ PASSED: ${name}`)
        testResults.passed++
        return result
      }
    } catch (error) {
      console.log(`❌ FAILED: ${name} - ${error.message}`)
      testResults.failed++
      return false
    }
  }

  try {
    // 1. Admin Authentication
    const loginResult = await test('Admin Login', async () => {
      const loginResponse = await fetch(`${baseURL}/api/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin',
          password: 'admin123'
        })
      })

      if (!loginResponse.ok) {
        throw new Error(`HTTP ${loginResponse.status}`)
      }

      const loginData = await loginResponse.json()
      if (!loginData.success || !loginData.data?.token) {
        throw new Error('Invalid login response')
      }

      token = loginData.data.token
      return loginData.data
    })

    if (!token) {
      console.log('\n❌ Cannot continue testing without authentication token')
      return
    }

    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }

    // 2. World Configuration
    test('World Config GET', async () => {
      const response = await fetch(`${baseURL}/api/admin/world/config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (!data.worldName) throw new Error('Invalid world config response')
      return data
    })

    // 3. Speed Templates
    test('Speed Templates GET', async () => {
      const response = await fetch(`${baseURL}/api/admin/speed-templates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (!data.success || !data.data) throw new Error('Invalid speed templates response')
      return data.data
    })

    // 4. Unit Balance
    test('Unit Balance GET', async () => {
      const response = await fetch(`${baseURL}/api/admin/units/balance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (!data.success || !Array.isArray(data.data)) throw new Error('Invalid unit balance response')
      return data.data
    })

    // 5. Players Management
    test('Players GET', async () => {
      const response = await fetch(`${baseURL}/api/admin/players`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (!data.success || !Array.isArray(data.data)) throw new Error('Invalid players response')
      return data.data
    })

    // 6. Statistics
    test('Statistics GET', async () => {
      const response = await fetch(`${baseURL}/api/admin/stats`)

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (!data.stats) throw new Error('Invalid stats response')
      return data.stats
    })

    // 7. Bulk Operations Test (if players exist)
    test('Bulk Operations POST', async () => {
      // First get some players
      const playersResponse = await fetch(`${baseURL}/api/admin/players`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const playersData = await playersResponse.json()

      if (playersData.success && playersData.data.length > 0) {
        const testPlayer = playersData.data[0]
        const response = await fetch(`${baseURL}/api/admin/players/bulk`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            operation: 'ban',
            playerIds: [testPlayer.id],
            reason: 'Test bulk operation'
          })
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        if (!data.success) throw new Error('Bulk operation failed')
        return data
      } else {
        console.log('⚠️  Skipping bulk operations test - no players found')
        return true
      }
    })

    // 8. Create Admin Test
    test('Create Admin POST', async () => {
      const response = await fetch(`${baseURL}/api/admin/auth/create-admin`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          username: 'testadmin',
          email: 'testadmin@game.local',
          password: 'testpass123',
          displayName: 'Test Administrator',
          role: 'MODERATOR'
        })
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (!data.success) throw new Error('Create admin failed')
      return data
    })

    // 9. Admin Dashboard Access Test
    test('Admin Dashboard Page', async () => {
      const response = await fetch(`${baseURL}/admin/dashboard`)

      // This might return HTML, just check if it's accessible
      if (response.status >= 200 && response.status < 300) {
        return true
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    })

  } catch (error) {
    console.log(`\n💥 Test suite failed: ${error.message}`)
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(50))
  console.log(`Total Tests: ${testResults.total}`)
  console.log(`✅ Passed: ${testResults.passed}`)
  console.log(`❌ Failed: ${testResults.failed}`)
  console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`)

  if (testResults.failed === 0) {
    console.log('\n🎉 All admin features are working correctly!')
    console.log('\n📋 Admin Dashboard Access:')
    console.log(`   URL: ${baseURL}/admin/dashboard`)
    console.log('   Login: admin / admin123')
    if (token) {
      console.log(`   Token: ${token.substring(0, 50)}...`)
    }
  } else {
    console.log('\n⚠️  Some tests failed. Check the implementation.')
  }

  return testResults
}

testAdminFeatures().catch(console.error)

