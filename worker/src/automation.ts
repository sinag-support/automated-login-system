import { chromium, Browser, Page } from 'playwright'

export class LoginAutomation {
  private browser: Browser | null = null

  async initialize() {
    console.log('Initializing browser...')
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    })
    console.log('Browser initialized')
  }

  async login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (!this.browser) {
      throw new Error('Browser not initialized')
    }

    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      viewport: { width: 1280, height: 720 }
    })

    const page = await context.newPage()

    try {
      console.log(`Attempting login for: ${username}`)
      
      // Visit login page
      await page.goto('https://ph.pmiandu.com', {
        waitUntil: 'networkidle',
        timeout: 30000
      })

      // Wait for username field - using the exact ID from the site
      const usernameInput = await page.waitForSelector('#signInName', { 
        timeout: 10000 
      })
      
      if (!usernameInput) {
        throw new Error('Could not find username field')
      }

      // Clear any pre-filled text and enter username
      await usernameInput.click()
      await usernameInput.fill('')
      await usernameInput.type(username, { delay: 50 })
      console.log(`  ✓ Username entered: ${username}`)

      // Fill password field - using exact ID
      const passwordInput = await page.waitForSelector('#password', { 
        timeout: 5000 
      })
      
      if (!passwordInput) {
        throw new Error('Could not find password field')
      }

      await passwordInput.click()
      await passwordInput.fill('')
      await passwordInput.type(password, { delay: 50 })
      console.log(`  ✓ Password entered`)

      // Small delay before clicking
      await page.waitForTimeout(500)

      // Click login button - using exact ID
      const loginButton = await page.waitForSelector('#next', { 
        timeout: 5000 
      })
      
      if (!loginButton) {
        throw new Error('Could not find login button')
      }

      await loginButton.click()
      console.log(`  ✓ Login button clicked`)

      // Wait for navigation or error
      await Promise.race([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }),
        page.waitForSelector('.error, .alert-danger, #error, [role="alert"]', { timeout: 15000 })
      ]).catch(() => {
        // Timeout is okay - we'll check the result
      })

      // Additional wait for page to stabilize
      await page.waitForTimeout(2000)

      // Check if login was successful
      const currentUrl = page.url()
      
      // Check for error elements
      const hasError = await page.$('.error, .alert-danger, #error, [role="alert"]').catch(() => null)
      
      // Check for error text in body
      const bodyText = await page.textContent('body').catch(() => '')
      
      // Success indicators:
      // - URL changed from login page
      // - No error elements present
      // - No error messages in body
      const success = !hasError &&
        !currentUrl.includes('/login') &&
        !currentUrl.includes('/signin') &&
        !currentUrl.includes('/auth') &&
        !bodyText?.toLowerCase().includes('invalid') &&
        !bodyText?.toLowerCase().includes('incorrect') &&
        !bodyText?.toLowerCase().includes('wrong password') &&
        !bodyText?.toLowerCase().includes('not found')

      if (success) {
        console.log(`  ✅ Login successful for: ${username}`)
        console.log(`  📍 Redirected to: ${currentUrl}`)
      } else {
        console.log(`  ❌ Login failed for: ${username}`)
        if (hasError) {
          const errorText = await hasError.textContent()
          console.log(`  ⚠️ Error message: ${errorText}`)
        }
      }

      return { success }
    } catch (err: any) {
      console.error(`  🔥 Login error for ${username}:`, err.message)
      return {
        success: false,
        error: err.message || 'Automation failed'
      }
    } finally {
      await context.close()
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      console.log('Browser closed')
    }
  }

  static async delay(min: number, max: number) {
    const delay = Math.floor(Math.random() * (max - min + 1) + min)
    await new Promise(resolve => setTimeout(resolve, delay))
  }
}