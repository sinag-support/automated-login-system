"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
exports.getSettings = getSettings;
exports.getAccountsForToday = getAccountsForToday;
exports.getAccountsForDay = getAccountsForDay;
exports.updateAccountStatus = updateAccountStatus;
exports.createLoginLog = createLoginLog;
exports.getAccountWeeklyStatus = getAccountWeeklyStatus;
exports.generateWeeklyReport = generateWeeklyReport;
exports.isSuccessfulThisWeek = isSuccessfulThisWeek;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
async function getSettings() {
    const { data, error } = await exports.supabase
        .from('settings')
        .select('key, value');
    if (error) {
        console.error('Failed to fetch settings:', error);
        return {};
    }
    const settings = {};
    data.forEach((item) => {
        settings[item.key] = item.value;
    });
    return settings;
}
async function getAccountsForToday() {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    const { data, error } = await exports.supabase
        .from('accounts')
        .select('*')
        .eq('login_day', today);
    if (error) {
        console.error('Failed to fetch accounts:', error);
        return [];
    }
    return data || [];
}
async function getAccountsForDay(day) {
    const { data, error } = await exports.supabase
        .from('accounts')
        .select('*')
        .eq('login_day', day);
    if (error) {
        console.error('Failed to fetch accounts:', error);
        return [];
    }
    return data || [];
}
async function updateAccountStatus(id, status, lastLogin = new Date()) {
    const { error } = await exports.supabase
        .from('accounts')
        .update({
        status,
        last_login: lastLogin.toISOString()
    })
        .eq('id', id);
    if (error) {
        console.error(`Failed to update account ${id}:`, error);
    }
}
async function createLoginLog(accountId, status, errorMessage) {
    const { error } = await exports.supabase
        .from('login_logs')
        .insert({
        account_id: accountId,
        status,
        error: errorMessage,
        created_at: new Date().toISOString()
    });
    if (error) {
        console.error('Failed to create login log:', error);
    }
}
// Get weekly report for an account
async function getAccountWeeklyStatus(accountId) {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);
    const { data, error, count } = await exports.supabase
        .from('login_logs')
        .select('*', { count: 'exact' })
        .eq('account_id', accountId)
        .eq('status', 'success')
        .gte('created_at', startOfWeek.toISOString());
    if (error) {
        console.error('Failed to get weekly status:', error);
        return { loggedThisWeek: false, lastLogin: null, loginCountThisWeek: 0 };
    }
    const account = await exports.supabase
        .from('accounts')
        .select('last_login')
        .eq('id', accountId)
        .single();
    return {
        loggedThisWeek: (count || 0) > 0,
        lastLogin: account.data?.last_login || null,
        loginCountThisWeek: count || 0
    };
}
// Generate weekly report for all accounts - FIXED
async function generateWeeklyReport() {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);
    // Get all accounts
    const { data: accounts } = await exports.supabase
        .from('accounts')
        .select('*');
    // Get this week's logs
    const { data: logs } = await exports.supabase
        .from('login_logs')
        .select('*')
        .gte('created_at', startOfWeek.toISOString());
    // Initialize byDay with all days
    const byDay = {};
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    daysOfWeek.forEach(day => {
        byDay[day] = { total: 0, success: 0, failed: 0 };
    });
    let successful = 0;
    let failed = 0;
    let pending = 0;
    accounts?.forEach(account => {
        const day = account.login_day;
        // Only count valid days
        if (byDay[day]) {
            byDay[day].total += 1;
        }
        const accountLogs = logs?.filter(l => l.account_id === account.id) || [];
        const hasSuccess = accountLogs.some(l => l.status === 'success');
        if (hasSuccess) {
            successful++;
            if (byDay[day]) {
                byDay[day].success += 1;
            }
        }
        else if (accountLogs.length > 0) {
            failed++;
            if (byDay[day]) {
                byDay[day].failed += 1;
            }
        }
        else {
            pending++;
        }
    });
    return {
        total: accounts?.length || 0,
        successful,
        failed,
        pending,
        byDay
    };
}
// Helper: Check if account was successful this week
function isSuccessfulThisWeek(lastLogin) {
    if (!lastLogin)
        return false;
    const lastLoginDate = new Date(lastLogin);
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);
    return lastLoginDate >= startOfWeek;
}
