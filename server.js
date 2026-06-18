const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { google } = require('googleapis');

const app = express();
app.set('trust proxy', true);
const PORT = process.env.PORT || 3000;

// --- Configuration ---

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || '1dbzFhRCmHLnlB6vI2dpgbXOTKlx8xrgEAK5BhuqdJLM';

function getUsers() {
  try {
    return JSON.parse(process.env.USERS || '[]');
  } catch (e) {
    console.error('Failed to parse USERS env var:', e.message);
    return [];
  }
}

// --- YouTube Video ID Cache (from Sheet2) ---

var cachedVideoId = 'ih_YKfiSzCs';
var videoIdLastFetched = 0;
var CACHE_TTL = 60 * 1000; // refresh from sheet every 1 minute

function extractVideoId(value) {
  var str = String(value || '').trim();
  var match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
  return str;
}

async function fetchVideoId() {
  var now = Date.now();
  if (now - videoIdLastFetched < CACHE_TTL) {
    return cachedVideoId;
  }

  try {
    var sheets = getSheetsClient();
    var result = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: 'Sheet2!B1'
    });

    var rows = result.data.values || [];
    if (rows[0] && rows[0][0]) {
      cachedVideoId = extractVideoId(rows[0][0]);
    }
    videoIdLastFetched = now;
  } catch (err) {
    console.error('Failed to fetch video ID from Sheet2:', err.message);
  }

  return cachedVideoId;
}

// --- Google Sheets Logging ---

function getSheetsClient() {
  var auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({ version: 'v4', auth: auth });
}

function getISTTimestamp() {
  return new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

function parseDevice(userAgent) {
  var ua = String(userAgent || '');
  if (!ua) return 'Unknown';

  var device = '';

  if (/iPhone/.test(ua)) device = 'iPhone';
  else if (/iPad/.test(ua)) device = 'iPad';
  else if (/Android/.test(ua)) device = 'Android';
  else if (/Windows/.test(ua)) device = 'Windows';
  else if (/Macintosh|Mac OS/.test(ua)) device = 'Mac';
  else if (/Linux/.test(ua)) device = 'Linux';
  else device = 'Other';

  if (/Edg\//.test(ua)) device += ' / Edge';
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) device += ' / Chrome';
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) device += ' / Safari';
  else if (/Firefox\//.test(ua)) device += ' / Firefox';

  return device;
}

function httpGet(url) {
  var client = url.startsWith('https') ? https : http;
  return new Promise(function (resolve) {
    var req = client.get(url, { headers: { 'User-Agent': 'Relay/1.0' } }, function (res) {
      var data = '';
      res.on('data', function (chunk) { data += chunk; });
      res.on('end', function () { resolve(data); });
    });
    req.on('error', function () { resolve(''); });
    req.setTimeout(3000, function () { req.destroy(); resolve(''); });
  });
}

function fetchLocation(ip) {
  var cleanIp = String(ip || '').replace(/^::ffff:/, '');
  var empty = { country: '', state: '', city: '', location: '' };

  return httpGet('http://ip-api.com/json/' + encodeURIComponent(cleanIp) + '?fields=status,country,regionName,city,lat,lon')
    .then(function (data) {
      if (!data) return empty;
      var json = JSON.parse(data);
      if (json.status !== 'success') return empty;

      var result = {
        country: json.country || '',
        state: json.regionName || '',
        city: json.city || '',
        location: ''
      };

      if (!json.lat || !json.lon) return result;

      return httpGet('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + json.lat + '&lon=' + json.lon + '&zoom=18&addressdetails=0')
        .then(function (geoData) {
          if (geoData) {
            try {
              var geo = JSON.parse(geoData);
              result.location = geo.display_name || '';
            } catch (e) {}
          }
          return result;
        });
    })
    .catch(function () {
      return empty;
    });
}

function logEvent(event, username, ip, userAgent, fingerprint) {
  var timestamp = getISTTimestamp();
  var device = parseDevice(userAgent);

  fetchLocation(ip).then(function (loc) {
    var row = [timestamp, event, String(username || ''), String(ip || ''), device, loc.country, loc.state, loc.city, loc.location, String(fingerprint || '')];

    var sheets = getSheetsClient();
    sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: 'Sheet1!A:J',
      valueInputOption: 'RAW',
      requestBody: { values: [row] }
    }).catch(function (err) {
      console.error('Failed to log to Google Sheet:', err.message);
    });
  });
}

// --- Middleware ---

app.use(express.urlencoded({ extended: false }));

// Serve static files (logo, favicon)
app.use(express.static(path.join(__dirname, 'public')));

var sessionStore = new session.MemoryStore();

app.use(session({
  store: sessionStore,
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// --- Single-Session Enforcement ---

// Maps username -> sessionId
var activeSessions = new Map();

// --- Helper: read and inject HTML ---

function sendView(res, viewName, replacements) {
  var filePath = path.join(__dirname, 'views', viewName);
  var html = fs.readFileSync(filePath, 'utf8');
  for (var placeholder of Object.keys(replacements)) {
    html = html.replace(placeholder, replacements[placeholder]);
  }
  res.send(html);
}

// --- Auth Middleware ---

function requireAuth(req, res, next) {
  if (!req.session.username) {
    return res.redirect('/');
  }
  // Verify this session is still the active one for this user
  var activeSessionId = activeSessions.get(req.session.username);
  if (activeSessionId !== req.sessionID) {
    req.session.destroy(function () {
      res.redirect('/');
    });
    return;
  }
  next();
}

// --- Routes ---

// Login page
app.get('/', function (req, res) {
  if (req.session.username) {
    return res.redirect('/watch');
  }
  sendView(res, 'login.html', { '{{ERROR_MESSAGE}}': '' });
});

// Login handler
app.post('/login', function (req, res) {
  var username = req.body.username;
  var password = req.body.password;
  var users = getUsers();
  var user = users.find(function (u) {
    return u.username === username && u.password === password;
  });

  var fingerprint = req.body.fingerprint || '';

  if (!user) {
    logEvent('login_failed', username, req.ip, req.headers['user-agent'], fingerprint);
    return sendView(res, 'login.html', {
      '{{ERROR_MESSAGE}}': 'Invalid username or password'
    });
  }

  // Kill previous session for this user if one exists
  var previousSessionId = activeSessions.get(username);
  if (previousSessionId) {
    sessionStore.destroy(previousSessionId, function () {});
  }

  // Regenerate session to prevent fixation
  req.session.regenerate(function (err) {
    if (err) {
      return sendView(res, 'login.html', {
        '{{ERROR_MESSAGE}}': 'Something went wrong. Please try again.'
      });
    }
    req.session.username = username;
    req.session.fingerprint = fingerprint;
    activeSessions.set(username, req.sessionID);
    logEvent('login_success', username, req.ip, req.headers['user-agent'], fingerprint);
    res.redirect('/watch');
  });
});

// Video page (protected)
app.get('/watch', requireAuth, async function (req, res) {
  var videoId = await fetchVideoId();
  sendView(res, 'watch.html', { '{{YOUTUBE_VIDEO_ID}}': videoId });
});


// Logout handler
app.post('/logout', function (req, res) {
  var username = req.session.username;
  var fingerprint = req.session.fingerprint || '';
  if (username) {
    activeSessions.delete(username);
    logEvent('logout', username, req.ip, req.headers['user-agent'], fingerprint);
  }
  req.session.destroy(function () {
    res.redirect('/');
  });
});

// --- Start ---

app.listen(PORT, function () {
  console.log('Relay running on port ' + PORT);
});
