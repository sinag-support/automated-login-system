"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const node_cron_1 = __importDefault(require("node-cron"));
const automation_1 = require("./automation");
const db_1 = require("./db");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY || 'dev-api-key';
// Cache settings
let cachedSettings = {};
let lastSettingsFetch = 0;
const SETTINGS_CACHE_TTL = 60000;
async function refreshSettings() {
    const now = Date.now();
    if (now - lastSettingsFetch > SETTINGS_CACHE_TTL) {
        cachedSettings = await (0, db_1.getSettings)();
        lastSettingsFetch = now;
        console.log('📋 Settings refreshed');
    }
    return cachedSettings;
}
// Middleware
app.use(express_1.default.json());
// Auth middleware
const authMiddleware = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};
// Main automation function
async function runAutomation(day) {
    const startTime = new Date();
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🚀 STARTING LOGIN AUTOMATION`);
    console.log(`📅 Date: ${startTime.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    const settings = await refreshSettings();
    const delayMs = parseInt(settings.delay_between_logins || '3000');
    const maxRetries = parseInt(settings.max_retries || '2');
    const autoRetry = settings.auto_retry === 'true';
    console.log(`⚙️ Settings: delay=${delayMs}ms, retries=${maxRetries}, autoRetry=${autoRetry}`);
    const automation = new automation_1.LoginAutomation();
    await automation.initialize();
    try {
        const accounts = day ? await (0, db_1.getAccountsForDay)(day) : await (0, db_1.getAccountsForToday)();
        // Track weekly status for reporting
        const accountsToProcess = accounts.filter(account => {
            if (account.status === 'success' && (0, db_1.isSuccessfulThisWeek)(account.last_login)) {
                console.log(`⏭️ SKIP: ${account.store_name} - already logged in this week (${account.last_login})`);
                return false;
            }
            if (account.status === 'success') {
                console.log(`🔄 RUN: ${account.store_name} - success was from previous week`);
            }
            else {
                console.log(`🔄 RUN: ${account.store_name} - status is "${account.status}"`);
            }
            return true;
        });
        console.log(`\n📊 SUMMARY: ${accounts.length} total, ${accountsToProcess.length} to process, ${accounts.length - accountsToProcess.length} skipped\n`);
        let successCount = 0;
        let failCount = 0;
        const results = [];
        for (let i = 0; i < accountsToProcess.length; i++) {
            const account = accountsToProcess[i];
            console.log(`\n[${i + 1}/${accountsToProcess.length}] 📱 ${account.store_name}`);
            console.log(`   📞 ${account.mobile_number}`);
            let attemptSuccess = false;
            let lastError;
            const maxAttempts = autoRetry ? maxRetries : 1;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                if (attempt > 1) {
                    console.log(`   🔄 Retry ${attempt}/${maxAttempts}`);
                    await automation_1.LoginAutomation.delay(1000, 2000);
                }
                try {
                    const password = account.customPassword || account.defaultPassword;
                    if (i > 0 || attempt > 1) {
                        const delay = delayMs + Math.floor(Math.random() * 1000) - 500;
                        await automation_1.LoginAutomation.delay(delay, delay + 1000);
                    }
                    const result = await automation.login(account.mobile_number, password);
                    if (result.success) {
                        attemptSuccess = true;
                        break;
                    }
                    else {
                        lastError = result.error;
                    }
                }
                catch (error) {
                    lastError = error.message;
                }
            }
            const status = attemptSuccess ? 'success' : 'needs_password_update';
            await (0, db_1.updateAccountStatus)(account.id, status);
            await (0, db_1.createLoginLog)(account.id, attemptSuccess ? 'success' : 'failed', lastError);
            results.push({
                store: account.store_name,
                mobile: account.mobile_number,
                success: attemptSuccess,
                status
            });
            if (attemptSuccess) {
                successCount++;
                console.log(`   ✅ SUCCESS - Weekly login complete!`);
            }
            else {
                failCount++;
                console.log(`   ❌ FAILED - Needs password update`);
            }
        }
        const endTime = new Date();
        const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📊 FINAL SUMMARY`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`✅ Successful: ${successCount}`);
        console.log(`❌ Failed: ${failCount}`);
        console.log(`⏱️ Duration: ${duration} seconds`);
        console.log(`📅 Completed: ${endTime.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
        return { successCount, failCount, duration, results };
    }
    catch (error) {
        console.error('❌ Automation failed:', error);
        throw error;
    }
    finally {
        await automation.cleanup();
    }
}
// API Routes
app.post('/run-daily-logins', authMiddleware, async (req, res) => {
    const { day } = req.body;
    runAutomation(day).catch(console.error);
    res.json({
        message: 'Login automation started',
        day: day || 'today'
    });
});
app.post('/run-now', authMiddleware, async (req, res) => {
    const { day } = req.body;
    runAutomation(day).catch(console.error);
    res.json({
        message: 'Manual automation triggered',
        day: day || 'today'
    });
});
// NEW: Get weekly report
app.get('/report/weekly', authMiddleware, async (req, res) => {
    try {
        const report = await (0, db_1.generateWeeklyReport)();
        res.json({
            ...report,
            generatedAt: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// NEW: Get account status for current week
app.get('/account/:id/weekly-status', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const status = await (0, db_1.getAccountWeeklyStatus)(id);
        res.json(status);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
app.get('/settings', authMiddleware, async (req, res) => {
    const settings = await refreshSettings();
    res.json(settings);
});
app.get('/status', authMiddleware, async (req, res) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const stats = {};
    for (const day of days) {
        const accounts = await (0, db_1.getAccountsForDay)(day);
        stats[day] = accounts.length;
    }
    res.json({
        status: 'running',
        scheduledAccounts: stats,
        total: Object.values(stats).reduce((a, b) => a + b, 0)
    });
});
// Schedule cron job (8 AM Monday-Saturday)
node_cron_1.default.schedule('0 8 * * 1-6', () => {
    console.log('⏰ Running scheduled automation...');
    runAutomation().catch(console.error);
}, {
    timezone: 'Asia/Manila'
});
// Weekly reset (Monday 12:01 AM)
node_cron_1.default.schedule('1 0 * * 1', async () => {
    console.log('📅 Monday reset: New week starting...');
    // Optional: Reset statuses if needed
}, {
    timezone: 'Asia/Manila'
});
console.log('📅 Cron job scheduled: 8 AM Monday-Saturday (Asia/Manila)');
app.listen(PORT, () => {
    console.log(`🚂 Worker running on port ${PORT}`);
    console.log(`🔑 API Key: ${API_KEY === 'dev-api-key' ? 'development mode' : 'configured'}`);
});
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});
