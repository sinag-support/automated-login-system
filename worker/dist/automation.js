"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginAutomation = void 0;
// worker/src/automation.ts
const playwright_1 = require("playwright");
class LoginAutomation {
    browser = null;
    async initialize() {
        console.log('🚀 Initializing browser...');
        this.browser = await playwright_1.chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process'
            ]
        });
        console.log('✅ Browser initialized');
    }
    async login(username, password) {
        if (!this.browser) {
            throw new Error('Browser not initialized');
        }
        const viewports = [
            { width: 1280, height: 720 },
            { width: 1366, height: 768 },
            { width: 1440, height: 900 },
            { width: 1536, height: 864 },
            { width: 1920, height: 1080 }
        ];
        const randomViewport = viewports[Math.floor(Math.random() * viewports.length)];
        const context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: randomViewport,
            locale: 'en-PH',
            timezoneId: 'Asia/Manila',
            permissions: ['geolocation']
        });
        const page = await context.newPage();
        try {
            console.log(`\n📱 Processing: ${username}`);
            const loginUrl = process.env.LOGIN_URL || 'https://ph.pmiandu.com';
            console.log(`🌐 Navigating to: ${loginUrl}`);
            await page.goto(loginUrl, {
                waitUntil: 'networkidle',
                timeout: 30000
            });
            await LoginAutomation.delay(500, 1500);
            // ===== USERNAME FIELD =====
            const usernameSelectors = [
                '#signInName',
                'input[type="text"]',
                'input[type="tel"]',
                'input[name="username"]',
                'input[placeholder*="+63"]',
                'input[placeholder*="mobile"]',
                'input[placeholder*="phone"]'
            ];
            let usernameInput = null;
            for (const selector of usernameSelectors) {
                try {
                    usernameInput = await page.waitForSelector(selector, { timeout: 3000 });
                    if (usernameInput) {
                        console.log(`  ✓ Found username field: ${selector}`);
                        break;
                    }
                }
                catch (e) {
                    continue;
                }
            }
            if (!usernameInput) {
                // Try to find by label/placeholder using try-catch properly
                try {
                    usernameInput = await page.getByLabel('Enter Email address or Mobile Number').first();
                    if (usernameInput)
                        console.log(`  ✓ Found username field by label`);
                }
                catch (e) {
                    try {
                        usernameInput = await page.getByPlaceholder('+63').first();
                        if (usernameInput)
                            console.log(`  ✓ Found username field by placeholder`);
                    }
                    catch (e) {
                        // Continue to next check
                    }
                }
            }
            if (!usernameInput) {
                throw new Error('Could not find username field');
            }
            await usernameInput.click();
            await page.waitForTimeout(200);
            await usernameInput.fill('');
            await usernameInput.type(username, { delay: 50 + Math.floor(Math.random() * 50) });
            console.log(`  ✓ Username entered`);
            // ===== PASSWORD FIELD =====
            const passwordSelectors = [
                '#password',
                'input[type="password"]',
                'input[name="password"]',
                'input[name="Password"]'
            ];
            let passwordInput = null;
            for (const selector of passwordSelectors) {
                try {
                    passwordInput = await page.waitForSelector(selector, { timeout: 3000 });
                    if (passwordInput) {
                        console.log(`  ✓ Found password field: ${selector}`);
                        break;
                    }
                }
                catch (e) {
                    continue;
                }
            }
            if (!passwordInput) {
                try {
                    passwordInput = await page.getByLabel('Enter Password').first();
                    if (passwordInput)
                        console.log(`  ✓ Found password field by label`);
                }
                catch (e) {
                    try {
                        passwordInput = await page.getByPlaceholder('Password').first();
                        if (passwordInput)
                            console.log(`  ✓ Found password field by placeholder`);
                    }
                    catch (e) {
                        // Continue
                    }
                }
            }
            if (!passwordInput) {
                throw new Error('Could not find password field');
            }
            await passwordInput.click();
            await page.waitForTimeout(200);
            await passwordInput.fill('');
            await passwordInput.type(password, { delay: 50 + Math.floor(Math.random() * 50) });
            console.log(`  ✓ Password entered`);
            await LoginAutomation.delay(300, 800);
            // ===== LOGIN BUTTON =====
            const buttonSelectors = [
                '#next',
                'button[type="submit"]',
                'button:has-text("Sign in")',
                'button:has-text("Login")',
                'button:has-text("Sign In")',
                'button[aria-label*="login" i]',
                'button[aria-label*="sign in" i]',
                'input[type="submit"]'
            ];
            let loginButton = null;
            for (const selector of buttonSelectors) {
                try {
                    loginButton = await page.waitForSelector(selector, { timeout: 3000 });
                    if (loginButton) {
                        console.log(`  ✓ Found login button: ${selector}`);
                        break;
                    }
                }
                catch (e) {
                    continue;
                }
            }
            if (!loginButton) {
                try {
                    loginButton = await page.getByRole('button', { name: /sign in|login/i }).first();
                    if (loginButton)
                        console.log(`  ✓ Found login button by role`);
                }
                catch (e) {
                    // Continue
                }
            }
            if (!loginButton) {
                throw new Error('Could not find login button');
            }
            const box = await loginButton.boundingBox();
            if (box) {
                await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
                await page.waitForTimeout(100);
            }
            await loginButton.click();
            console.log(`  ✓ Login button clicked`);
            // ===== WAIT FOR RESULT =====
            await Promise.race([
                page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }),
                page.waitForSelector('.error, .alert-danger, #error, [role="alert"], .text-danger', { timeout: 20000 }),
                page.waitForTimeout(20000)
            ]).catch(() => {
                console.log(`  ⏱️ Navigation timeout - checking result anyway`);
            });
            await page.waitForTimeout(2000);
            // ===== CHECK SUCCESS =====
            const currentUrl = page.url();
            const errorSelectors = [
                '.error',
                '.alert-danger',
                '#error',
                '[role="alert"]',
                '.text-danger',
                '[class*="error"]',
                '[class*="invalid"]'
            ];
            let hasError = false;
            let errorMessage = '';
            for (const selector of errorSelectors) {
                const errorElement = await page.$(selector).catch(() => null);
                if (errorElement) {
                    const text = await errorElement.textContent().catch(() => '');
                    if (text && text.length > 0) {
                        hasError = true;
                        errorMessage = text.trim();
                        break;
                    }
                }
            }
            // Check body text for common error phrases - FIXED: Check for null
            const bodyText = await page.textContent('body').catch(() => '');
            const errorPhrases = [
                'invalid username',
                'invalid password',
                'incorrect password',
                'wrong password',
                'user not found',
                'account not found',
                'login failed',
                'authentication failed',
                'please check your credentials'
            ];
            if (!hasError && bodyText) {
                for (const phrase of errorPhrases) {
                    if (bodyText.toLowerCase().includes(phrase)) {
                        hasError = true;
                        errorMessage = phrase;
                        break;
                    }
                }
            }
            const isLoggedIn = !hasError &&
                !currentUrl.includes('/login') &&
                !currentUrl.includes('/signin') &&
                !currentUrl.includes('/auth') &&
                currentUrl !== loginUrl;
            if (isLoggedIn) {
                console.log(`  ✅ Login SUCCESSFUL`);
                console.log(`  📍 Redirected to: ${currentUrl}`);
                return { success: true };
            }
            else {
                console.log(`  ❌ Login FAILED`);
                if (errorMessage) {
                    console.log(`  ⚠️ Error: ${errorMessage}`);
                }
                console.log(`  📍 Current URL: ${currentUrl}`);
                return {
                    success: false,
                    error: errorMessage || 'Invalid credentials or login failed'
                };
            }
        }
        catch (err) {
            console.error(`  🔥 Login error:`, err.message);
            return {
                success: false,
                error: err.message || 'Automation failed'
            };
        }
        finally {
            await context.close();
        }
    }
    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            console.log('🔒 Browser closed');
        }
    }
    static async delay(min, max) {
        const delay = Math.floor(Math.random() * (max - min + 1) + min);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
}
exports.LoginAutomation = LoginAutomation;
