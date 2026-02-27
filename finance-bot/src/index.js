// Finance Bot v2.0 - Multi-tenant Telegram Finance Bot
// Cloudflare Worker with D1 Database

import { UserService } from './services/user.js';
import { CategoryService } from './services/category.js';
import { TransactionService } from './services/transaction.js';
import { StatsService } from './services/stats.js';
import { FamilyService } from './services/family.js';
import { ExportService } from './services/export.js';
import { BudgetService } from './services/budget.js';
import { BankImportService } from './services/bank-import.js';
import { NordigenService } from './services/nordigen.js';
import { SaltEdgeService } from './services/saltedge.js';
import { AccountService } from './services/account.js';
import { sendMessage, editMessage, answerCallback, sendDocument, downloadFile, inlineKeyboard, button, buttonRow } from './utils/telegram.js';
import { parseMonth, getMonthRange } from './utils/db.js';
import { getTranslations, getLanguages, getMonthName } from './utils/i18n.js';
import { handleMiniAppAPI } from './api/miniapp.js';
import { handleAuth } from './api/auth.js';
import MINIAPP_HTML from '../mini-app.html';

// ============================================
// INSTALL LANDING PAGE
// ============================================
const INSTALL_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<title>Alar Finance — Install App</title>
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#09090b">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="/icon-192.png">
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<link href="https://api.fontshare.com/v2/css?f[]=switzer@300,400,500,600,700&f[]=satoshi@300,400,500,700,900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Satoshi',sans-serif;background:#09090b;color:#fafafa;min-height:100dvh;display:flex;flex-direction:column;align-items:center;overflow-x:hidden}
.hero{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 24px 40px;text-align:center;max-width:480px;width:100%}
.logo{width:80px;height:80px;margin-bottom:24px;border-radius:20px;box-shadow:0 8px 32px rgba(59,130,246,0.3)}
h1{font-family:'Switzer',sans-serif;font-size:32px;font-weight:600;margin-bottom:8px;background:linear-gradient(135deg,#3b82f6,#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.subtitle{color:#a1a1aa;font-size:15px;margin-bottom:40px;line-height:1.5}
.features{display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%;margin-bottom:40px}
.feature{background:#111114;border:1px solid #27272a;border-radius:16px;padding:16px;text-align:center}
.feature-icon{font-size:28px;margin-bottom:8px}
.feature-text{font-size:12px;color:#a1a1aa;line-height:1.4}
.install-section{width:100%;max-width:480px;padding:0 24px}
.install-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:16px;border-radius:12px;border:none;font-family:'Satoshi',sans-serif;font-size:16px;font-weight:600;cursor:pointer;margin-bottom:12px;transition:transform 0.2s,opacity 0.2s}
.install-btn:active{transform:scale(0.97)}
.btn-primary{background:linear-gradient(135deg,#3b82f6,#22d3ee);color:#fff}
.btn-secondary{background:#111114;color:#fafafa;border:1px solid #27272a}
.btn-icon{width:20px;height:20px}
.web-link{display:block;text-align:center;color:#a1a1aa;font-size:13px;padding:16px;text-decoration:none;margin-bottom:20px}
.web-link span{color:#3b82f6;text-decoration:underline}
.steps{width:100%;max-width:480px;padding:0 24px 40px}
.steps h3{font-size:16px;font-weight:600;margin-bottom:16px;color:#a1a1aa}
.step{display:flex;gap:12px;margin-bottom:16px;align-items:flex-start}
.step-num{min-width:28px;height:28px;background:linear-gradient(135deg,#3b82f6,#22d3ee);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700}
.step-text{font-size:14px;line-height:1.5;color:#d4d4d8;padding-top:3px}
.step-text b{color:#fafafa}
.footer{text-align:center;padding:24px;color:#52525b;font-size:12px;border-top:1px solid #18181b;width:100%;margin-top:auto}

/* iOS install modal */
.ios-modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:100;align-items:flex-end;justify-content:center;padding:16px}
.ios-modal.show{display:flex}
.ios-modal-content{background:#1c1c1e;border-radius:20px;padding:24px;max-width:360px;width:100%;margin-bottom:env(safe-area-inset-bottom,20px)}
.ios-modal h3{font-size:18px;font-weight:700;margin-bottom:16px;text-align:center}
.ios-step{display:flex;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid #2c2c2e}
.ios-step:last-child{border:none}
.ios-step-icon{font-size:24px;min-width:32px;text-align:center}
.ios-step-text{font-size:14px;color:#d4d4d8}
.ios-step-text b{color:#fafafa}
.ios-close{width:100%;padding:14px;background:#2c2c2e;border:none;border-radius:12px;color:#3b82f6;font-size:16px;font-weight:600;margin-top:16px;cursor:pointer;font-family:'Satoshi',sans-serif}

/* Hide install section if already installed */
@media(display-mode:standalone){
  .install-section,.steps{display:none}
  .hero{padding-bottom:20px}
}
</style>
</head>
<body>
<div class="hero">
  <img src="/icon-192.png" alt="Alar" class="logo">
  <h1>Alar Finance</h1>
  <p class="subtitle">Track expenses, income & budgets.<br>Auto-convert currencies. Bank sync.</p>
  <div class="features">
    <div class="feature"><div class="feature-icon">💰</div><div class="feature-text">Expense & Income tracking</div></div>
    <div class="feature"><div class="feature-icon">📊</div><div class="feature-text">Statistics & Trends</div></div>
    <div class="feature"><div class="feature-icon">💱</div><div class="feature-text">Auto currency conversion</div></div>
    <div class="feature"><div class="feature-icon">🏦</div><div class="feature-text">Bank sync (Open Banking)</div></div>
    <div class="feature"><div class="feature-icon">👨‍👩‍👧</div><div class="feature-text">Family budgets</div></div>
    <div class="feature"><div class="feature-icon">📥</div><div class="feature-text">Excel export</div></div>
  </div>
</div>

<div class="install-section">
  <a class="install-btn btn-primary" id="androidBtn" href="/download/android" style="display:none;text-decoration:none">
    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    Download for Android
  </a>
  <button class="install-btn btn-primary" id="iosBtn" style="display:none" onclick="showIosModal()">
    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    Install on iPhone
  </button>
  <button class="install-btn btn-secondary" onclick="location.href='/app'">
    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
    Open in Browser
  </button>
  <a href="/app" class="web-link">or <span>continue in browser</span></a>
</div>

<div class="steps" id="androidSteps" style="display:none">
  <h3>How to install:</h3>
  <div class="step"><div class="step-num">1</div><div class="step-text">Tap <b>"Install App"</b> above</div></div>
  <div class="step"><div class="step-num">2</div><div class="step-text">Confirm in the popup</div></div>
  <div class="step"><div class="step-num">3</div><div class="step-text">App appears on your <b>home screen</b></div></div>
</div>

<div class="steps" id="iosSteps" style="display:none">
  <h3>How to install on iPhone:</h3>
  <div class="step"><div class="step-num">1</div><div class="step-text">Open this page in <b>Safari</b></div></div>
  <div class="step"><div class="step-num">2</div><div class="step-text">Tap the <b>Share</b> button (square with arrow ↑)</div></div>
  <div class="step"><div class="step-num">3</div><div class="step-text">Scroll down, tap <b>"Add to Home Screen"</b></div></div>
  <div class="step"><div class="step-num">4</div><div class="step-text">Tap <b>"Add"</b> — done!</div></div>
</div>

<div class="ios-modal" id="iosModal">
  <div class="ios-modal-content">
    <h3>Install Alar Finance</h3>
    <div class="ios-step"><div class="ios-step-icon">↑</div><div class="ios-step-text">Tap the <b>Share</b> button below</div></div>
    <div class="ios-step"><div class="ios-step-icon">➕</div><div class="ios-step-text">Tap <b>"Add to Home Screen"</b></div></div>
    <div class="ios-step"><div class="ios-step-icon">✓</div><div class="ios-step-text">Tap <b>"Add"</b> to install</div></div>
    <button class="ios-close" onclick="hideIosModal()">Got it</button>
  </div>
</div>

<div class="footer">Alar Finance · Automate with discipline ▲</div>

<script>
let deferredPrompt = null;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isAndroid = /Android/.test(navigator.userAgent);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;

// If already installed as PWA, redirect to app
if (isStandalone) { location.href = '/app'; }

// Android: show download APK button
if (isAndroid && !isStandalone) {
  document.getElementById('androidBtn').style.display = 'flex';
  document.getElementById('androidSteps').style.display = 'block';
}

// iOS: show install button
if (isIOS && !isStandalone) {
  document.getElementById('iosBtn').style.display = 'flex';
  document.getElementById('iosSteps').style.display = 'block';
}

// Desktop: show both buttons
if (!isIOS && !isAndroid && !isStandalone) {
  document.getElementById('androidBtn').style.display = 'flex';
}

function showIosModal() {
  document.getElementById('iosModal').classList.add('show');
}

function hideIosModal() {
  document.getElementById('iosModal').classList.remove('show');
}

// Register SW
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(()=>{});
}
</script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ============================================
    // MINI APP: Serve HTML + REST API
    // ============================================

    // Landing / Install page (GET only — POST is reserved for Telegram webhook)
    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(INSTALL_PAGE, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Download Android APK from KV
    if (url.pathname === '/download/android') {
      const apk = await env.FINANCE_KV.get('apk_file', 'arrayBuffer');
      if (!apk) {
        return new Response('APK not found', { status: 404 });
      }
      return new Response(apk, {
        headers: {
          'Content-Type': 'application/vnd.android.package-archive',
          'Content-Disposition': 'attachment; filename="AlarFinance.apk"',
          'Content-Length': apk.byteLength.toString(),
        },
      });
    }

    // Serve Mini App HTML (Telegram + standalone PWA)
    if (url.pathname === '/webapp' || url.pathname === '/app') {
      return new Response(MINIAPP_HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // PWA Manifest
    if (url.pathname === '/manifest.json') {
      const manifest = {
        name: 'Alar Finance',
        short_name: 'Alar',
        description: 'Personal finance tracker — expenses, income, budgets & bank sync',
        start_url: '/app',
        display: 'standalone',
        background_color: '#09090b',
        theme_color: '#09090b',
        orientation: 'portrait',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        categories: ['finance', 'productivity'],
        lang: 'en',
      };
      return new Response(JSON.stringify(manifest), {
        headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=86400' },
      });
    }

    // PWA Service Worker
    if (url.pathname === '/sw.js') {
      const sw = `
const CACHE = 'alar-v1';
const PRECACHE = ['/', '/app', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/api/')) return; // never cache API
  e.respondWith(
    fetch(e.request).then(r => {
      const clone = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return r;
    }).catch(() => caches.match(e.request))
  );
});`;
      return new Response(sw, {
        headers: { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-cache' },
      });
    }

    // PWA Icons (generated SVG → PNG-like SVG wrapped)
    if (url.pathname === '/icon-192.png' || url.pathname === '/icon-512.png') {
      const size = url.pathname.includes('512') ? 512 : 192;
      const svg = `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#g)"/>
        <path d="${`M${size/2} ${size*0.17} L${size*0.79} ${size*0.79} L${size*0.21} ${size*0.79} Z`}" stroke="white" stroke-width="${size*0.04}" stroke-linejoin="round" fill="none"/>
        <line x1="${size*0.58}" y1="${size*0.48}" x2="${size*0.83}" y2="${size*0.35}" stroke="white" stroke-width="${size*0.03}" stroke-linecap="round" opacity="0.8"/>
        <line x1="${size*0.6}" y1="${size*0.54}" x2="${size*0.83}" y2="${size*0.54}" stroke="white" stroke-width="${size*0.03}" stroke-linecap="round" opacity="0.6"/>
        <line x1="${size*0.58}" y1="${size*0.6}" x2="${size*0.83}" y2="${size*0.73}" stroke="white" stroke-width="${size*0.03}" stroke-linecap="round" opacity="0.4"/>
        <defs><linearGradient id="g" x1="0" y1="0" x2="${size}" y2="${size}"><stop stop-color="#3b82f6"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs>
      </svg>`;
      return new Response(svg, {
        headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=604800' },
      });
    }

    // Favicon
    if (url.pathname === '/favicon.ico' || url.pathname === '/favicon.svg') {
      const svg = `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" rx="12" fill="url(#g)"/><path d="M24 8 L38 38 L10 38 Z" stroke="white" stroke-width="2" stroke-linejoin="round" fill="none"/><line x1="28" y1="23" x2="40" y2="17" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/><line x1="29" y1="26" x2="40" y2="26" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/><line x1="28" y1="29" x2="40" y2="35" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/><defs><linearGradient id="g" x1="0" y1="0" x2="48" y2="48"><stop stop-color="#3b82f6"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs></svg>`;
      return new Response(svg, {
        headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=604800' },
      });
    }

    // Auth API (register, login, telegram, logout, me)
    if (url.pathname.startsWith('/api/auth/') || url.pathname === '/api/auth') {
      return handleAuth(request, env, url.pathname);
    }

    // Mini App REST API
    if (url.pathname.startsWith('/api/')) {
      return handleMiniAppAPI(request, env, url.pathname);
    }

    // Setup webhook to point to this worker
    if (url.pathname === '/setup-webhook') {
      try {
        const botApi = `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}`;
        const webhookUrl = url.origin;
        const res = await fetch(`${botApi}/setWebhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: webhookUrl })
        });
        const data = await res.json();
        return new Response(JSON.stringify({ webhook_url: webhookUrl, result: data }, null, 2), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500, headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // One-time setup: configure Menu Button in Telegram
    if (url.pathname === '/setup-webapp') {
      try {
        const webappUrl = `${url.origin}/webapp`;
        const botApi = `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}`;

        // Verify bot token
        const meRes = await fetch(`${botApi}/getMe`);
        const meData = await meRes.json();

        // Set Menu Button to open Mini App (default for all chats)
        const menuRes = await fetch(`${botApi}/setChatMenuButton`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            menu_button: {
              type: 'web_app',
              text: 'Finance App',
              web_app: { url: webappUrl }
            }
          })
        });
        const menuData = await menuRes.json();

        return new Response(JSON.stringify({
          success: true,
          webapp_url: webappUrl,
          bot: meData,
          menu_button_result: menuData,
        }, null, 2), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message, stack: e.stack }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Quick check: is Salt Edge access working?
    if (url.pathname === '/debug/saltedge') {
      try {
        // 1. Check providers for Poland
        const provResp = await fetch('https://www.saltedge.com/api/v6/providers?country_code=PL', {
          headers: {
            'App-id': env.SALTEDGE_APP_ID,
            'Secret': env.SALTEDGE_SECRET,
          }
        });
        const provData = await provResp.json();

        // 2. List existing customers
        const custResp = await fetch('https://www.saltedge.com/api/v6/customers', {
          headers: {
            'App-id': env.SALTEDGE_APP_ID,
            'Secret': env.SALTEDGE_SECRET,
          }
        });
        const custData = await custResp.json();

        const providers = (provData.data || []).map(p => ({
          code: p.code, name: p.name, status: p.status, mode: p.mode
        }));

        // 3. Check fake/sandbox providers
        const fakeResp = await fetch('https://www.saltedge.com/api/v6/providers?country_code=XF', {
          headers: { 'App-id': env.SALTEDGE_APP_ID, 'Secret': env.SALTEDGE_SECRET }
        });
        const fakeData = await fakeResp.json();
        const fakeProviders = (fakeData.data || []).map(p => ({ code: p.code, name: p.name, mode: p.mode }));

        // 4. All providers count
        const allResp = await fetch('https://www.saltedge.com/api/v6/providers', {
          headers: { 'App-id': env.SALTEDGE_APP_ID, 'Secret': env.SALTEDGE_SECRET }
        });
        const allData = await allResp.json();

        return new Response(JSON.stringify({
          access: provResp.status === 200 ? 'OK' : 'DENIED',
          api_status: provResp.status,
          total_providers: (allData.data || []).length,
          poland_providers: providers.length,
          providers_sample: providers.slice(0, 20),
          fake_providers: fakeProviders,
          customers: (custData.data || []).length,
          raw_error: provResp.status !== 200 ? provData : undefined,
        }, null, 2), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500, headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Debug endpoint to test connect session creation
    if (url.pathname === '/debug/session') {
      try {
        // First create a customer
        const identifier = 'test_session_' + Date.now();
        const customerResp = await fetch('https://www.saltedge.com/api/v6/customers', {
          method: 'POST',
          headers: {
            'App-id': env.SALTEDGE_APP_ID,
            'Secret': env.SALTEDGE_SECRET,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ data: { identifier } })
        });
        const customerData = await customerResp.json();
        const customerId = customerData?.data?.customer_id;

        if (!customerId) {
          return new Response(JSON.stringify({ error: 'Failed to create customer', data: customerData }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Now test connect session (v6 uses /connections/connect)
        const sessionResp = await fetch('https://www.saltedge.com/api/v6/connections/connect', {
          method: 'POST',
          headers: {
            'App-id': env.SALTEDGE_APP_ID,
            'Secret': env.SALTEDGE_SECRET,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            data: {
              customer_id: customerId,
              consent: {
                scopes: ['accounts', 'transactions']
              },
              attempt: {
                return_to: `${url.origin}/callback`
              },
              provider_code: 'fakebank_simple_xf'
            }
          })
        });

        const sessionText = await sessionResp.text();
        return new Response(JSON.stringify({
          customerStatus: customerResp.status,
          customerId,
          sessionStatus: sessionResp.status,
          sessionResponse: sessionText.substring(0, 1000)
        }, null, 2), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Debug endpoint to test customer creation
    if (url.pathname === '/debug/customer') {
      try {
        const saltEdgeService = new SaltEdgeService(env.DB, env);
        const identifier = 'test_customer_' + Date.now();

        // Test create customer
        const response = await fetch('https://www.saltedge.com/api/v6/customers', {
          method: 'POST',
          headers: {
            'App-id': env.SALTEDGE_APP_ID,
            'Secret': env.SALTEDGE_SECRET,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ data: { identifier } })
        });

        const text = await response.text();
        return new Response(JSON.stringify({
          status: response.status,
          identifier,
          response: text.substring(0, 1000)
        }, null, 2), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Debug endpoint to test getPolishBanks
    if (url.pathname === '/debug/banks') {
      try {
        const saltEdgeService = new SaltEdgeService(env.DB, env);
        const startTime = Date.now();
        const banks = await saltEdgeService.getPolishBanks();
        const elapsed = Date.now() - startTime;

        return new Response(JSON.stringify({
          elapsed: `${elapsed}ms`,
          count: banks?.length || 0,
          banks: banks?.slice(0, 5).map(b => ({ code: b.code, id: b.id, name: b.name }))
        }, null, 2), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message, stack: e.stack }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Debug endpoint to test Salt Edge API
    if (url.pathname === '/debug/saltedge') {
      try {
        const saltEdgeService = new SaltEdgeService(env.DB, env);
        const startTime = Date.now();

        // Test API call
        const response = await fetch('https://www.saltedge.com/api/v6/providers?country_code=XF', {
          headers: {
            'App-id': env.SALTEDGE_APP_ID || 'missing',
            'Secret': env.SALTEDGE_SECRET || 'missing',
            'Content-Type': 'application/json'
          }
        });

        const elapsed = Date.now() - startTime;
        const text = await response.text();

        return new Response(JSON.stringify({
          status: response.status,
          elapsed: `${elapsed}ms`,
          hasAppId: !!env.SALTEDGE_APP_ID,
          hasSecret: !!env.SALTEDGE_SECRET,
          sandbox: env.SALTEDGE_SANDBOX,
          response: text.substring(0, 500)
        }, null, 2), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Salt Edge callback handler - called after user authorizes bank
    if (url.pathname === '/callback') {
      const userId = url.searchParams.get('user');
      // Salt Edge may send connection_id directly or not - log all params
      const allParams = Object.fromEntries(url.searchParams.entries());
      console.log('Callback received, all params:', JSON.stringify(allParams));

      let updated = false;
      let errorMsg = '';

      if (userId) {
        try {
          // Find the pending connection for this user
          const pending = await env.DB.prepare(`
            SELECT * FROM bank_connections
            WHERE user_id = ? AND status = 'pending'
            ORDER BY created_at DESC LIMIT 1
          `).bind(userId).first();

          console.log('Pending connection:', JSON.stringify(pending));

          if (pending) {
            // Try to get connection_id from URL params (Salt Edge may use different names)
            let realConnectionId = url.searchParams.get('connection_id')
              || url.searchParams.get('id')
              || url.searchParams.get('connectionId');

            // If no connection_id in URL, query Salt Edge API for customer's connections
            if (!realConnectionId && pending.saltedge_customer_id) {
              console.log('No connection_id in URL, querying Salt Edge API...');
              try {
                const resp = await fetch(`https://www.saltedge.com/api/v6/connections?customer_id=${pending.saltedge_customer_id}`, {
                  headers: {
                    'App-id': env.SALTEDGE_APP_ID,
                    'Secret': env.SALTEDGE_SECRET,
                    'Content-Type': 'application/json'
                  }
                });
                const connectionsData = await resp.json();
                console.log('Salt Edge connections:', JSON.stringify(connectionsData).substring(0, 500));

                const connections = connectionsData?.data || [];
                if (connections.length > 0) {
                  // Use the most recent connection
                  const latest = connections[connections.length - 1];
                  realConnectionId = latest.id || latest.connection_id;
                  console.log('Found connection via API:', realConnectionId);
                }
              } catch (apiErr) {
                console.error('Salt Edge API query failed:', apiErr.message);
              }
            }

            if (realConnectionId) {
              await env.DB.prepare(`
                UPDATE bank_connections
                SET requisition_id = ?, status = 'linked', updated_at = datetime('now')
                WHERE id = ?
              `).bind(String(realConnectionId), pending.id).run();
              console.log(`Connection ${pending.id} linked with requisition_id=${realConnectionId}`);
              updated = true;
            } else {
              // Fallback: mark as linked anyway with existing requisition_id
              // The sync will use this to query Salt Edge
              console.log('No connection_id found, marking linked with existing requisition_id');
              await env.DB.prepare(`
                UPDATE bank_connections
                SET status = 'linked', updated_at = datetime('now')
                WHERE id = ?
              `).bind(pending.id).run();
              updated = true;
            }
          } else {
            errorMsg = 'No pending connection found for this user';
            console.log(errorMsg);
          }
        } catch (e) {
          errorMsg = e.message;
          console.error('Callback DB error:', e);
        }
      } else {
        errorMsg = 'No user ID in callback URL';
      }

      const statusHtml = updated
        ? '<h1>&#10003; Банк подключён!</h1><p>Вернись в Telegram и напиши <b>/bank sync</b></p>'
        : `<h1>&#9888; Ошибка</h1><p>${errorMsg || 'Не удалось обновить подключение'}</p><p>Попробуй /bank connect снова</p>`;

      return new Response(`
        <html>
        <head><meta charset="utf-8"><title>Bank Callback</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          ${statusHtml}
          <p><a href="https://t.me/">Открыть Telegram</a></p>
          <p style="color:#888; font-size:12px;">Params: ${JSON.stringify(allParams)}</p>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    if (request.method === 'GET') {
      return new Response('Finance Bot v2.0 is running!');
    }

    if (request.method === 'POST') {
      try {
        const data = await request.json();
        console.log('Received update:', JSON.stringify(data).substring(0, 200));
        console.log('TELEGRAM_TOKEN exists:', !!env.TELEGRAM_TOKEN);
        console.log('DB exists:', !!env.DB);

        // Deduplication via KV
        const updateId = `upd_${data.update_id}`;
        const cached = await env.FINANCE_KV.get(updateId);
        if (cached) {
          console.log('Duplicate update, skipping');
          return new Response('OK');
        }
        await env.FINANCE_KV.put(updateId, 'true', { expirationTtl: 300 });

        // Initialize services
        const userService = new UserService(env.DB);
        const categoryService = new CategoryService(env.DB);
        const transactionService = new TransactionService(env.DB, env.ENCRYPTION_KEY);
        const statsService = new StatsService(transactionService);
        const familyService = new FamilyService(env.DB);
        const exportService = new ExportService(transactionService);
        const budgetService = new BudgetService(env.DB, transactionService);
        const bankImportService = new BankImportService(env.DB, categoryService, transactionService);
        const nordigenService = new NordigenService(env.DB, env);
        const saltEdgeService = new SaltEdgeService(env.DB, env);
        const accountService = new AccountService(env.DB, env.ENCRYPTION_KEY);

        // Use Salt Edge if configured, otherwise fall back to Nordigen
        const openBankingService = env.SALTEDGE_APP_ID ? saltEdgeService : nordigenService;
        const openBankingProvider = env.SALTEDGE_APP_ID ? 'saltedge' : 'nordigen';

        const services = { userService, categoryService, transactionService, statsService, familyService, exportService, budgetService, bankImportService, nordigenService, saltEdgeService, openBankingService, openBankingProvider, accountService };

        if (data.message) {
          console.log('Processing message...');
          await handleMessage(data.message, env, services);
          console.log('Message processed');
        } else if (data.callback_query) {
          console.log('Processing callback...');
          await handleCallback(data.callback_query, env, services);
          console.log('Callback processed');
        }
      } catch (error) {
        console.error('ERROR:', error.message);
        console.error('STACK:', error.stack);
      }

      return new Response('OK');
    }

    return new Response('Method not allowed', { status: 405 });
  },

  // Scheduled handler for cron triggers
  async scheduled(event, env, ctx) {
    console.log('Cron triggered:', event.cron);

    const userService = new UserService(env.DB);
    const transactionService = new TransactionService(env.DB, env.ENCRYPTION_KEY);
    const statsService = new StatsService(transactionService);
    const categoryService = new CategoryService(env.DB);
    const nordigenService = new NordigenService(env.DB, env);
    const saltEdgeService = new SaltEdgeService(env.DB, env);

    // Use Salt Edge if configured, otherwise Nordigen
    const openBankingService = env.SALTEDGE_APP_ID ? saltEdgeService : nordigenService;
    const openBankingProvider = env.SALTEDGE_APP_ID ? 'saltedge' : 'nordigen';

    // Daily reminder at 21:00 (20:00 UTC)
    if (event.cron === '0 20 * * *') {
      await sendDailyReminders(env, userService);
    }

    // Monthly report on 1st at 10:00 (09:00 UTC)
    if (event.cron === '0 9 1 * *') {
      await sendMonthlyReports(env, userService, statsService);
    }

    // Bank sync every 6 hours (at 00:00, 06:00, 12:00, 18:00 UTC)
    if (event.cron === '0 */6 * * *') {
      await syncAllBankConnections(env, openBankingService, categoryService, openBankingProvider);
    }
  }
};

// ============================================
// MESSAGE HANDLER
// ============================================

async function handleMessage(message, env, services) {
  const chatId = message.chat.id;
  const telegramId = message.from.id.toString();
  const text = message.text || '';
  const textLower = text.toLowerCase().trim();

  const { userService, categoryService, transactionService, statsService } = services;

  // Get or create user
  const displayName = message.from.first_name || message.from.username || 'User';
  const username = message.from.username || null;
  const user = await userService.findOrCreate(telegramId, displayName, username);

  // Get active family (if any)
  const familyId = await userService.getActiveFamily(telegramId);

  // Command routing
  if (textLower === '/start') {
    await handleStart(chatId, user, env, services);
    return;
  }

  if (textLower === '/language') {
    const languages = getLanguages();
    const buttons = languages.map(l => [button(`${l.flag} ${l.name}`, `lang_${l.code}`)]);
    await sendMessage(chatId, '🌍 <b>Select language / Выбери язык:</b>', env, { reply_markup: inlineKeyboard(buttons) });
    return;
  }

  if (textLower === '/help') {
    await handleHelp(chatId, env);
    return;
  }

  if (textLower === '/menu') {
    await handleMenu(chatId, user, env);
    return;
  }

  if (textLower.startsWith('/income')) {
    await handleIncome(chatId, user, text, familyId, env, services);
    return;
  }

  if (textLower.startsWith('/stats')) {
    await handleStats(chatId, user, text, familyId, env, services);
    return;
  }

  if (textLower === '/balance') {
    await handleBalance(chatId, user, familyId, env, services);
    return;
  }

  if (textLower.startsWith('/history')) {
    await handleHistory(chatId, user, text, familyId, env, services);
    return;
  }

  if (textLower === '/undo') {
    await handleUndo(chatId, user, env, services);
    return;
  }

  if (textLower === '/categories') {
    await handleCategoryCommand(chatId, user, '/cat', env, services);
    return;
  }

  if (textLower.startsWith('/family')) {
    await handleFamily(chatId, user, text, env, services);
    return;
  }

  if (textLower.startsWith('/export')) {
    await handleExport(chatId, user, text, familyId, env, services);
    return;
  }

  if (textLower === '/trend') {
    await handleTrend(chatId, user, familyId, env, services);
    return;
  }

  if (textLower === '/notifications' || textLower === '/settings') {
    await handleNotifications(chatId, user, env, services);
    return;
  }

  if (textLower === '/currency') {
    await handleCurrency(chatId, user, env, services);
    return;
  }

  if (textLower === '/budgets') {
    await handleBudgets(chatId, user, familyId, env, services);
    return;
  }

  if (textLower.startsWith('/budget')) {
    await handleBudget(chatId, user, text, familyId, env, services);
    return;
  }

  if (textLower.startsWith('/import')) {
    await handleImportCommand(chatId, user, text, familyId, env, services);
    return;
  }

  if (textLower.startsWith('/bank')) {
    await handleBankCommand(chatId, user, text, familyId, env, services);
    return;
  }

  if (textLower === '/diag') {
    await handleDiag(chatId, user, familyId, env, services);
    return;
  }

  if (textLower.startsWith('/cat')) {
    await handleCategoryCommand(chatId, user, text, env, services);
    return;
  }

  // Handle document (CSV file)
  if (message.document) {
    await handleDocument(chatId, user, message.document, familyId, env, services);
    return;
  }

  // Check for pending category rename
  if (text && !text.startsWith('/')) {
    const renameData = await env.FINANCE_KV.get(`rename_${user.id}`);
    if (renameData) {
      const { categoryId } = JSON.parse(renameData);
      const { categoryService } = services;
      const newName = text.trim();

      if (newName.length < 2) {
        await sendMessage(chatId, `❌ Название должно быть минимум 2 символа`, env);
        return;
      }

      const result = await categoryService.renameCategory(categoryId, user.id, newName);
      await env.FINANCE_KV.delete(`rename_${user.id}`);

      if (result.success) {
        await sendMessage(chatId, `✅ Категория переименована: ${result.emoji} <b>${newName}</b>`, env);
      } else {
        await sendMessage(chatId, `❌ ${result.error}`, env);
      }
      return;
    }
  }

  // Handle /cancel for rename
  if (textLower === '/cancel') {
    await env.FINANCE_KV.delete(`rename_${user.id}`);
    await sendMessage(chatId, `👌 Отменено`, env);
    return;
  }

  // Check for + prefix → income (e.g. "+100 salary")
  if (text.trim().startsWith('+')) {
    const incomeText = '/income ' + text.trim().slice(1).trim();
    await handleIncome(chatId, user, incomeText, familyId, env, services);
    return;
  }

  // Default: try to parse as expense
  await handleExpense(chatId, user, text, familyId, env, services);
}

// ============================================
// COMMAND HANDLERS
// ============================================

async function handleStart(chatId, user, env, services) {
  // Check if user already has language set (not first time)
  if (user.language) {
    // Return welcome in user's language
    await showWelcome(chatId, user, env);
    return;
  }

  // First time - show language selection
  const languages = getLanguages();
  const buttons = languages.map(l => [button(`${l.flag} ${l.name}`, `lang_${l.code}`)]);

  const message = `🌍 <b>Select language / Выбери язык:</b>`;
  await sendMessage(chatId, message, env, { reply_markup: inlineKeyboard(buttons) });
}

async function showWelcome(chatId, user, env) {
  const t = getTranslations(user.language || 'en');

  const message = `👋 ${t.welcome}, <b>${user.display_name}</b>!

${t.welcomeText}

<b>${t.howToAddExpense}</b>
<code>${t.expenseFormat}</code>
${t.errorExample} <code>${t.expenseExample}</code>

<b>${t.commands}</b>
/stats - ${t.statsTitle}
/balance - ${t.balanceTitle}
/income 3400 - ${t.recordedIncome}
/history - ${t.lastTransactions} ${t.transactionsWord}
/language - 🌍
/help - ${t.helpTitle}

💡 ${t.selectCategory}!

<i>Powered by Alar ▲</i>`;

  await sendMessage(chatId, message, env);
}

async function handleHelp(chatId, env) {
  const message = `📚 <b>Команды бота:</b>

<b>Расходы:</b>
• <code>50 продукты</code> - добавить расход
• <code>150</code> - добавить с выбором категории

<b>Доходы:</b>
• <code>/income 3400 зарплата</code>

<b>Статистика:</b>
• /stats - за текущий месяц
• /stats январь - за конкретный месяц
• /balance - баланс месяца
• /trend - тренд за 6 месяцев
• /history - последние 10 транзакций

<b>Управление:</b>
• /menu - главное меню с кнопками
• /undo - отменить последнюю запись
• /cat - категории (добавить/удалить/переименовать)
• /export - скачать Excel файл
• /import - импорт из банка (CSV)
• /bank - подключить банк (Open Banking)
• /bank last - последние банковские транзакции
• /bank wipe - удалить банковские транзакции
• /diag - диагностика данных
• /notifications - настройки уведомлений
• /currency - сменить валюту
• /budget продукты 2000 - установить бюджет
• /budgets - показать бюджеты

<b>Семейный аккаунт:</b>
• /family - меню семьи
• /family create Имя - создать
• /family invite - пригласить
• /family join КОД - присоединиться
• /family switch - переключить аккаунт

<b>Категории расходов:</b>
🛒 продукты, 🍽 заведения, 🚕 транспорт
🏠 квартира, 📺 регулярные, 👕 шоппинг
💅 красота, 🏋️ спорт, ✈️ путешествия
🏡 дом, 📦 другое

<i>Powered by Alar ▲</i>`;

  await sendMessage(chatId, message, env);
}

async function handleMenu(chatId, user, env) {
  const keyboard = inlineKeyboard([
    buttonRow(
      button('📊 Статистика', 'menu:stats'),
      button('💰 Баланс', 'menu:balance')
    ),
    buttonRow(
      button('📋 История', 'menu:history'),
      button('📈 Тренд', 'menu:trend')
    ),
    buttonRow(
      button('📂 Категории', 'menu:categories'),
      button('📁 Экспорт', 'menu:export')
    ),
    buttonRow(
      button('🏦 Банк', 'menu:bank'),
      button('📥 Импорт CSV', 'menu:import')
    ),
    buttonRow(
      button('💵 Валюта', 'menu:currency'),
      button('🔔 Уведомления', 'menu:notifications')
    ),
    buttonRow(
      button('👨‍👩‍👧 Семья', 'menu:family'),
      button('📖 Помощь', 'menu:help')
    )
  ]);

  await sendMessage(chatId,
    `📱 <b>Главное меню</b>\n\nВыбери действие:`,
    env,
    { reply_markup: keyboard }
  );
}

// Currency symbol mapping
const CURRENCY_SYMBOLS = {
  '$': 'USD', '€': 'EUR', '£': 'GBP', 'zł': 'PLN', 'zl': 'PLN',
  '₴': 'UAH', 'Kč': 'CZK', 'kč': 'CZK', 'kr': 'NOK', 'Fr': 'CHF',
  'fr': 'CHF', '¥': 'JPY', '₽': 'RUB',
};

// Fetch exchange rate with 1h KV cache
async function convertCurrency(amount, fromCurrency, toCurrency, env) {
  if (fromCurrency === toCurrency) return { converted: amount, rate: 1 };

  const cacheKey = `rate_${fromCurrency}_${toCurrency}`;
  const cached = await env.FINANCE_KV.get(cacheKey);
  if (cached) {
    const rate = parseFloat(cached);
    return { converted: +(amount * rate).toFixed(2), rate };
  }

  try {
    const resp = await fetch(`https://api.exchangerate.host/convert?from=${fromCurrency}&to=${toCurrency}&amount=1`);
    const data = await resp.json();
    if (data.success !== false && data.result) {
      const rate = data.result;
      await env.FINANCE_KV.put(cacheKey, rate.toString(), { expirationTtl: 3600 });
      return { converted: +(amount * rate).toFixed(2), rate };
    }
  } catch (e) { console.log('Exchange rate error:', e.message); }

  // Fallback: try open API
  try {
    const resp = await fetch(`https://open.er-api.com/v6/latest/${fromCurrency}`);
    const data = await resp.json();
    if (data.rates && data.rates[toCurrency]) {
      const rate = data.rates[toCurrency];
      await env.FINANCE_KV.put(cacheKey, rate.toString(), { expirationTtl: 3600 });
      return { converted: +(amount * rate).toFixed(2), rate };
    }
  } catch (e) { console.log('Fallback rate error:', e.message); }

  return null;
}

// Parse amount with optional currency symbol: "100$", "$100", "50€", "200zł"
function parseAmountWithCurrency(text) {
  const trimmed = text.trim();

  // Try symbol before number: $100, €50
  for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (trimmed.startsWith(symbol)) {
      const rest = trimmed.slice(symbol.length).trim();
      const numMatch = rest.match(/^(\d+(?:[.,]\d+)?)(.*)/);
      if (numMatch) {
        return { amount: parseFloat(numMatch[1].replace(',', '.')), sourceCurrency: code, rest: numMatch[2].trim() };
      }
    }
  }

  // Try number then symbol: 100$, 50€, 200zł
  const numFirst = trimmed.match(/^(\d+(?:[.,]\d+)?)\s*(.+)/);
  if (numFirst) {
    const amount = parseFloat(numFirst[1].replace(',', '.'));
    const afterNum = numFirst[2].trim();
    for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
      if (afterNum.startsWith(symbol)) {
        const rest = afterNum.slice(symbol.length).trim();
        return { amount, sourceCurrency: code, rest };
      }
    }
    // Also check 3-letter code: 100 USD, 50 EUR
    const codeMatch = afterNum.match(/^(USD|EUR|GBP|PLN|UAH|CZK|NOK|CHF|JPY|RUB)\b\s*(.*)/i);
    if (codeMatch) {
      return { amount, sourceCurrency: codeMatch[1].toUpperCase(), rest: codeMatch[2].trim() };
    }
  }

  return null; // no currency detected
}

async function handleExpense(chatId, user, text, familyId, env, services) {
  const { categoryService, transactionService, statsService, budgetService } = services;
  const t = getTranslations(user.language || 'en');
  const currency = user.currency || 'USD';

  // Try to parse with currency symbol first
  let amount, categoryInput, description, conversionNote = '';
  const currencyParsed = parseAmountWithCurrency(text);

  if (currencyParsed && currencyParsed.sourceCurrency !== currency) {
    // Foreign currency detected — convert
    const conversion = await convertCurrency(currencyParsed.amount, currencyParsed.sourceCurrency, currency, env);
    if (conversion) {
      amount = conversion.converted;
      conversionNote = `\n💱 ${currencyParsed.amount} ${currencyParsed.sourceCurrency} → ${amount} ${currency} (${conversion.rate.toFixed(4)})`;
      const restParts = currencyParsed.rest.match(/^(\S+)?\s*(.*)$/);
      categoryInput = restParts?.[1] || '';
      description = restParts?.[2] || '';
    } else {
      await sendMessage(chatId, `❌ Could not convert ${currencyParsed.sourceCurrency} → ${currency}. Try again later.`, env);
      return;
    }
  } else if (currencyParsed && currencyParsed.sourceCurrency === currency) {
    // Same currency, just strip the symbol
    amount = currencyParsed.amount;
    const restParts = currencyParsed.rest.match(/^(\S+)?\s*(.*)$/);
    categoryInput = restParts?.[1] || '';
    description = restParts?.[2] || '';
  } else {
    // Parse: amount [category] [description]
    const match = text.match(/^(\d+(?:[.,]\d+)?)\s*(\S+)?\s*(.*)$/);

    if (!match) {
      await sendMessage(chatId, `❌ ${t.errorFormat} <code>${t.expenseFormat}</code>\n${t.errorExample} <code>${t.expenseExample}</code>`, env);
      return;
    }

    amount = parseFloat(match[1].replace(',', '.'));
    categoryInput = match[2] || '';
    description = match[3] || '';
  }

  // Try to detect category
  const category = await categoryService.detectCategory(categoryInput, 'expense', user.id);

  if (!category) {
    // Show category selection keyboard
    const keyboard = await categoryService.buildCategoryKeyboard(amount, description || categoryInput, 'expense', user.id);
    await sendMessage(
      chatId,
      `💰 ${t.amount}: <b>${amount.toFixed(2)} ${currency}</b>\n📂 ${t.selectCategory}:`,
      env,
      { reply_markup: keyboard }
    );
    return;
  }

  // Save expense
  await transactionService.createExpense(user.id, category.id, amount, description || categoryInput, familyId);
  const monthTotal = await transactionService.getCategoryTotal(user.id, category.id, new Date(), familyId);

  let message = statsService.generateExpenseConfirmation(amount, category, monthTotal, description, user.language, currency);
  if (conversionNote) message += conversionNote;

  // Check budget warning
  const budgetWarning = await budgetService.checkBudgetWarning(user.id, category.id, familyId);
  if (budgetWarning) {
    if (budgetWarning.type === 'over') {
      message += `\n\n🔴 <b>${t.budgetExceeded}!</b>\n`;
      message += `${category.emoji} ${category.name}: ${budgetWarning.spent.toFixed(0)}/${budgetWarning.budget.toFixed(0)} ${currency}`;
      message += `\n⚠️ ${t.overBudgetBy}: ${Math.abs(budgetWarning.remaining).toFixed(0)} ${currency}`;
    } else if (budgetWarning.type === 'warning') {
      message += `\n\n🟡 <b>${t.budgetWarning}!</b>\n`;
      message += `${category.emoji} ${category.name}: ${budgetWarning.spent.toFixed(0)}/${budgetWarning.budget.toFixed(0)} ${currency} (${budgetWarning.percentUsed.toFixed(0)}%)`;
    }
  }

  const keyboard = inlineKeyboard([
    buttonRow(
      button(t.btnCancel, `undo:${user.id}`),
      button(t.btnStats, 'stats')
    )
  ]);

  await sendMessage(chatId, message, env, { reply_markup: keyboard });
}

async function handleIncome(chatId, user, text, familyId, env, services) {
  const { categoryService, transactionService, statsService } = services;
  const t = getTranslations(user.language || 'en');
  const userCurrency = user.currency || 'USD';

  const match = text.match(/\/income\s+(.+)/i);

  if (!match) {
    await sendMessage(chatId, `❌ ${t.errorFormat} <code>/income ${t.amount} ${t.description}</code>\n${t.errorExample} <code>/income 3400 salary</code>`, env);
    return;
  }

  let amount, description, conversionNote = '';
  const incomeBody = match[1].trim();
  const currencyParsed = parseAmountWithCurrency(incomeBody);

  if (currencyParsed && currencyParsed.sourceCurrency !== userCurrency) {
    const conversion = await convertCurrency(currencyParsed.amount, currencyParsed.sourceCurrency, userCurrency, env);
    if (conversion) {
      amount = conversion.converted;
      conversionNote = `\n💱 ${currencyParsed.amount} ${currencyParsed.sourceCurrency} → ${amount} ${userCurrency} (${conversion.rate.toFixed(4)})`;
      description = currencyParsed.rest || t.income;
    } else {
      await sendMessage(chatId, `❌ Could not convert ${currencyParsed.sourceCurrency} → ${userCurrency}. Try again later.`, env);
      return;
    }
  } else if (currencyParsed) {
    amount = currencyParsed.amount;
    description = currencyParsed.rest || t.income;
  } else {
    const numMatch = incomeBody.match(/^(\d+(?:[.,]\d+)?)\s*(.*)/);
    if (!numMatch) {
      await sendMessage(chatId, `❌ ${t.errorFormat} <code>/income ${t.amount} ${t.description}</code>\n${t.errorExample} <code>/income 3400 salary</code>`, env);
      return;
    }
    amount = parseFloat(numMatch[1].replace(',', '.'));
    description = numMatch[2] || t.income;
  }

  // Find or use default income category
  let category = await categoryService.detectCategory(description, 'income');
  if (!category) {
    const incomeCategories = await categoryService.getIncomeCategories();
    category = incomeCategories.find(c => c.name === 'Другое') || incomeCategories[0];
  }

  await transactionService.createIncome(user.id, category.id, amount, description, familyId);
  const monthTotal = await transactionService.getMonthTotal(user.id, 'income', new Date(), familyId);

  let message = statsService.generateIncomeConfirmation(amount, monthTotal, description, user.language, userCurrency);
  if (conversionNote) message += conversionNote;
  await sendMessage(chatId, message, env);
}

async function handleStats(chatId, user, text, familyId, env, services) {
  const { statsService } = services;
  const t = getTranslations(user.language || 'en');

  // Parse month from command
  let date = new Date();
  const monthMatch = text.match(/\/stats\s+(\S+)/i);
  if (monthMatch) {
    const parsedDate = parseMonth(monthMatch[1]);
    if (parsedDate) {
      date = parsedDate;
    }
  }

  const message = await statsService.generateMonthlyStats(user.id, date, familyId, null, user.language, user.currency);

  const keyboard = inlineKeyboard([
    buttonRow(
      button(t.btnTrend, 'trend'),
      button(t.btnExport, 'export')
    )
  ]);

  await sendMessage(chatId, message, env, { reply_markup: keyboard });
}

async function handleTrend(chatId, user, familyId, env, services) {
  const { statsService } = services;
  const t = getTranslations(user.language || 'en');
  const message = await statsService.generateTrendReport(user.id, familyId, user.language, user.currency);

  const keyboard = inlineKeyboard([
    buttonRow(
      button(t.btnStats, 'stats'),
      button(t.btnExport, 'export')
    )
  ]);

  await sendMessage(chatId, message, env, { reply_markup: keyboard });
}

async function handleBalance(chatId, user, familyId, env, services) {
  const { statsService } = services;
  const message = await statsService.generateBalance(user.id, new Date(), familyId, user.language, user.currency);
  await sendMessage(chatId, message, env);
}

async function handleHistory(chatId, user, text, familyId, env, services) {
  const { statsService } = services;

  let limit = 10;
  const limitMatch = text.match(/\/history\s+(\d+)/i);
  if (limitMatch) {
    limit = Math.min(parseInt(limitMatch[1]), 50);
  }

  const message = await statsService.generateHistory(user.id, limit, familyId, user.language, user.currency);
  await sendMessage(chatId, message, env);
}

async function handleUndo(chatId, user, env, services) {
  const { transactionService, accountService } = services;
  const currency = user.currency || 'USD';

  // Scope undo to active account (null = Personal)
  const accountId = accountService ? await accountService.getActiveAccountId(user.telegram_id) : null;
  const lastTransaction = await transactionService.getLastTransaction(user.id, accountId);

  if (!lastTransaction) {
    await sendMessage(chatId, '📭 Нет транзакций для отмены', env);
    return;
  }

  await transactionService.delete(lastTransaction.id, user.id);

  const typeEmoji = lastTransaction.type === 'expense' ? '📉' : '📈';
  const catEmoji = lastTransaction.category_emoji || '❓';
  const catName = lastTransaction.category_name || 'Без категории';
  let msg = `✅ Отменено: ${typeEmoji} ${lastTransaction.amount.toFixed(2)} ${currency} → ${catEmoji} ${catName}`;
  if (lastTransaction.description) {
    msg += `\n📝 <i>${lastTransaction.description}</i>`;
  }
  if (lastTransaction.source && lastTransaction.source !== 'manual') {
    const srcLabel = lastTransaction.source === 'saltedge' ? 'Open Banking' : 'CSV';
    msg += `\n🏦 Источник: ${srcLabel}`;
  }
  await sendMessage(chatId, msg, env);
}

async function handleCategories(chatId, env, services) {
  const { categoryService } = services;

  const expenseCategories = await categoryService.getExpenseCategories();
  const incomeCategories = await categoryService.getIncomeCategories();

  let message = '📂 <b>Категории расходов:</b>\n';
  for (const cat of expenseCategories) {
    const keywords = cat.keywords ? JSON.parse(cat.keywords).slice(0, 3).join(', ') : '';
    message += `${cat.emoji} ${cat.name} <i>(${keywords})</i>\n`;
  }

  message += '\n💰 <b>Категории доходов:</b>\n';
  for (const cat of incomeCategories) {
    message += `${cat.emoji} ${cat.name}\n`;
  }

  await sendMessage(chatId, message, env);
}

// ============================================
// EXPORT HANDLER
// ============================================

async function handleExport(chatId, user, text, familyId, env, services) {
  const { exportService, familyService } = services;
  const t = getTranslations(user.language || 'en');

  // Parse month from command
  let date = new Date();
  const monthMatch = text.match(/\/export\s+(\S+)/i);
  if (monthMatch && monthMatch[1].toLowerCase() !== 'all') {
    const parsedDate = parseMonth(monthMatch[1]);
    if (parsedDate) {
      date = parsedDate;
    }
  }

  // Get family name if active
  let familyName = null;
  if (familyId) {
    const family = await familyService.findById(familyId);
    familyName = family?.name;
  }

  // Get export info
  const info = await exportService.getExportInfo(user.id, date, familyId, user.language);

  if (info.count === 0) {
    await sendMessage(chatId, `📭 ${t.noData} ${info.month} ${info.year}`, env);
    return;
  }

  await sendMessage(chatId, `⏳ ${t.generating}`, env);

  try {
    // Generate Excel XML
    const excelContent = await exportService.generateExcelXML(user.id, date, familyId, familyName, user.language);

    // Convert to buffer
    const encoder = new TextEncoder();
    const buffer = encoder.encode(excelContent);

    // Generate filename
    const monthLower = info.month.toLowerCase().replace(/[^a-z0-9]/g, '');
    const filename = `finance_${monthLower}_${info.year}.xls`;

    // Build caption
    let caption = `📊 <b>${t.exportTitle} ${info.month} ${info.year}</b>\n\n`;
    if (familyName) {
      caption += `👨‍👩‍👧 ${familyName}\n`;
    }
    caption += `📝 ${info.count} ${t.transactionsWord}\n`;
    const currency = user.currency || 'USD';
    caption += `📉 ${t.expenses}: ${info.expenses.toFixed(2)} ${currency}\n`;
    caption += `📈 ${t.income}: ${info.income.toFixed(2)} ${currency}`;

    // Send document
    await sendDocument(chatId, buffer, filename, caption, env);

  } catch (error) {
    console.error('Export error:', error);
    await sendMessage(chatId, `❌ ${t.exportError}`, env);
  }
}

// ============================================
// FAMILY HANDLER
// ============================================

async function handleFamily(chatId, user, text, env, services) {
  const { familyService, userService } = services;
  const textLower = text.toLowerCase().trim();

  // /family - show menu
  if (textLower === '/family') {
    const families = await familyService.getUserFamilies(user.id);
    const activeFamily = await userService.getActiveFamily(user.telegram_id);

    let message = '👨‍👩‍👧 <b>Семейный аккаунт</b>\n\n';

    if (families.length === 0) {
      message += 'У тебя нет семейных аккаунтов.\n\n';
      message += 'Создай семью, чтобы вести общий бюджет с партнёром:\n';
      message += '<code>/family create Название</code>';
    } else {
      message += '<b>Твои семьи:</b>\n';
      for (const f of families) {
        const isActive = f.id === activeFamily;
        const memberCount = await familyService.getMemberCount(f.id);
        message += `${isActive ? '✅' : '👥'} ${f.name} (${memberCount} чел.)${isActive ? ' - активна' : ''}\n`;
      }
      message += '\n<b>Команды:</b>\n';
      message += '/family create Название - создать\n';
      message += '/family invite - пригласить\n';
      message += '/family join КОД - присоединиться\n';
      message += '/family switch - переключить\n';
      message += '/family members - участники';
    }

    const keyboard = families.length === 0
      ? inlineKeyboard([buttonRow(button('➕ Создать семью', 'family_create_prompt'))])
      : inlineKeyboard([
          buttonRow(button('📨 Пригласить', 'family_invite'), button('🔀 Переключить', 'family_switch'))
        ]);

    await sendMessage(chatId, message, env, { reply_markup: keyboard });
    return;
  }

  // /family create <name>
  const createMatch = text.match(/\/family\s+create\s+(.+)/i);
  if (createMatch) {
    const name = createMatch[1].trim();
    if (name.length < 2 || name.length > 30) {
      await sendMessage(chatId, '❌ Название должно быть от 2 до 30 символов', env);
      return;
    }

    const family = await familyService.create(name, user.id);
    await userService.setActiveFamily(user.telegram_id, family.id);

    await sendMessage(
      chatId,
      `✅ Семья "<b>${name}</b>" создана!\n\nТы - владелец. Теперь можешь пригласить партнёра командой /family invite`,
      env,
      { reply_markup: inlineKeyboard([buttonRow(button('📨 Пригласить', 'family_invite'))]) }
    );
    return;
  }

  // /family invite
  if (textLower === '/family invite') {
    const activeFamily = await userService.getActiveFamily(user.telegram_id);
    if (!activeFamily) {
      await sendMessage(chatId, '❌ Сначала создай или выбери семью: /family', env);
      return;
    }

    const family = await familyService.findById(activeFamily);
    const code = await familyService.generateInvite(activeFamily);

    await sendMessage(
      chatId,
      `🔑 <b>Код приглашения:</b> <code>${code}</code>\n\n` +
      `Семья: ${family.name}\n` +
      `⏰ Код действует 24 часа\n\n` +
      `Отправь этот код партнёру. Он должен написать:\n` +
      `<code>/family join ${code}</code>`,
      env
    );
    return;
  }

  // /family join <code>
  const joinMatch = text.match(/\/family\s+join\s+(\S+)/i);
  if (joinMatch) {
    const code = joinMatch[1].toUpperCase();
    const result = await familyService.joinByCode(code, user.id);

    if (!result.success) {
      await sendMessage(chatId, `❌ ${result.error}`, env);
      return;
    }

    await userService.setActiveFamily(user.telegram_id, result.family.id);

    // Notify owner
    const members = await familyService.getMembers(result.family.id);
    const owner = members.find(m => m.role === 'owner');

    await sendMessage(
      chatId,
      `✅ Ты присоединился к семье "<b>${result.family.name}</b>"!\n\n` +
      `👤 Владелец: ${owner?.display_name || 'Unknown'}\n` +
      `👥 Участников: ${members.length}\n\n` +
      `Теперь все траты идут в общий бюджет.`,
      env
    );
    return;
  }

  // /family switch
  if (textLower === '/family switch') {
    const families = await familyService.getUserFamilies(user.id);
    const activeFamily = await userService.getActiveFamily(user.telegram_id);

    if (families.length === 0) {
      await sendMessage(chatId, '❌ У тебя нет семейных аккаунтов. Создай: /family create Название', env);
      return;
    }

    const buttons = [
      [button(`👤 Личный аккаунт${!activeFamily ? ' ✓' : ''}`, 'family_switch_personal')]
    ];

    for (const f of families) {
      const isActive = f.id === activeFamily;
      buttons.push([button(`👨‍👩‍👧 ${f.name}${isActive ? ' ✓' : ''}`, `family_switch_${f.id}`)]);
    }

    await sendMessage(
      chatId,
      '🔀 <b>Выбери активный аккаунт:</b>\n\nВсе новые траты будут записываться в выбранный аккаунт.',
      env,
      { reply_markup: inlineKeyboard(buttons) }
    );
    return;
  }

  // /family members
  if (textLower === '/family members') {
    const activeFamily = await userService.getActiveFamily(user.telegram_id);
    if (!activeFamily) {
      await sendMessage(chatId, '❌ Сначала выбери семью: /family switch', env);
      return;
    }

    const family = await familyService.findById(activeFamily);
    const members = await familyService.getMembers(activeFamily);

    let message = `👥 <b>Участники семьи "${family.name}":</b>\n\n`;
    for (const m of members) {
      const roleEmoji = m.role === 'owner' ? '👑' : '👤';
      message += `${roleEmoji} ${m.display_name} (${m.role})\n`;
    }

    await sendMessage(chatId, message, env);
    return;
  }

  // /family leave
  if (textLower === '/family leave') {
    const activeFamily = await userService.getActiveFamily(user.telegram_id);
    if (!activeFamily) {
      await sendMessage(chatId, '❌ Ты не в семье', env);
      return;
    }

    const result = await familyService.leave(activeFamily, user.id);
    if (!result.success) {
      await sendMessage(chatId, `❌ ${result.error}`, env);
      return;
    }

    await userService.setActiveFamily(user.telegram_id, null);
    await sendMessage(chatId, '✅ Ты покинул семью', env);
    return;
  }

  // Unknown family command
  await sendMessage(chatId, '❌ Неизвестная команда. Напиши /family для списка команд.', env);
}

// ============================================
// CALLBACK HANDLER
// ============================================

async function handleCallback(callback, env, services) {
  const chatId = callback.message.chat.id;
  const messageId = callback.message.message_id;
  const telegramId = callback.from.id.toString();
  const data = callback.data;

  const { userService, categoryService, transactionService, statsService, familyService, exportService, accountService } = services;

  const user = await userService.findByTelegramId(telegramId);
  if (!user) {
    await answerCallback(callback.id, env, 'Ошибка: пользователь не найден');
    return;
  }

  const familyId = await userService.getActiveFamily(telegramId);

  // Handle category selection: cat:amount:categoryId:description
  if (data.startsWith('cat:')) {
    const parts = data.split(':');
    const amount = parseFloat(parts[1]);
    const categoryId = parseInt(parts[2]);
    const description = parts[3] || '';

    const category = await categoryService.findById(categoryId);
    if (!category) {
      await answerCallback(callback.id, env, 'Категория не найдена');
      return;
    }

    await transactionService.createExpense(user.id, categoryId, amount, description, familyId);
    const monthTotal = await transactionService.getCategoryTotal(user.id, categoryId, new Date(), familyId);

    const message = statsService.generateExpenseConfirmation(amount, category, monthTotal, description, user.language, user.currency);
    await editMessage(chatId, messageId, message, env);
    await answerCallback(callback.id, env);
    return;
  }

  // Handle undo
  if (data.startsWith('undo:')) {
    const undoAccountId = accountService ? await accountService.getActiveAccountId(user.telegram_id) : null;
    const lastTransaction = await transactionService.getLastTransaction(user.id, undoAccountId);
    if (lastTransaction) {
      const currency = user.currency || 'USD';
      await transactionService.delete(lastTransaction.id, user.id);
      const catEmoji = lastTransaction.category_emoji || '❓';
      const catName = lastTransaction.category_name || 'Без категории';
      let msg = `✅ Отменено: ${lastTransaction.amount.toFixed(2)} ${currency} → ${catEmoji} ${catName}`;
      if (lastTransaction.description) {
        msg += `\n📝 <i>${lastTransaction.description}</i>`;
      }
      await editMessage(chatId, messageId, msg, env);
    }
    await answerCallback(callback.id, env);
    return;
  }

  // Handle stats button
  if (data === 'stats') {
    const t = getTranslations(user.language || 'en');
    const message = await statsService.generateMonthlyStats(user.id, new Date(), familyId, null, user.language, user.currency);
    const keyboard = inlineKeyboard([
      buttonRow(
        button(t.btnTrend, 'trend'),
        button(t.btnExport, 'export')
      )
    ]);
    await sendMessage(chatId, message, env, { reply_markup: keyboard });
    await answerCallback(callback.id, env);
    return;
  }

  // Handle trend button
  if (data === 'trend') {
    const t = getTranslations(user.language || 'en');
    const message = await statsService.generateTrendReport(user.id, familyId, user.language, user.currency);
    const keyboard = inlineKeyboard([
      buttonRow(
        button(t.btnStats, 'stats'),
        button(t.btnExport, 'export')
      )
    ]);
    await sendMessage(chatId, message, env, { reply_markup: keyboard });
    await answerCallback(callback.id, env);
    return;
  }

  // Handle language selection
  if (data.startsWith('lang_')) {
    const lang = data.replace('lang_', '');
    await userService.updateLanguage(user.id, lang);
    const t = getTranslations(lang);
    await editMessage(chatId, messageId, `✅ ${t.languageSet}`, env);

    // Show welcome after language selection
    const updatedUser = { ...user, language: lang };
    await showWelcome(chatId, updatedUser, env);
    await answerCallback(callback.id, env);
    return;
  }

  // Handle family switch to personal
  if (data === 'family_switch_personal') {
    await userService.setActiveFamily(telegramId, null);
    await editMessage(chatId, messageId, '✅ Переключился на <b>личный аккаунт</b>\n\nТеперь траты записываются только для тебя.', env);
    await answerCallback(callback.id, env);
    return;
  }

  // Handle family switch to specific family
  if (data.startsWith('family_switch_')) {
    const switchFamilyId = parseInt(data.replace('family_switch_', ''));
    const family = await familyService.findById(switchFamilyId);
    if (family) {
      await userService.setActiveFamily(telegramId, switchFamilyId);
      await editMessage(chatId, messageId, `✅ Переключился на семью "<b>${family.name}</b>"\n\nТеперь траты записываются в общий бюджет.`, env);
    }
    await answerCallback(callback.id, env);
    return;
  }

  // Handle export button
  if (data === 'export') {
    const t = getTranslations(user.language || 'en');
    await sendMessage(chatId, `⏳ ${t.generating}`, env);
    const info = await exportService.getExportInfo(user.id, new Date(), familyId, user.language);

    if (info.count === 0) {
      await sendMessage(chatId, `📭 ${t.noData} ${info.month} ${info.year}`, env);
      await answerCallback(callback.id, env);
      return;
    }

    try {
      let familyName = null;
      if (familyId) {
        const family = await familyService.findById(familyId);
        familyName = family?.name;
      }

      const excelContent = await exportService.generateExcelXML(user.id, new Date(), familyId, familyName, user.language);
      const encoder = new TextEncoder();
      const buffer = encoder.encode(excelContent);

      const monthLower = info.month.toLowerCase().replace(/[^a-z0-9]/g, '');
      const filename = `finance_${monthLower}_${info.year}.xls`;

      let caption = `📊 <b>${t.exportTitle} ${info.month} ${info.year}</b>\n`;
      if (familyName) caption += `👨‍👩‍👧 ${familyName}\n`;
      caption += `📝 ${info.count} ${t.transactionsWord}`;

      await sendDocument(chatId, buffer, filename, caption, env);
    } catch (error) {
      console.error('Export error:', error);
      await sendMessage(chatId, `❌ ${t.exportError}`, env);
    }

    await answerCallback(callback.id, env);
    return;
  }

  // Handle family invite button
  if (data === 'family_invite') {
    const activeFamily = await userService.getActiveFamily(telegramId);
    if (!activeFamily) {
      await answerCallback(callback.id, env, 'Сначала выбери семью');
      return;
    }
    const family = await familyService.findById(activeFamily);
    const code = await familyService.generateInvite(activeFamily);
    await sendMessage(
      chatId,
      `🔑 <b>Код приглашения:</b> <code>${code}</code>\n\n` +
      `Семья: ${family.name}\n⏰ Действует 24 часа\n\n` +
      `Партнёр должен написать:\n<code>/family join ${code}</code>`,
      env
    );
    await answerCallback(callback.id, env);
    return;
  }

  // Handle currency selection
  if (data.startsWith('currency_')) {
    const newCurrency = data.replace('currency_', '');
    await userService.updateCurrency(user.id, newCurrency);
    const t = getTranslations(user.language || 'en');
    await editMessage(chatId, messageId, `✅ ${t.currencyChanged}: <b>${newCurrency}</b>`, env);
    await answerCallback(callback.id, env);
    return;
  }

  // Handle notification toggles
  if (data === 'notif_daily_toggle') {
    const newValue = user.daily_reminder ? 0 : 1;
    await userService.updateNotificationSetting(user.id, 'daily_reminder', newValue);
    const t = getTranslations(user.language || 'en');
    const updatedUser = { ...user, daily_reminder: newValue };
    const message = generateNotificationSettings(updatedUser, t);
    await editMessage(chatId, messageId, message, env, { reply_markup: buildNotificationKeyboard(updatedUser, t) });
    await answerCallback(callback.id, env, newValue ? t.reminderEnabled : t.reminderDisabled);
    return;
  }

  if (data === 'notif_monthly_toggle') {
    const newValue = user.monthly_report ? 0 : 1;
    await userService.updateNotificationSetting(user.id, 'monthly_report', newValue);
    const t = getTranslations(user.language || 'en');
    const updatedUser = { ...user, monthly_report: newValue };
    const message = generateNotificationSettings(updatedUser, t);
    await editMessage(chatId, messageId, message, env, { reply_markup: buildNotificationKeyboard(updatedUser, t) });
    await answerCallback(callback.id, env, newValue ? t.reportEnabled : t.reportDisabled);
    return;
  }

  // Handle import confirmation
  if (data.startsWith('import_confirm:')) {
    const importKey = data.replace('import_confirm:', '');
    const { bankImportService } = services;
    const t = getTranslations(user.language || 'en');
    const currency = user.currency || 'USD';

    try {
      // Get stored import data from KV
      const importDataStr = await env.FINANCE_KV.get(importKey);
      if (!importDataStr) {
        await editMessage(chatId, messageId, `❌ Import expired. Please send the file again.`, env);
        await answerCallback(callback.id, env);
        return;
      }

      const importData = JSON.parse(importDataStr);
      await editMessage(chatId, messageId, `⏳ ${t.bankImportProcessing}`, env);

      // Perform the import
      const result = await bankImportService.importCSV(
        importData.content,
        user.id,
        importData.bankName,
        importData.familyId,
        importData.fileName
      );

      // Delete the stored data
      await env.FINANCE_KV.delete(importKey);

      if (!result.success) {
        await editMessage(chatId, messageId, `❌ ${t.bankImportError}`, env);
        await answerCallback(callback.id, env);
        return;
      }

      // Build success message
      let message = `✅ <b>${t.bankImportSuccess}</b>\n\n`;
      message += `📅 ${t.bankImportPeriod}: ${result.dateFrom} → ${result.dateTo}\n`;
      message += `📥 ${t.bankImportImported}: ${result.imported}\n`;
      message += `⏭ ${t.bankImportSkipped}: ${result.skipped}\n\n`;

      if (result.categories && Object.keys(result.categories).length > 0) {
        message += `<b>${t.bankImportByCategory}:</b>\n`;
        const sorted = Object.entries(result.categories).sort((a, b) => b[1] - a[1]);
        for (const [cat, amount] of sorted.slice(0, 10)) {
          message += `${cat}: ${amount.toFixed(2)} ${currency}\n`;
        }
      }

      // Show imported transactions list (up to 15)
      if (result.importedList && result.importedList.length > 0) {
        message += `\n<b>Импортированные транзакции:</b>\n`;
        const shown = result.importedList.slice(0, 15);
        for (const tx of shown) {
          const typeEmoji = tx.amount < 0 ? '📉' : '📈';
          const absAmount = Math.abs(tx.amount).toFixed(2);
          const desc = (tx.description || '').substring(0, 40);
          message += `${typeEmoji} ${tx.date} | <b>${absAmount} ${currency}</b> | ${tx.category}\n`;
          if (desc) message += `   <i>${desc}</i>\n`;
        }
        if (result.importedList.length > 15) {
          message += `\n... и ещё ${result.importedList.length - 15} транзакций`;
        }
      }

      // Show potential duplicates warning
      if (result.duplicates && result.duplicates.length > 0) {
        message += `\n\n⚠️ <b>Возможные дубликаты (${result.duplicates.length}):</b>\n`;
        message += `<i>Совпадение суммы и даты с ручными записями:</i>\n\n`;
        for (const dup of result.duplicates.slice(0, 5)) {
          const absAmt = Math.abs(dup.bankTx.amount).toFixed(2);
          message += `📄 CSV: ${dup.bankTx.date} | ${absAmt} ${currency}\n`;
          message += `✋ Ручная: ${dup.manualTx.date} | <i>${(dup.manualTx.description || '').substring(0, 30)}</i>\n\n`;
        }
        if (result.duplicates.length > 5) {
          message += `... и ещё ${result.duplicates.length - 5}\n`;
        }
        message += `Удали дубликат: /undo или /history`;
      }

      await editMessage(chatId, messageId, message, env);
      await answerCallback(callback.id, env, t.bankImportSuccess);

    } catch (error) {
      console.error('Import error:', error);
      await editMessage(chatId, messageId, `❌ ${t.bankImportError}: ${error.message}`, env);
      await answerCallback(callback.id, env);
    }
    return;
  }

  // Handle import cancellation
  if (data.startsWith('import_cancel:')) {
    const importKey = data.replace('import_cancel:', '');
    const t = getTranslations(user.language || 'en');

    // Delete the stored data
    await env.FINANCE_KV.delete(importKey);

    await editMessage(chatId, messageId, `❌ ${t.cancelled}`, env);
    await answerCallback(callback.id, env);
    return;
  }

  // Handle bank connect button (from /bank menu)
  if (data === 'bank_connect') {
    const { openBankingService } = services;
    const isSandbox = env.SALTEDGE_SANDBOX === 'true';

    const isConfigured = env.SALTEDGE_APP_ID || env.NORDIGEN_SECRET_ID;
    if (!isConfigured) {
      await answerCallback(callback.id, env, 'Open Banking не настроен');
      return;
    }

    if (!isSandbox) {
      // Production: show country picker
      const countries = [
        { code: 'PL', flag: '🇵🇱', name: 'Polska' },
        { code: 'UA', flag: '🇺🇦', name: 'Україна' },
        { code: 'DE', flag: '🇩🇪', name: 'Deutschland' },
        { code: 'GB', flag: '🇬🇧', name: 'UK' },
        { code: 'FR', flag: '🇫🇷', name: 'France' },
        { code: 'NL', flag: '🇳🇱', name: 'Nederland' },
      ];
      const buttons = countries.map(c =>
        [button(`${c.flag} ${c.name}`, `bank_country:${c.code}`)]
      );
      await sendMessage(chatId, `🌍 <b>Выбери страну банка:</b>`, env, { reply_markup: inlineKeyboard(buttons) });
    } else {
      // Sandbox: show fake banks directly
      await sendMessage(chatId, '⏳ Загружаю тестовые банки...', env);
      try {
        const banks = await openBankingService.getBanks();
        const buttons = banks.slice(0, 15).map(bank => {
          const bankId = bank.code || bank.id;
          const bankName = (bank.name || bankId).substring(0, 30);
          return [button(`🏦 ${bankName}`, `bank_select:${bankId}`)];
        });
        await sendMessage(chatId, `🏦 <b>Тестовые банки:</b>`, env, { reply_markup: inlineKeyboard(buttons) });
      } catch (error) {
        await sendMessage(chatId, `❌ Ошибка: ${error.message}`, env);
      }
    }
    await answerCallback(callback.id, env);
    return;
  }

  // Handle country selection for bank connect
  if (data.startsWith('bank_country:')) {
    const { openBankingService } = services;
    const countryCode = data.replace('bank_country:', '');

    await sendMessage(chatId, '⏳ Загружаю список банков...', env);
    await answerCallback(callback.id, env);

    try {
      const banks = openBankingService.getBanks
        ? await openBankingService.getBanks(countryCode)
        : await openBankingService.getPolishBanks();

      if (!banks || banks.length === 0) {
        await sendMessage(chatId, `❌ Банки для этой страны не найдены. Попробуй другую.`, env);
        return;
      }

      const buttons = banks.slice(0, 15).map(bank => {
        const bankId = bank.code || bank.id;
        const bankName = (bank.name || bankId).substring(0, 30);
        return [button(`🏦 ${bankName}`, `bank_select:${bankId}`)];
      });

      let msg = `🏦 <b>Банки (${countryCode}, ${banks.length}):</b>\n`;
      if (banks.length > 15) {
        msg += `<i>Показаны первые 15</i>\n`;
      }

      await sendMessage(chatId, msg, env, { reply_markup: inlineKeyboard(buttons) });
    } catch (error) {
      console.error('Error fetching banks:', error);
      await sendMessage(chatId, `❌ Ошибка: ${error.message}`, env);
    }
    return;
  }

  // Handle bank selection
  if (data.startsWith('bank_select:')) {
    const { openBankingService, openBankingProvider } = services;
    const institutionId = data.replace('bank_select:', '');

    // Get bank name from providers list
    let institutionName = institutionId;
    try {
      const banks = await openBankingService.getPolishBanks();
      const bank = banks.find(b => (b.code || b.id) === institutionId);
      if (bank) institutionName = bank.name || institutionId;
    } catch (e) {
      console.log('Could not fetch bank name:', e.message);
    }

    try {
      const redirectUrl = `${url.origin}/callback?user=${user.id}`;

      let connectUrl, connectionId;

      if (openBankingProvider === 'saltedge') {
        // Salt Edge flow: get or create customer, then create connect session
        const customer = await openBankingService.getOrCreateCustomer(user.id);
        const session = await openBankingService.createConnectSession(customer.id, institutionId, redirectUrl);
        connectUrl = session.connect_url;
        connectionId = session.id || `session_${Date.now()}`;

        // Save pending connection
        await openBankingService.saveBankConnection(user.id, connectionId, institutionId, institutionName, customer.id);
      } else {
        // Nordigen flow: create requisition
        const requisition = await openBankingService.createRequisition(institutionId, redirectUrl, user.id);
        connectUrl = requisition.link;
        connectionId = requisition.id;

        await openBankingService.saveBankConnection(user.id, connectionId, institutionId, institutionName);
      }

      // Send link to user
      const message = `🔗 <b>Подключение ${institutionName}</b>\n\n` +
        `Нажми на кнопку ниже, чтобы авторизоваться в банке.\n\n` +
        `⚠️ Ты будешь перенаправлен на страницу банка для подтверждения доступа.\n\n` +
        `После авторизации напиши /bank sync`;

      const keyboard = inlineKeyboard([
        [{ text: '🔐 Авторизоваться в банке', url: connectUrl }],
        [button('❌ Отмена', `bank_cancel:${connectionId}`)]
      ]);

      await sendMessage(chatId, message, env, { reply_markup: keyboard });
    } catch (error) {
      console.error('Error creating bank connection:', error);
      await sendMessage(chatId, `❌ Ошибка: ${error.message}`, env);
    }
    await answerCallback(callback.id, env);
    return;
  }

  // Handle bank sync button
  if (data === 'bank_sync') {
    const { openBankingService, openBankingProvider, categoryService } = services;
    const connections = await openBankingService.getUserConnections(user.id);

    if (connections.length === 0) {
      await answerCallback(callback.id, env, 'Нет подключённых банков');
      return;
    }

    await editMessage(chatId, messageId, `⏳ Синхронизирую транзакции...`, env);

    let totalImported = 0;
    let totalSkipped = 0;

    for (const conn of connections) {
      try {
        if (openBankingProvider === 'saltedge') {
          // Salt Edge: check connection status
          const seConn = await openBankingService.getConnection(conn.requisition_id);
          if (seConn.status === 'active') {
            const result = await openBankingService.syncTransactions(conn, categoryService);
            totalImported += result.imported;
            totalSkipped += result.skipped;
          }
        } else {
          // Nordigen: check requisition status
          const requisition = await openBankingService.getRequisition(conn.requisition_id);
          if (requisition.status === 'LN' && requisition.accounts?.length > 0) {
            if (!conn.account_ids) {
              await openBankingService.updateConnectionStatus(conn.requisition_id, 'linked', requisition.accounts);
              conn.account_ids = JSON.stringify(requisition.accounts);
            }
            const result = await openBankingService.syncTransactions(conn, categoryService);
            totalImported += result.imported;
            totalSkipped += result.skipped;
          }
        }
      } catch (error) {
        console.error(`Sync error:`, error);
      }
    }

    await editMessage(chatId, messageId,
      `✅ <b>Синхронизация завершена</b>\n\n` +
      `📥 Импортировано: ${totalImported}\n` +
      `⏭ Пропущено: ${totalSkipped}`,
      env
    );
    await answerCallback(callback.id, env);
    return;
  }

  // Handle bank disconnect
  if (data.startsWith('bank_disconnect:')) {
    const { openBankingService, openBankingProvider } = services;
    const connectionId = parseInt(data.replace('bank_disconnect:', ''));

    const result = openBankingProvider === 'saltedge'
      ? await openBankingService.removeConnection(user.id, connectionId)
      : await openBankingService.deleteConnection(user.id, connectionId);

    if (result.success) {
      await editMessage(chatId, messageId, `✅ Банк отключён`, env);
    } else {
      await editMessage(chatId, messageId, `❌ Ошибка: ${result.error}`, env);
    }
    await answerCallback(callback.id, env);
    return;
  }

  // Handle bank wipe confirmation
  if (data.startsWith('bank_wipe_')) {
    const action = data.replace('bank_wipe_', '');
    const currency = user.currency || 'USD';

    if (action === 'cancel') {
      await editMessage(chatId, messageId, `👌 Отменено`, env);
      await answerCallback(callback.id, env);
      return;
    }

    let sourceFilter;
    let label;
    if (action === 'confirm') {
      sourceFilter = `IN ('saltedge', 'bank_import')`;
      label = 'все банковские';
    } else if (action === 'saltedge') {
      sourceFilter = `= 'saltedge'`;
      label = 'Open Banking';
    } else if (action === 'csv') {
      sourceFilter = `= 'bank_import'`;
      label = 'CSV импорт';
    } else {
      await answerCallback(callback.id, env, 'Неизвестное действие');
      return;
    }

    const deleted = await env.DB.prepare(`
      DELETE FROM transactions
      WHERE user_id = ? AND source ${sourceFilter}
      RETURNING id
    `).bind(user.id).all();

    const count = deleted.results.length;
    await editMessage(chatId, messageId,
      `🗑 Удалено <b>${count}</b> транзакций (${label}).\n\n✅ Статистика обновлена.`,
      env
    );
    await answerCallback(callback.id, env);
    return;
  }

  // Handle bank cancel
  if (data.startsWith('bank_cancel:')) {
    const { openBankingService, openBankingProvider } = services;
    const connectionId = data.replace('bank_cancel:', '');

    try {
      if (openBankingProvider === 'saltedge') {
        // Salt Edge: just remove from DB, session will expire
        await openBankingService.updateConnectionStatus(connectionId, 'cancelled');
      } else {
        // Nordigen: delete requisition
        await openBankingService.deleteRequisition(connectionId);
      }
    } catch (e) {
      console.error('Error cancelling connection:', e);
    }

    await editMessage(chatId, messageId, `❌ Подключение отменено`, env);
    await answerCallback(callback.id, env);
    return;
  }

  // Handle category delete button
  if (data.startsWith('cat_delete:')) {
    const categoryId = parseInt(data.replace('cat_delete:', ''));
    const { categoryService } = services;

    const result = await categoryService.deleteCustomCategory(user.id, categoryId);

    if (result.success) {
      let msg = `✅ Категория удалена`;
      if (result.movedTransactions > 0) {
        msg += `\n📦 ${result.movedTransactions} транзакций перемещены в "Другое"`;
      }
      await editMessage(chatId, messageId, msg, env);
    } else {
      await editMessage(chatId, messageId, `❌ Не удалось удалить`, env);
    }
    await answerCallback(callback.id, env);
    return;
  }

  // Handle category rename button
  if (data.startsWith('cat_rename:')) {
    const categoryId = parseInt(data.replace('cat_rename:', ''));
    const { categoryService } = services;

    // Store rename intent in KV (user must send new name next)
    await env.FINANCE_KV.put(`rename_${user.id}`, JSON.stringify({ categoryId }), { expirationTtl: 300 });

    const cat = await categoryService.findById(categoryId);
    await editMessage(chatId, messageId,
      `✏️ Переименование: ${cat?.emoji} <b>${cat?.name}</b>\n\n` +
      `Отправь новое название (или /cancel для отмены):`,
      env
    );
    await answerCallback(callback.id, env);
    return;
  }

  // Handle main menu buttons
  if (data.startsWith('menu:')) {
    const action = data.replace('menu:', '');
    await answerCallback(callback.id, env);

    switch (action) {
      case 'stats': {
        const msg = await statsService.generateMonthlyStats(user.id, new Date(), familyId, null, user.language, user.currency);
        await sendMessage(chatId, msg, env);
        break;
      }
      case 'balance': {
        const t = getTranslations(user.language || 'en');
        const msg = await statsService.generateBalance(user.id, new Date(), familyId, user.language, user.currency);
        await sendMessage(chatId, msg, env);
        break;
      }
      case 'history': {
        const msg = await statsService.generateHistory(user.id, 10, familyId, user.language, user.currency);
        await sendMessage(chatId, msg, env);
        break;
      }
      case 'trend': {
        const msg = await statsService.generateTrendReport(user.id, familyId, user.language, user.currency);
        await sendMessage(chatId, msg, env);
        break;
      }
      case 'categories': {
        await handleCategoryCommand(chatId, user, '/cat', env, services);
        break;
      }
      case 'export': {
        await handleExport(chatId, user, '/export', familyId, env, services);
        break;
      }
      case 'bank': {
        await handleBankCommand(chatId, user, '/bank', familyId, env, services);
        break;
      }
      case 'import': {
        await handleImportCommand(chatId, user, '/import', familyId, env, services);
        break;
      }
      case 'currency': {
        await handleCurrency(chatId, user, env, services);
        break;
      }
      case 'notifications': {
        await handleNotifications(chatId, user, env, services);
        break;
      }
      case 'family': {
        await handleFamily(chatId, user, '/family', env, services);
        break;
      }
      case 'help': {
        await handleHelp(chatId, env);
        break;
      }
    }
    return;
  }

  await answerCallback(callback.id, env);
}

// ============================================
// NOTIFICATIONS HANDLER
// ============================================

async function handleNotifications(chatId, user, env, services) {
  const t = getTranslations(user.language || 'en');
  const message = generateNotificationSettings(user, t);
  await sendMessage(chatId, message, env, { reply_markup: buildNotificationKeyboard(user, t) });
}

// ============================================
// CURRENCY HANDLER
// ============================================

const CURRENCIES = [
  { code: 'PLN', symbol: 'zł', flag: '🇵🇱' },
  { code: 'EUR', symbol: '€', flag: '🇪🇺' },
  { code: 'USD', symbol: '$', flag: '🇺🇸' },
  { code: 'UAH', symbol: '₴', flag: '🇺🇦' },
  { code: 'GBP', symbol: '£', flag: '🇬🇧' },
  { code: 'RUB', symbol: '₽', flag: '🇷🇺' },
];

async function handleCurrency(chatId, user, env, services) {
  const t = getTranslations(user.language || 'en');
  const currentCurrency = user.currency || 'USD';

  let message = `💱 <b>${t.currencyTitle}</b>\n\n`;
  message += `${t.currentCurrency}: <b>${currentCurrency}</b>\n\n`;
  message += `${t.selectCurrency}:`;

  const buttons = CURRENCIES.map(c => {
    const isActive = c.code === currentCurrency ? ' ✓' : '';
    return [button(`${c.flag} ${c.code} (${c.symbol})${isActive}`, `currency_${c.code}`)];
  });

  await sendMessage(chatId, message, env, { reply_markup: inlineKeyboard(buttons) });
}

// ============================================
// BUDGET HANDLERS
// ============================================

async function handleBudget(chatId, user, text, familyId, env, services) {
  const { categoryService, budgetService } = services;
  const t = getTranslations(user.language || 'en');
  const currency = user.currency || 'USD';

  // /budget delete <category>
  const deleteMatch = text.match(/\/budget\s+delete\s+(.+)/i);
  if (deleteMatch) {
    const categoryName = deleteMatch[1].trim();
    const category = await categoryService.detectCategory(categoryName);

    if (!category) {
      await sendMessage(chatId, `❌ ${t.categoryNotFound}: ${categoryName}`, env);
      return;
    }

    await budgetService.deleteBudget(user.id, category.id, familyId);
    await sendMessage(chatId, `✅ ${t.budgetDeleted}: ${category.emoji} ${category.name}`, env);
    return;
  }

  // /budget <category> <amount>
  const setMatch = text.match(/\/budget\s+(\S+)\s+(\d+(?:[.,]\d+)?)/i);
  if (setMatch) {
    const categoryName = setMatch[1].trim();
    const amount = parseFloat(setMatch[2].replace(',', '.'));

    const category = await categoryService.detectCategory(categoryName);

    if (!category) {
      await sendMessage(chatId, `❌ ${t.categoryNotFound}: ${categoryName}`, env);
      return;
    }

    await budgetService.setBudget(user.id, category.id, amount, familyId);
    await sendMessage(
      chatId,
      `✅ ${t.budgetSet}\n\n${category.emoji} ${category.name}: <b>${amount.toFixed(0)} ${currency}</b> ${t.perMonthWord}`,
      env
    );
    return;
  }

  // /budget - show help
  await sendMessage(
    chatId,
    `📊 <b>${t.budgetTitle}</b>\n\n` +
    `${t.budgetHelp}\n\n` +
    `<b>${t.commands}:</b>\n` +
    `• <code>/budget ${t.category} ${t.amount}</code> - ${t.setBudget}\n` +
    `• <code>/budget delete ${t.category}</code> - ${t.deleteBudget}\n` +
    `• <code>/budgets</code> - ${t.viewBudgets}\n\n` +
    `${t.errorExample} <code>/budget продукты 2000</code>`,
    env
  );
}

async function handleBudgets(chatId, user, familyId, env, services) {
  const { budgetService } = services;
  const t = getTranslations(user.language || 'en');
  const currency = user.currency || 'USD';

  const statuses = await budgetService.getAllBudgetStatuses(user.id, familyId);

  if (statuses.length === 0) {
    await sendMessage(
      chatId,
      `📊 <b>${t.budgetsTitle}</b>\n\n` +
      `${t.noBudgets}\n\n` +
      `${t.budgetHint}:\n<code>/budget продукты 2000</code>`,
      env
    );
    return;
  }

  let message = `📊 <b>${t.budgetsTitle}</b>\n\n`;

  for (const s of statuses) {
    const bar = progressBar(s.spent, s.budget, 10);
    const statusEmoji = s.isOver ? '🔴' : s.isWarning ? '🟡' : '🟢';

    message += `${s.category_emoji} <b>${s.category_name}</b>\n`;
    message += `${bar} ${s.spent.toFixed(0)}/${s.budget.toFixed(0)} ${currency} (${s.percentUsed.toFixed(0)}%) ${statusEmoji}\n`;

    if (s.isOver) {
      message += `⚠️ ${t.overBudgetBy}: ${Math.abs(s.remaining).toFixed(0)} ${currency}\n`;
    } else {
      message += `${t.remaining}: ${s.remaining.toFixed(0)} ${currency}\n`;
    }
    message += '\n';
  }

  await sendMessage(chatId, message, env);
}

// Progress bar helper
function progressBar(value, max, length = 10) {
  if (max === 0) return '░'.repeat(length);
  const percent = Math.min(value / max, 1);
  const filled = Math.round(percent * length);
  return '█'.repeat(filled) + '░'.repeat(Math.max(0, length - filled));
}

function generateNotificationSettings(user, t) {
  const dailyStatus = user.daily_reminder ? `✅ ${t.enabled}` : `❌ ${t.disabled}`;
  const monthlyStatus = user.monthly_report ? `✅ ${t.enabled}` : `❌ ${t.disabled}`;

  return `🔔 <b>${t.notificationsTitle}</b>\n\n` +
    `📝 <b>${t.dailyReminder}</b>\n${t.dailyReminderDesc}\n${t.status}: ${dailyStatus}\n\n` +
    `📊 <b>${t.monthlyReport}</b>\n${t.monthlyReportDesc}\n${t.status}: ${monthlyStatus}`;
}

function buildNotificationKeyboard(user, t) {
  const dailyIcon = user.daily_reminder ? '🔕' : '🔔';
  const monthlyIcon = user.monthly_report ? '🔕' : '🔔';

  return inlineKeyboard([
    [button(`${dailyIcon} ${user.daily_reminder ? t.disableReminder : t.enableReminder}`, 'notif_daily_toggle')],
    [button(`${monthlyIcon} ${user.monthly_report ? t.disableReport : t.enableReport}`, 'notif_monthly_toggle')]
  ]);
}

// ============================================
// BANK IMPORT HANDLERS
// ============================================

async function handleImportCommand(chatId, user, text, familyId, env, services) {
  const { bankImportService } = services;
  const t = getTranslations(user.language || 'en');
  const currency = user.currency || 'USD';

  const parts = text.trim().split(/\s+/);
  const subCommand = parts[1]?.toLowerCase();

  // /import delete - delete last import
  if (subCommand === 'delete' || subCommand === 'undo') {
    const result = await bankImportService.deleteLastImport(user.id);

    if (!result.success) {
      await sendMessage(chatId, `❌ ${t.bankImportHistory}: нет импортов для удаления`, env);
      return;
    }

    const imp = result.importRecord;
    await sendMessage(
      chatId,
      `🗑 <b>Импорт удалён</b>\n\n` +
      `🏦 ${imp.bank_name}\n` +
      `📅 ${imp.date_from} → ${imp.date_to}\n` +
      `📝 Удалено транзакций: ${result.deleted}`,
      env
    );
    return;
  }

  // /import history - show import history
  if (subCommand === 'history') {
    const imports = await bankImportService.getImportHistory(user.id, 5);

    if (imports.length === 0) {
      await sendMessage(chatId, `📋 ${t.bankImportHistory}\n\nНет импортов`, env);
      return;
    }

    let message = `📋 <b>${t.bankImportHistory}</b>\n\n`;
    for (const imp of imports) {
      message += `🏦 <b>${imp.bank_name}</b>\n`;
      message += `📅 ${imp.date_from} → ${imp.date_to}\n`;
      message += `📥 ${imp.imported_count} | ⏭ ${imp.skipped_count}\n`;
      message += `📄 ${imp.file_name || 'файл'}\n\n`;
    }
    message += `\n<code>/import delete</code> - удалить последний`;

    await sendMessage(chatId, message, env);
    return;
  }

  // /import - show help
  const banks = bankImportService.getSupportedBanks();
  const banksList = banks.map(b => `${b.flag} ${b.name}`).join('\n');

  const message = `🏦 <b>${t.bankImportTitle}</b>\n\n` +
    `${t.bankImportHelp}\n\n` +
    `<b>${t.supportedBanks}:</b>\n${banksList}\n\n` +
    `<b>PKO BP:</b>\n` +
    `1. iPKO → Historia → Zrealizowane\n` +
    `2. Pobierz zestawienie → CSV\n` +
    `3. ${t.bankImportSendCSV}\n\n` +
    `<b>Команды:</b>\n` +
    `• <code>/import history</code> - история импортов\n` +
    `• <code>/import delete</code> - удалить последний импорт`;

  await sendMessage(chatId, message, env);
}

async function handleDocument(chatId, user, document, familyId, env, services) {
  const { bankImportService } = services;
  const t = getTranslations(user.language || 'en');
  const currency = user.currency || 'USD';

  // Check if it's a CSV file
  const fileName = document.file_name || '';
  const isCSV = fileName.toLowerCase().endsWith('.csv') ||
                document.mime_type === 'text/csv' ||
                document.mime_type === 'application/csv';

  if (!isCSV) {
    await sendMessage(chatId, `❌ ${t.bankImportWrongFormat}\n\n${t.bankImportSendCSV}`, env);
    return;
  }

  // Check file size (max 1MB for safety)
  if (document.file_size > 1024 * 1024) {
    await sendMessage(chatId, `❌ File too large. Max 1MB.`, env);
    return;
  }

  await sendMessage(chatId, `⏳ ${t.bankImportProcessing}`, env);

  try {
    // Download the file
    const content = await downloadFile(document.file_id, env);
    if (!content) {
      await sendMessage(chatId, `❌ ${t.bankImportError}`, env);
      return;
    }

    // Detect bank from file name or content
    const bankName = detectBankFromFile(fileName, content);

    // Preview the import
    const preview = await bankImportService.previewCSV(content, bankName);

    if (!preview.success) {
      await sendMessage(chatId, `❌ ${t.bankImportNoTransactions}`, env);
      return;
    }

    // Store content in KV for later import (expires in 10 minutes)
    const importKey = `import_${user.id}_${Date.now()}`;
    await env.FINANCE_KV.put(importKey, JSON.stringify({
      content,
      bankName,
      fileName,
      familyId
    }), { expirationTtl: 600 });

    // Build preview message
    let message = `📊 <b>${t.bankImportPreview}</b>\n\n`;
    message += `🏦 ${bankName}\n`;
    message += `📅 ${t.bankImportPeriod}: ${preview.dateFrom} → ${preview.dateTo}\n`;
    message += `📝 ${t.bankImportTransactions}: ${preview.count}\n`;
    message += `📉 ${t.bankImportExpenses}: ${preview.expenses.toFixed(2)} ${currency}\n`;
    message += `📈 ${t.bankImportIncome}: ${preview.income.toFixed(2)} ${currency}\n\n`;

    if (preview.sample && preview.sample.length > 0) {
      message += `<b>${t.bankImportSample}:</b>\n`;
      for (const s of preview.sample) {
        const typeEmoji = s.type === 'expense' ? '📉' : '📈';
        message += `${typeEmoji} ${s.date}: ${s.amount.toFixed(2)} ${currency} - ${s.description}\n`;
      }
      message += '\n';
    }

    message += `${t.bankImportConfirm}`;

    const keyboard = inlineKeyboard([
      buttonRow(
        button(t.btnImportConfirm, `import_confirm:${importKey}`),
        button(t.btnImportCancel, `import_cancel:${importKey}`)
      )
    ]);

    await sendMessage(chatId, message, env, { reply_markup: keyboard });

  } catch (error) {
    console.error('Import error:', error);
    await sendMessage(chatId, `❌ ${t.bankImportError}: ${error.message}`, env);
  }
}

function detectBankFromFile(fileName, content) {
  const fileNameLower = fileName.toLowerCase();
  const contentLower = content.toLowerCase().substring(0, 500);

  // PKO BP
  if (fileNameLower.includes('pko') || fileNameLower.includes('ipko') ||
      contentLower.includes('pko') || contentLower.includes('data operacji')) {
    return 'PKO BP';
  }

  // mBank
  if (fileNameLower.includes('mbank') ||
      contentLower.includes('mbank') || contentLower.includes('data księgowania')) {
    return 'mBank';
  }

  // ING
  if (fileNameLower.includes('ing') || contentLower.includes('ing bank')) {
    return 'ING';
  }

  // Default to PKO BP (most common in Poland)
  return 'PKO BP';
}

// ============================================
// OPEN BANKING (NORDIGEN) HANDLERS
// ============================================

// ============================================
// DIAGNOSTIC HANDLER
// ============================================

async function handleDiag(chatId, user, familyId, env, services) {
  const { transactionService } = services;
  const currency = user.currency || 'USD';
  const now = new Date();

  // 1. Raw transaction counts by source and type for current month
  const { start, end } = getMonthRange(now);

  const rawBySourceType = await env.DB.prepare(`
    SELECT source, type, COUNT(*) as cnt, COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE user_id = ? AND transaction_date BETWEEN ? AND ?
    GROUP BY source, type
    ORDER BY source, type
  `).bind(user.id, start, end).all();

  // 2. Service-calculated totals (what /stats uses)
  const svcExpense = await transactionService.getMonthTotal(user.id, 'expense', now, familyId);
  const svcIncome = await transactionService.getMonthTotal(user.id, 'income', now, familyId);

  // 3. Raw totals (no family_id filter)
  const rawTotals = await env.DB.prepare(`
    SELECT type, COALESCE(SUM(amount), 0) as total, COUNT(*) as cnt
    FROM transactions
    WHERE user_id = ? AND transaction_date BETWEEN ? AND ?
    GROUP BY type
  `).bind(user.id, start, end).all();

  // 4. Check for transactions with non-null family_id
  const familyTx = await env.DB.prepare(`
    SELECT COUNT(*) as cnt FROM transactions
    WHERE user_id = ? AND family_id IS NOT NULL AND transaction_date BETWEEN ? AND ?
  `).bind(user.id, start, end).first();

  // 5. Total transactions all-time by source
  const allTimeSources = await env.DB.prepare(`
    SELECT source, COUNT(*) as cnt
    FROM transactions WHERE user_id = ?
    GROUP BY source
  `).bind(user.id).all();

  // 6. Active family
  const monthName = getMonthName(now, user.language || 'en');

  let msg = `🔍 <b>Диагностика — ${monthName} ${now.getFullYear()}</b>\n`;
  msg += `user_id=${user.id}, familyId=${familyId || 'null'}\n\n`;

  // Raw totals
  msg += `<b>📊 Сырые данные (все транзакции):</b>\n`;
  const rawExpense = rawTotals.results.find(r => r.type === 'expense');
  const rawIncome = rawTotals.results.find(r => r.type === 'income');
  msg += `  Расходы: ${rawExpense?.total?.toFixed(2) || '0.00'} ${currency} (${rawExpense?.cnt || 0} шт.)\n`;
  msg += `  Доходы:  ${rawIncome?.total?.toFixed(2) || '0.00'} ${currency} (${rawIncome?.cnt || 0} шт.)\n\n`;

  // Service totals (what stats shows)
  msg += `<b>📈 Что показывает /stats:</b>\n`;
  msg += `  Расходы: ${svcExpense.toFixed(2)} ${currency}\n`;
  msg += `  Доходы:  ${svcIncome.toFixed(2)} ${currency}\n`;

  // Mismatch?
  const expenseDiff = (rawExpense?.total || 0) - svcExpense;
  const incomeDiff = (rawIncome?.total || 0) - svcIncome;
  if (Math.abs(expenseDiff) > 0.01 || Math.abs(incomeDiff) > 0.01) {
    msg += `\n⚠️ <b>РАСХОЖДЕНИЕ!</b>\n`;
    if (Math.abs(expenseDiff) > 0.01) msg += `  Расходы: разница ${expenseDiff.toFixed(2)} ${currency}\n`;
    if (Math.abs(incomeDiff) > 0.01) msg += `  Доходы: разница ${incomeDiff.toFixed(2)} ${currency}\n`;
    msg += `  <i>Причина: family_id фильтр или некорректные данные</i>\n`;
  } else {
    msg += `\n✅ Суммы совпадают\n`;
  }

  // By source and type
  msg += `\n<b>📋 Текущий месяц по источникам:</b>\n`;
  for (const r of rawBySourceType.results) {
    const src = r.source || 'manual';
    const typeEmoji = r.type === 'expense' ? '📉' : '📈';
    msg += `  ${typeEmoji} ${src}: ${r.cnt} шт. = ${r.total.toFixed(2)} ${currency}\n`;
  }

  // Family transactions
  if (familyTx?.cnt > 0) {
    msg += `\n⚠️ <b>Транзакции с family_id ≠ NULL: ${familyTx.cnt}</b>\n`;
    msg += `  <i>Эти НЕ попадают в /stats когда familyId=null</i>\n`;
  }

  // All-time sources
  msg += `\n<b>🗄 Всего транзакций в БД:</b>\n`;
  for (const r of allTimeSources.results) {
    msg += `  ${r.source || 'manual'}: ${r.cnt}\n`;
  }

  await sendMessage(chatId, msg, env);
}

// ============================================
// CATEGORY MANAGEMENT HANDLER
// ============================================

async function handleCategoryCommand(chatId, user, text, env, services) {
  const { categoryService } = services;
  const textLower = text.toLowerCase().trim();

  // /cat or /categories - show all categories with custom ones highlighted
  if (textLower === '/cat' || textLower === '/categories') {
    const expenseCategories = await categoryService.getUserCategories(user.id, 'expense');
    const incomeCategories = await categoryService.getUserCategories(user.id, 'income');

    let message = '📂 <b>Категории расходов:</b>\n';
    for (const cat of expenseCategories) {
      const custom = cat.owner_type === 'user' ? ' ✏️' : '';
      const keywords = cat.keywords ? JSON.parse(cat.keywords).slice(0, 3).join(', ') : '';
      message += `${cat.emoji} ${cat.name}${custom} <i>(${keywords})</i>\n`;
    }

    message += '\n💰 <b>Категории доходов:</b>\n';
    for (const cat of incomeCategories) {
      const custom = cat.owner_type === 'user' ? ' ✏️' : '';
      message += `${cat.emoji} ${cat.name}${custom}\n`;
    }

    message += '\n<b>Команды:</b>\n';
    message += '• <code>/cat add 🎮 Игры</code> - добавить категорию\n';
    message += '• <code>/cat rename</code> - переименовать\n';
    message += '• <code>/cat keywords Игры steam,ps5</code> - ключевые слова\n';
    message += '• <code>/cat delete</code> - удалить\n';
    message += '\n<i>✏️ = твоя категория (все можно менять/удалять)</i>';

    await sendMessage(chatId, message, env);
    return;
  }

  // /cat add [income] emoji name [keyword1,keyword2,...]
  if (textLower.startsWith('/cat add')) {
    const addText = text.replace(/\/cat\s+add\s*/i, '').trim();

    // Check if it's income type
    let type = 'expense';
    let rest = addText;
    if (rest.toLowerCase().startsWith('income ') || rest.toLowerCase().startsWith('доход ')) {
      type = 'income';
      rest = rest.replace(/^(income|доход)\s+/i, '');
    }

    // Parse: emoji name [keywords]
    // Emoji is first character(s), then name, optional keywords after comma
    const emojiMatch = rest.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s+/u);
    if (!emojiMatch) {
      await sendMessage(chatId,
        `❌ Формат: <code>/cat add 🎮 Игры</code>\n` +
        `Или с ключевыми словами: <code>/cat add 🎮 Игры steam,ps5,xbox</code>`,
        env
      );
      return;
    }

    const emoji = emojiMatch[1];
    const afterEmoji = rest.substring(emojiMatch[0].length).trim();

    // Split name and keywords
    const parts = afterEmoji.split(/\s+/);
    const name = parts[0];
    const keywords = parts.length > 1
      ? parts.slice(1).join(' ').split(',').map(k => k.trim()).filter(k => k)
      : [name.toLowerCase()];

    if (!name || name.length < 2) {
      await sendMessage(chatId, `❌ Название должно быть минимум 2 символа`, env);
      return;
    }

    const result = await categoryService.addCustomCategory(user.id, name, emoji, type, keywords);

    if (!result.success) {
      if (result.error === 'exists') {
        await sendMessage(chatId, `❌ Категория "${name}" уже существует`, env);
      } else {
        await sendMessage(chatId, `❌ Ошибка: ${result.error}`, env);
      }
      return;
    }

    const typeLabel = type === 'income' ? 'дохода' : 'расхода';
    await sendMessage(chatId,
      `✅ Категория ${typeLabel} добавлена!\n\n` +
      `${emoji} <b>${name}</b>\n` +
      `🔑 Ключевые слова: ${keywords.join(', ')}\n\n` +
      `Теперь при вводе расхода эта категория появится в списке.`,
      env
    );
    return;
  }

  // /cat rename - show renamable categories or rename by name
  if (textLower.startsWith('/cat rename') || textLower.startsWith('/cat ren')) {
    const renameArg = text.replace(/\/cat\s+(rename|ren)\s*/i, '').trim();

    const allCats = await categoryService.getEditableCategories(user.id);

    if (allCats.length === 0) {
      await sendMessage(chatId, `📂 Нет категорий для переименования`, env);
      return;
    }

    if (!renameArg) {
      // Show all categories as buttons
      const buttons = allCats.map(c => {
        const tag = c.owner_type === 'user' ? ' ✏️' : '';
        return [button(`✏️ ${c.emoji} ${c.name}${tag}`, `cat_rename:${c.id}`)];
      });

      await sendMessage(chatId,
        `✏️ <b>Переименовать категорию:</b>\n\nВыбери категорию:`,
        env,
        { reply_markup: inlineKeyboard(buttons) }
      );
      return;
    }

    // /cat rename OldName NewName
    const parts = renameArg.split(/\s+/);
    if (parts.length < 2) {
      await sendMessage(chatId,
        `❌ Формат: <code>/cat rename Старое Новое</code>\n` +
        `Или просто: <code>/cat rename</code> — для выбора из списка`,
        env
      );
      return;
    }

    const oldName = parts[0];
    const newName = parts.slice(1).join(' ');
    const cat = allCats.find(c => c.name.toLowerCase() === oldName.toLowerCase());

    if (!cat) {
      await sendMessage(chatId, `❌ Категория "${oldName}" не найдена.`, env);
      return;
    }

    const result = await categoryService.renameCategory(cat.id, user.id, newName);
    if (result.success) {
      await sendMessage(chatId, `✅ Переименовано: ${result.emoji} <b>${newName}</b>`, env);
    } else {
      await sendMessage(chatId, `❌ ${result.error}`, env);
    }
    return;
  }

  // /cat keywords CategoryName keyword1,keyword2
  if (textLower.startsWith('/cat keywords') || textLower.startsWith('/cat kw')) {
    const kwText = text.replace(/\/cat\s+(keywords|kw)\s*/i, '').trim();
    const spaceIdx = kwText.indexOf(' ');

    if (spaceIdx === -1) {
      await sendMessage(chatId,
        `❌ Формат: <code>/cat keywords Игры steam,playstation,ps5</code>`,
        env
      );
      return;
    }

    const catName = kwText.substring(0, spaceIdx);
    const newKeywords = kwText.substring(spaceIdx + 1).split(',').map(k => k.trim().toLowerCase()).filter(k => k);

    if (newKeywords.length === 0) {
      await sendMessage(chatId, `❌ Укажи хотя бы одно ключевое слово`, env);
      return;
    }

    // Find category by name
    const allCats = await categoryService.getUserCategories(user.id);
    const cat = allCats.find(c => c.name.toLowerCase() === catName.toLowerCase());

    if (!cat) {
      await sendMessage(chatId, `❌ Категория "${catName}" не найдена`, env);
      return;
    }

    const result = await categoryService.addKeywordsToCategory(cat.id, user.id, newKeywords);

    if (result.success) {
      await sendMessage(chatId,
        `✅ Ключевые слова обновлены!\n\n` +
        `${cat.emoji} <b>${cat.name}</b>\n` +
        `🔑 Все слова: ${result.keywords.join(', ')}`,
        env
      );
    } else {
      await sendMessage(chatId, `❌ Ошибка: ${result.error}`, env);
    }
    return;
  }

  // /cat delete name
  if (textLower.startsWith('/cat delete') || textLower.startsWith('/cat del')) {
    const catName = text.replace(/\/cat\s+(delete|del)\s*/i, '').trim();

    if (!catName) {
      // Show all deletable categories (system + custom, except "Другое")
      const allCats = await categoryService.getEditableCategories(user.id);
      const deletable = allCats.filter(c => c.name !== 'Другое');

      if (deletable.length === 0) {
        await sendMessage(chatId, `📂 Нет категорий для удаления`, env);
        return;
      }

      const buttons = deletable.map(c => {
        const label = c.owner_type === 'user' ? `❌ ${c.emoji} ${c.name} ✏️ (${c.tx_count})` : `❌ ${c.emoji} ${c.name} (${c.tx_count})`;
        return [button(label, `cat_delete:${c.id}`)];
      });

      await sendMessage(chatId,
        `🗑 <b>Удалить категорию:</b>\n\n` +
        `Транзакции перенесутся в "Другое".\nВыбери категорию:`,
        env,
        { reply_markup: inlineKeyboard(buttons) }
      );
      return;
    }

    // Find category by name
    const allCats = await categoryService.getEditableCategories(user.id);
    const cat = allCats.find(c => c.name.toLowerCase() === catName.toLowerCase());

    if (!cat) {
      await sendMessage(chatId, `❌ Категория "${catName}" не найдена.`, env);
      return;
    }

    const result = await categoryService.deleteCategory(user.id, cat.id);

    if (result.success) {
      let msg = `✅ Категория ${cat.emoji} ${cat.name} удалена`;
      if (result.movedTransactions > 0) {
        msg += `\n📦 ${result.movedTransactions} транзакций перемещены в "Другое"`;
      }
      await sendMessage(chatId, msg, env);
    } else {
      await sendMessage(chatId, `❌ ${result.error}`, env);
    }
    return;
  }

  // Unknown /cat command - show help
  await sendMessage(chatId,
    `📂 <b>Управление категориями</b>\n\n` +
    `<b>Команды:</b>\n` +
    `• <code>/cat</code> - показать все категории\n` +
    `• <code>/cat add 🎮 Игры</code> - добавить категорию расхода\n` +
    `• <code>/cat add income 🏦 Аренда</code> - категорию дохода\n` +
    `• <code>/cat rename</code> - переименовать любую категорию\n` +
    `• <code>/cat keywords Игры steam,ps5</code> - добавить слова\n` +
    `• <code>/cat delete</code> - удалить любую категорию\n`,
    env
  );
}

async function handleBankCommand(chatId, user, text, familyId, env, services) {
  const { openBankingService, openBankingProvider, categoryService } = services;
  const t = getTranslations(user.language || 'en');
  const textLower = text.toLowerCase().trim();

  // Check if Open Banking is configured (either Salt Edge or Nordigen)
  const isConfigured = env.SALTEDGE_APP_ID || (env.NORDIGEN_SECRET_ID && env.NORDIGEN_SECRET_KEY);
  if (!isConfigured) {
    await sendMessage(chatId,
      `⚠️ Open Banking не настроен.\n\n` +
      `Для импорта используй CSV:\n<code>/import</code>`,
      env
    );
    return;
  }

  const providerName = openBankingProvider === 'saltedge' ? 'Salt Edge' : 'Nordigen';

  // /bank - show menu
  if (textLower === '/bank') {
    const connections = await openBankingService.getUserConnections(user.id);

    let message = `🏦 <b>Open Banking</b>\n\n`;

    if (connections.length === 0) {
      message += `Нет подключённых банков.\n\n`;
      message += `Подключи банк для автоматического импорта транзакций:\n`;
      message += `<code>/bank connect</code>`;
    } else {
      message += `<b>Подключённые банки:</b>\n`;
      for (const conn of connections) {
        const lastSync = conn.last_sync_at ? conn.last_sync_at.split('T')[0] : 'никогда';
        message += `✅ ${conn.institution_name}\n`;
        message += `   Последняя синхронизация: ${lastSync}\n`;
      }
      message += `\n<b>Команды:</b>\n`;
      message += `/bank sync - синхронизировать\n`;
      message += `/bank connect - добавить банк\n`;
      message += `/bank disconnect - отключить`;
    }

    const buttons = connections.length === 0
      ? [[button('🔗 Подключить банк', 'bank_connect')]]
      : [
          [button('🔄 Синхронизировать', 'bank_sync')],
          [button('➕ Добавить банк', 'bank_connect')]
        ];

    await sendMessage(chatId, message, env, { reply_markup: inlineKeyboard(buttons) });
    return;
  }

  // /bank connect [country] - show country selection or bank list
  if (textLower.startsWith('/bank connect')) {
    const isSandbox = env.SALTEDGE_SANDBOX === 'true';
    const countryArg = text.replace(/\/bank\s+connect\s*/i, '').trim().toUpperCase();

    // If no country specified and not sandbox, show country picker
    if (!countryArg && !isSandbox) {
      const countries = [
        { code: 'PL', flag: '🇵🇱', name: 'Polska' },
        { code: 'UA', flag: '🇺🇦', name: 'Україна' },
        { code: 'DE', flag: '🇩🇪', name: 'Deutschland' },
        { code: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
        { code: 'FR', flag: '🇫🇷', name: 'France' },
        { code: 'NL', flag: '🇳🇱', name: 'Nederland' },
        { code: 'ES', flag: '🇪🇸', name: 'España' },
        { code: 'IT', flag: '🇮🇹', name: 'Italia' },
      ];

      const buttons = countries.map(c =>
        [button(`${c.flag} ${c.name}`, `bank_country:${c.code}`)]
      );

      await sendMessage(chatId,
        `🌍 <b>Выбери страну банка:</b>`,
        env,
        { reply_markup: inlineKeyboard(buttons) }
      );
      return;
    }

    // Fetch banks for the selected country (or default)
    const country = countryArg || null;
    await sendMessage(chatId, '⏳ Загружаю список банков...', env);

    try {
      const banks = openBankingService.getBanks
        ? await openBankingService.getBanks(country)
        : await openBankingService.getPolishBanks();

      if (!banks || banks.length === 0) {
        await sendMessage(chatId,
          `❌ Банки не найдены.\n\n` +
          (isSandbox
            ? `В sandbox режиме используются тестовые банки (XF).\nПроверь настройки Salt Edge.`
            : `Попробуй другую страну или используй /import для CSV импорта.`),
          env
        );
        return;
      }

      let message = `🏦 <b>Выбери банк (${banks.length}):</b>\n`;
      if (isSandbox) {
        message += `<i>(Sandbox режим - тестовые банки)</i>\n`;
      }

      const buttons = banks.slice(0, 15).map(bank => {
        const bankId = bank.code || bank.id;
        const bankName = (bank.name || bankId).substring(0, 30);
        return [button(`🏦 ${bankName}`, `bank_select:${bankId}`)];
      });

      if (banks.length > 15) {
        message += `<i>Показаны первые 15 из ${banks.length}</i>\n`;
      }

      await sendMessage(chatId, message, env, { reply_markup: inlineKeyboard(buttons) });
    } catch (error) {
      console.error('Error fetching banks:', error);
      await sendMessage(chatId, `❌ Ошибка: ${error.message}`, env);
    }
    return;
  }

  // /bank sync - sync all connections
  if (textLower === '/bank sync') {
    const connections = await openBankingService.getUserConnections(user.id);

    if (connections.length === 0) {
      await sendMessage(chatId, `❌ Нет подключённых банков. Используй /bank connect`, env);
      return;
    }

    await sendMessage(chatId, `⏳ Синхронизирую транзакции...`, env);

    let totalImported = 0;
    let totalSkipped = 0;
    let allImported = [];
    let allDuplicates = [];
    const currency = user.currency || 'USD';

    for (const conn of connections) {
      try {
        const result = await openBankingService.syncTransactions(conn, categoryService);
        totalImported += result.imported;
        totalSkipped += result.skipped;
        if (result.importedList) {
          allImported = allImported.concat(result.importedList);
        }
        if (result.duplicates) {
          allDuplicates = allDuplicates.concat(result.duplicates);
        }
      } catch (error) {
        console.error(`Sync error for ${conn.institution_name}:`, error);
      }
    }

    let message = `✅ <b>Синхронизация завершена</b>\n\n` +
      `📥 Импортировано: ${totalImported}\n` +
      `⏭ Пропущено: ${totalSkipped}`;

    // Show imported transactions (up to 15)
    if (allImported.length > 0) {
      message += `\n\n<b>Импортированные транзакции:</b>\n`;
      const shown = allImported.slice(0, 15);
      for (const tx of shown) {
        const typeEmoji = tx.amount < 0 ? '📉' : '📈';
        const absAmount = Math.abs(tx.amount).toFixed(2);
        const desc = (tx.description || '').substring(0, 40);
        message += `${typeEmoji} ${tx.date} | <b>${absAmount} ${currency}</b> | ${tx.category}\n`;
        if (desc) message += `   <i>${desc}</i>\n`;
      }
      if (allImported.length > 15) {
        message += `\n... и ещё ${allImported.length - 15} транзакций`;
      }
    }

    // Show potential duplicates warning
    if (allDuplicates.length > 0) {
      message += `\n\n⚠️ <b>Возможные дубликаты (${allDuplicates.length}):</b>\n`;
      message += `<i>Совпадение суммы и даты с ручными записями:</i>\n\n`;
      for (const dup of allDuplicates.slice(0, 5)) {
        const absAmt = Math.abs(dup.bankTx.amount).toFixed(2);
        message += `🏦 Банк: ${dup.bankTx.date} | ${absAmt} ${currency}\n`;
        message += `✋ Ручная: ${dup.manualTx.date} | <i>${(dup.manualTx.description || '').substring(0, 30)}</i>\n\n`;
      }
      if (allDuplicates.length > 5) {
        message += `... и ещё ${allDuplicates.length - 5}\n`;
      }
      message += `Удали дубликат: /undo или /history`;
    }

    await sendMessage(chatId, message, env);
    return;
  }

  // /bank last - show recently imported bank transactions
  if (textLower.startsWith('/bank last')) {
    const currency = user.currency || 'USD';
    let limit = 20;
    const limitMatch = text.match(/\/bank\s+last\s+(\d+)/i);
    if (limitMatch) limit = Math.min(parseInt(limitMatch[1]), 50);

    // Debug: raw counts by source (no JOIN, no filters)
    const rawCounts = await env.DB.prepare(`
      SELECT source, COUNT(*) as cnt FROM transactions
      WHERE user_id = ? AND source IN ('bank_import', 'saltedge')
      GROUP BY source
    `).bind(user.id).all();

    const result = await env.DB.prepare(`
      SELECT t.*, c.name as category_name, c.emoji as category_emoji
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND t.source IN ('bank_import', 'saltedge')
      ORDER BY t.transaction_date DESC, t.created_at DESC
      LIMIT ?
    `).bind(user.id, limit).all();

    const txList = result.results;

    // Show debug info if mismatch
    const rawTotal = rawCounts.results.reduce((s, r) => s + r.cnt, 0);

    if (txList.length === 0) {
      let debugMsg = `📭 Нет банковских транзакций.\n\n`;
      if (rawTotal > 0) {
        debugMsg += `⚠️ <b>Но в БД найдено ${rawTotal} транз.:</b>\n`;
        for (const r of rawCounts.results) {
          debugMsg += `  ${r.source}: ${r.cnt}\n`;
        }
        debugMsg += `\nuser_id=${user.id}, familyId=${familyId || 'null'}\n`;
        debugMsg += `Попробуй /bank cleanup для исправления`;
      } else {
        debugMsg += `Импортируй через:\n• /bank sync - автосинхронизация\n• /import - загрузить CSV`;
      }
      await sendMessage(chatId, debugMsg, env);
      return;
    }

    let message = `🏦 <b>Последние банковские транзакции (${txList.length}`;
    if (rawTotal > txList.length) message += ` из ${rawTotal}`;
    message += `):</b>\n\n`;
    let currentDate = null;

    for (const tr of txList) {
      const dateStr = new Date(tr.transaction_date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
      if (dateStr !== currentDate) {
        if (currentDate !== null) message += '\n';
        message += `<b>${dateStr}</b>\n`;
        currentDate = dateStr;
      }

      const sign = tr.type === 'expense' ? '-' : '+';
      const srcTag = tr.source === 'saltedge' ? '🔄' : '📄';
      const catEmoji = tr.category_emoji || '❓';
      message += `  ${srcTag} ${catEmoji} ${sign}${tr.amount.toFixed(2)} ${currency}`;
      if (tr.description) message += ` <i>${tr.description.substring(0, 25)}</i>`;
      message += '\n';
    }

    message += `\n<i>🔄 = Open Banking, 📄 = CSV импорт</i>`;

    await sendMessage(chatId, message, env);
    return;
  }

  // /bank disconnect
  if (textLower.startsWith('/bank disconnect')) {
    const connections = await openBankingService.getUserConnections(user.id);

    if (connections.length === 0) {
      await sendMessage(chatId, `❌ Нет подключённых банков`, env);
      return;
    }

    const buttons = connections.map(conn => [
      button(`❌ ${conn.institution_name}`, `bank_disconnect:${conn.id}`)
    ]);

    await sendMessage(chatId,
      `🗑 <b>Отключить банк:</b>\n\nВыбери банк для отключения:`,
      env,
      { reply_markup: inlineKeyboard(buttons) }
    );
    return;
  }

  // /bank debug - show raw DB state for debugging
  if (textLower === '/bank debug') {
    const currency = user.currency || 'USD';

    // 1. All bank_connections for this user (any status)
    const allConns = await env.DB.prepare(`
      SELECT id, requisition_id, institution_id, institution_name, status, saltedge_customer_id, last_sync_at, created_at
      FROM bank_connections WHERE user_id = ?
    `).bind(user.id).all();

    // 2. Count of transactions by source
    const txCounts = await env.DB.prepare(`
      SELECT source, COUNT(*) as cnt, MIN(transaction_date) as min_date, MAX(transaction_date) as max_date
      FROM transactions WHERE user_id = ?
      GROUP BY source
    `).bind(user.id).all();

    // 3. Last 5 bank transactions WITH category_id and family_id for diagnosis
    const lastBankTx = await env.DB.prepare(`
      SELECT t.id, t.amount, t.type, t.source, t.transaction_date, t.description,
             t.category_id, t.family_id, c.name as cat_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND t.source IN ('bank_import', 'saltedge')
      ORDER BY t.created_at DESC LIMIT 5
    `).bind(user.id).all();

    // 4. User info
    const userInfo = await env.DB.prepare(`
      SELECT id, telegram_id, saltedge_customer_id FROM users WHERE id = ?
    `).bind(user.id).first();

    // 5. Count orphan transactions (category_id not in categories table)
    const orphanCount = await env.DB.prepare(`
      SELECT COUNT(*) as cnt FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND c.id IS NULL
    `).bind(user.id).first();

    let msg = `🔧 <b>Bank Debug (user_id=${user.id})</b>\n\n`;

    msg += `<b>👤 User:</b>\n`;
    msg += `  DB id: ${userInfo?.id}, tg: ${userInfo?.telegram_id}\n`;
    msg += `  SE customer: ${userInfo?.saltedge_customer_id || 'none'}\n\n`;

    msg += `<b>🔗 Connections (${allConns.results.length}):</b>\n`;
    for (const c of allConns.results) {
      msg += `  #${c.id} | ${c.status} | ${c.institution_name}\n`;
      msg += `    sync: ${c.last_sync_at || 'never'}\n`;
    }

    msg += `\n<b>📊 Transactions by source:</b>\n`;
    for (const tc of txCounts.results) {
      msg += `  ${tc.source || 'manual'}: ${tc.cnt} (${tc.min_date} → ${tc.max_date})\n`;
    }

    if (orphanCount?.cnt > 0) {
      msg += `\n⚠️ <b>Orphan transactions (bad category_id): ${orphanCount.cnt}</b>\n`;
    }

    if (lastBankTx.results.length > 0) {
      msg += `\n<b>🏦 Last bank tx:</b>\n`;
      for (const tx of lastBankTx.results) {
        msg += `  #${tx.id} | ${tx.type} ${tx.amount} ${currency} | cat_id=${tx.category_id} (${tx.cat_name || 'MISSING!'}) | fam=${tx.family_id || 'null'}\n`;
      }
    } else {
      msg += `\n<i>No bank transactions in DB</i>`;
    }

    await sendMessage(chatId, msg, env);
    return;
  }

  // /bank cleanup - delete old pending connections and fix orphan categories
  if (textLower === '/bank cleanup') {
    let msg = `🧹 <b>Cleanup results:</b>\n\n`;

    // 1. Delete pending connections that were never synced
    const deletedConns = await env.DB.prepare(`
      DELETE FROM bank_connections
      WHERE user_id = ? AND status = 'pending'
      RETURNING id, institution_name
    `).bind(user.id).all();
    msg += `🔗 Deleted ${deletedConns.results.length} pending connections\n`;
    for (const c of deletedConns.results) {
      msg += `  - #${c.id} ${c.institution_name}\n`;
    }

    // 2. Fix orphan transactions (category_id not in categories) → set to "Другое"
    const fallbackExpense = await env.DB.prepare(`
      SELECT id FROM categories WHERE owner_type = 'system' AND name = 'Другое' AND type = 'expense'
    `).first();
    const fallbackIncome = await env.DB.prepare(`
      SELECT id FROM categories WHERE owner_type = 'system' AND name = 'Другое' AND type = 'income'
    `).first();

    if (fallbackExpense) {
      const fixedExpense = await env.DB.prepare(`
        UPDATE transactions SET category_id = ?
        WHERE user_id = ? AND type = 'expense' AND category_id NOT IN (SELECT id FROM categories)
      `).bind(fallbackExpense.id, user.id).run();
      msg += `\n📦 Fixed ${fixedExpense.meta?.changes || 0} expense transactions with missing category`;
    }

    if (fallbackIncome) {
      const fixedIncome = await env.DB.prepare(`
        UPDATE transactions SET category_id = ?
        WHERE user_id = ? AND type = 'income' AND category_id NOT IN (SELECT id FROM categories)
      `).bind(fallbackIncome.id, user.id).run();
      msg += `\n📦 Fixed ${fixedIncome.meta?.changes || 0} income transactions with missing category`;
    }

    // 3. Also fix NULL category_id
    if (fallbackExpense) {
      const fixedNull = await env.DB.prepare(`
        UPDATE transactions SET category_id = ?
        WHERE user_id = ? AND category_id IS NULL
      `).bind(fallbackExpense.id, user.id).run();
      msg += `\n📦 Fixed ${fixedNull.meta?.changes || 0} transactions with NULL category`;
    }

    msg += `\n\n✅ Готово! Попробуй /bank last и /history`;
    await sendMessage(chatId, msg, env);
    return;
  }

  // /bank status
  if (textLower === '/bank status') {
    const connections = await openBankingService.getUserConnections(user.id);

    if (connections.length === 0) {
      await sendMessage(chatId, `📋 Нет подключённых банков`, env);
      return;
    }

    let message = `📋 <b>Статус подключений (${providerName}):</b>\n\n`;

    for (const conn of connections) {
      const health = await openBankingService.checkConnectionHealth(conn);
      const statusEmoji = health.healthy ? '✅' : '❌';
      message += `${statusEmoji} <b>${conn.institution_name}</b>\n`;
      message += `   Статус: ${health.status || health.error}\n`;
      message += `   Последняя синхронизация: ${conn.last_sync_at || 'никогда'}\n\n`;
    }

    await sendMessage(chatId, message, env);
    return;
  }

  // /bank wipe - delete all saltedge/fakebank transactions
  if (textLower === '/bank wipe') {
    const currency = user.currency || 'USD';

    // Count what will be deleted
    const counts = await env.DB.prepare(`
      SELECT source, COUNT(*) as cnt, COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE user_id = ? AND source IN ('saltedge', 'bank_import')
      GROUP BY source
    `).bind(user.id).all();

    if (counts.results.length === 0) {
      await sendMessage(chatId, `📭 Нет банковских транзакций для удаления.`, env);
      return;
    }

    let msg = `⚠️ <b>Удалить ВСЕ банковские транзакции?</b>\n\n`;
    let totalCount = 0;
    for (const r of counts.results) {
      const label = r.source === 'saltedge' ? '🔄 Open Banking' : '📄 CSV импорт';
      msg += `${label}: <b>${r.cnt}</b> транз. (${r.total.toFixed(2)} ${currency})\n`;
      totalCount += r.cnt;
    }
    msg += `\n<b>Итого: ${totalCount} транзакций будут удалены</b>\n`;
    msg += `\n⚠️ Это действие нельзя отменить!`;

    const buttons = [
      buttonRow(
        button(`🗑 Удалить все (${totalCount})`, 'bank_wipe_confirm'),
        button('❌ Отмена', 'bank_wipe_cancel')
      ),
      [button('🔄 Только Open Banking', 'bank_wipe_saltedge')],
      [button('📄 Только CSV', 'bank_wipe_csv')]
    ];

    await sendMessage(chatId, msg, env, { reply_markup: inlineKeyboard(buttons) });
    return;
  }

  // Unknown bank command
  await sendMessage(chatId,
    `❓ Неизвестная команда.\n\n` +
    `<b>Доступные команды:</b>\n` +
    `/bank - меню\n` +
    `/bank connect - подключить банк\n` +
    `/bank sync - синхронизировать\n` +
    `/bank disconnect - отключить\n` +
    `/bank status - статус\n` +
    `/bank wipe - удалить банковские транзакции`,
    env
  );
}

// ============================================
// SCHEDULED NOTIFICATIONS
// ============================================

async function sendDailyReminders(env, userService) {
  console.log('Sending daily reminders...');

  // Get users who have daily_reminder enabled
  const users = await userService.getUsersWithReminders();
  console.log(`Found ${users.length} users with reminders enabled`);

  for (const user of users) {
    try {
      const t = getTranslations(user.language || 'en');
      const message = `⏰ <b>${t.reminderTitle}</b>\n\n${t.reminderText}\n\n💡 ${t.reminderTip}`;

      await sendMessage(user.telegram_id, message, env, {
        reply_markup: inlineKeyboard([
          [button(t.btnDisableReminder, 'notif_daily_toggle')]
        ])
      });

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 100));
    } catch (error) {
      console.error(`Failed to send reminder to ${user.telegram_id}:`, error.message);
    }
  }

  console.log('Daily reminders sent');
}

async function sendMonthlyReports(env, userService, statsService) {
  console.log('Sending monthly reports...');

  // Get users who have monthly_report enabled
  const users = await userService.getUsersWithReports();
  console.log(`Found ${users.length} users with reports enabled`);

  // Previous month
  const prevMonth = new Date();
  prevMonth.setMonth(prevMonth.getMonth() - 1);

  for (const user of users) {
    try {
      const t = getTranslations(user.language || 'en');
      const message = await statsService.generateMonthlyStats(user.id, prevMonth, null, null, user.language, user.currency);

      await sendMessage(user.telegram_id, `📬 <b>${t.monthlyReportTitle}</b>\n\n` + message, env, {
        reply_markup: inlineKeyboard([
          buttonRow(
            button(t.btnExport, 'export'),
            button(t.btnDisableReport, 'notif_monthly_toggle')
          )
        ])
      });

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 200));
    } catch (error) {
      console.error(`Failed to send report to ${user.telegram_id}:`, error.message);
    }
  }

  console.log('Monthly reports sent');
}

async function syncAllBankConnections(env, openBankingService, categoryService, provider = 'nordigen') {
  console.log(`Starting automatic bank sync (${provider})...`);

  // Check if Open Banking is configured
  const isConfigured = env.SALTEDGE_APP_ID || (env.NORDIGEN_SECRET_ID && env.NORDIGEN_SECRET_KEY);
  if (!isConfigured) {
    console.log('Open Banking not configured, skipping bank sync');
    return;
  }

  try {
    // Get all active connections
    const connections = await openBankingService.getActiveConnections();
    console.log(`Found ${connections.length} active bank connections`);

    let totalImported = 0;
    let totalSkipped = 0;
    let syncedUsers = new Set();

    for (const conn of connections) {
      try {
        if (provider === 'saltedge') {
          // Salt Edge flow
          const seConn = await openBankingService.getConnection(conn.requisition_id);

          if (seConn.status === 'active') {
            const result = await openBankingService.syncTransactions(conn, categoryService);
            totalImported += result.imported;
            totalSkipped += result.skipped;

            if (result.imported > 0) {
              syncedUsers.add(conn.telegram_id);
            }
          } else if (seConn.status === 'inactive' || seConn.status === 'disabled') {
            await openBankingService.updateConnectionStatus(conn.requisition_id, 'expired');
            console.log(`Connection ${conn.id} expired`);
          }
        } else {
          // Nordigen flow
          const requisition = await openBankingService.getRequisition(conn.requisition_id);

          if (requisition.status === 'LN' && requisition.accounts?.length > 0) {
            if (!conn.account_ids) {
              await openBankingService.updateConnectionStatus(conn.requisition_id, 'linked', requisition.accounts);
              conn.account_ids = JSON.stringify(requisition.accounts);
            }

            const result = await openBankingService.syncTransactions(conn, categoryService);
            totalImported += result.imported;
            totalSkipped += result.skipped;

            if (result.imported > 0) {
              syncedUsers.add(conn.telegram_id);
            }
          } else if (requisition.status === 'EXPIRED' || requisition.status === 'REJECTED') {
            await openBankingService.updateConnectionStatus(conn.requisition_id, 'expired');
            console.log(`Connection ${conn.id} expired`);
          }
        }

        // Small delay between accounts
        await new Promise(r => setTimeout(r, 500));
      } catch (error) {
        console.error(`Sync error for connection ${conn.id}:`, error.message);
      }
    }

    console.log(`Bank sync complete: ${totalImported} imported, ${totalSkipped} skipped, ${syncedUsers.size} users synced`);

  } catch (error) {
    console.error('Bank sync failed:', error);
  }
}
