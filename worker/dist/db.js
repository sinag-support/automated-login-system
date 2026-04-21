"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
exports.getAccountsForToday = getAccountsForToday;
exports.getAccountsForDay = getAccountsForDay;
exports.updateAccountStatus = updateAccountStatus;
exports.createLoginLog = createLoginLog;
exports.getAccountsNeedingPasswordUpdate = getAccountsNeedingPasswordUpdate;
exports.getSettings = getSettings;
exports.getSetting = getSetting;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
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
// FIXED: Renamed parameter from 'error' to 'errorMessage'
async function createLoginLog(accountId, status, errorMessage) {
    const { error } = await exports.supabase
        .from('login_logs')
        .insert({
        account_id: accountId,
        status,
        error: errorMessage, // Use the renamed parameter
        created_at: new Date().toISOString()
    });
    if (error) {
        console.error('Failed to create login log:', error);
    }
}
async function getAccountsNeedingPasswordUpdate() {
    const { data, error } = await exports.supabase
        .from('accounts')
        .select('*')
        .eq('status', 'needs_password_update');
    if (error) {
        console.error('Failed to fetch accounts:', error);
        return [];
    }
    return data || [];
}
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
async function getSetting(key, defaultValue = '') {
    const { data, error } = await exports.supabase
        .from('settings')
        .select('value')
        .eq('key', key)
        .single();
    if (error || !data) {
        return defaultValue;
    }
    return data.value;
}
