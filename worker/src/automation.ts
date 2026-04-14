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
      await page.goto('https://phmaindu.com', {
        waitUntil: 'networkidle',
        timeout: 30000
      })

      // Wait for and fill username field
      const usernameSelectors = [
        'input[name="username"]',
        'input[type="text"]',
        'input[type="tel"]',
        '#username',
        '#mobile',
        '[placeholder*="mobile"]',
        '[placeholder*="username"]'
      ]

      let usernameInput = null
      for (const selector of usernameSelectors) {
        try {
          usernameInput = await page.waitForSelector(selector, { timeout: 5000 })
          if (usernameInput) break
        } catch (e) {
          continue
        }
      }

      if (!usernameInput) {
        throw new Error('Could not find username field')
      }

      await usernameInput.fill(username)

      // Fill password field
      const passwordSelectors = [
        'input[name="password"]',
        'input[type="password"]',
        '#password'
      ]

      let passwordInput = null
      for (const selector of passwordSelectors) {
        try {
          passwordInput = await page.waitForSelector(selector, { timeout: 5000 })
          if (passwordInput) break
        } catch (e) {
          continue
        }
      }

      if (!passwordInput) {
        throw new Error('Could not find password field')
      }

      await passwordInput.fill(password)

      // Click login button
      const buttonSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Login")',
        'button:has-text("Sign in")',
        'button:has-text("Submit")'
      ]

      let loginButton = null
      for (const selector of buttonSelectors) {
        try {
          loginButton = await page.waitForSelector(selector, { timeout: 5000 })
          if (loginButton) break
        } catch (e) {
          continue
        }
      }

      if (!loginButton) {
        throw new Error('Could not find login button')
      }

      await loginButton.click()

      // Wait for navigation or error
      await Promise.race([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }),
        page.waitForSelector('.error, .alert-danger, [class*="error"]', { timeout: 15000 })
      ]).catch(() => {
        // Timeout is okay - we'll check the result
      })

      // Check if login was successful
      const currentUrl = page.url()
      const hasError = await page.$('.error, .alert-danger, [class*="error"]').catch(() => null)
      const bodyText = await page.textContent('body').catch(() => '')

      // Check for success indicators
      const success = !hasError &&
        !currentUrl.includes('login') &&
        !currentUrl.includes('signin') &&
        !bodyText?.toLowerCase().includes('invalid') &&
        !bodyText?.toLowerCase().includes('incorrect')

      console.log(`Login ${success ? 'successful' : 'failed'} for: ${username}`)

      return { success }
    } catch (error: any) {
      console.error(`Login error for ${username}:`, error.message)
      return {
        success: false,
        error: error.message || 'Automation failed'
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