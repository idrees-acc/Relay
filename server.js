const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Configuration ---

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
const YOUTUBE_VIDEO_ID = process.env.YOUTUBE_VIDEO_ID || 'dQw4w9WgXcQ';
const LOG_FILE = path.join(__dirname, 'access.csv');

function getUsers() {
  try {
    return JSON.parse(process.env.USERS || '[]');
  } catch {
    console.error('Failed to parse USERS env var. Expected JSON array.');
    return [];
  }
}

// --- CSV Logging ---

function ensureLogFile() {
  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, 'timestamp,event,username,ip\n', 'utf8');
  }
}

function logEvent(event, username, ip) {
  ensureLogFile();
  var timestamp = new Date().toISOString();
  var safeUsername = String(username || '').replace(/,/g, ';');
  var safeIp = String(ip || '').replace(/,/g, ';');
  var line = timestamp + ',' + event + ',' + safeUsername + ',' + safeIp + '\n';
  fs.appendFileSync(LOG_FILE, line, 'utf8');
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

  if (!user) {
    logEvent('login_failed', username, req.ip);
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
    activeSessions.set(username, req.sessionID);
    logEvent('login_success', username, req.ip);
    res.redirect('/watch');
  });
});

// Video page (protected)
app.get('/watch', requireAuth, function (req, res) {
  sendView(res, 'watch.html', { '{{YOUTUBE_VIDEO_ID}}': YOUTUBE_VIDEO_ID });
});

// Logout handler
app.post('/logout', function (req, res) {
  var username = req.session.username;
  if (username) {
    activeSessions.delete(username);
    logEvent('logout', username, req.ip);
  }
  req.session.destroy(function () {
    res.redirect('/');
  });
});

// --- Start ---

app.listen(PORT, function () {
  console.log('Relay running on port ' + PORT);
});
