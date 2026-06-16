# Relay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal Node.js + Express app that authenticates trusted users and serves a protected YouTube video with single-session enforcement.

**Architecture:** Single Express server with in-memory sessions. Two HTML views (login, watch) served via server-side string replacement. Static assets (logo) served from `public/`. No database, no frontend framework, no build step.

**Tech Stack:** Node.js, Express, express-session

**Visual Theme:** Montserrat font, cream background (`#f2f3eb`), pink-to-blue gradient cards, charcoal text (`#474544`), `hussain.png` logo from `idrees-acc/rsvp` repo.

---

## File Structure

```
Relay/
├── server.js              — Express app: routes, auth, session management
├── package.json           — Project metadata and dependencies
├── .gitignore             — Node ignores
├── public/
│   └── hussain.png        — Logo and favicon
└── views/
    ├── login.html         — Login page with form and error display
    └── watch.html         — Video page with embedded YouTube and overlay
```

---

### Task 1: Initialize the Project and Download Logo

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `public/hussain.png`

- [ ] **Step 1: Initialize npm project**

Run:
```bash
cd /Users/accuser/Downloads/Relay
npm init -y
```

Expected: `package.json` created with defaults.

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install express express-session
```

Expected: `node_modules/` created, `package.json` updated with `dependencies`.

- [ ] **Step 3: Set the start script in package.json**

Open `package.json` and replace the `"scripts"` block:

```json
"scripts": {
  "start": "node server.js"
}
```

- [ ] **Step 4: Create .gitignore**

Create `.gitignore` with:

```
node_modules/
```

- [ ] **Step 5: Download the logo**

Run:
```bash
mkdir -p /Users/accuser/Downloads/Relay/public
curl -sL -o /Users/accuser/Downloads/Relay/public/hussain.png "https://raw.githubusercontent.com/idrees-acc/rsvp/master/hussain.png"
```

Expected: `public/hussain.png` downloaded (~92KB).

- [ ] **Step 6: Initialize git and commit**

Run:
```bash
cd /Users/accuser/Downloads/Relay
git init
git add package.json package-lock.json .gitignore public/hussain.png docs/
git commit -m "chore: initialize project with express, express-session, and logo"
```

Expected: Clean initial commit.

---

### Task 2: Create the Login Page

**Files:**
- Create: `views/login.html`

- [ ] **Step 1: Create views directory**

Run:
```bash
mkdir -p /Users/accuser/Downloads/Relay/views
```

- [ ] **Step 2: Create login.html**

Create `views/login.html` with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relay</title>
  <link rel="icon" type="image/png" href="/hussain.png">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: "Montserrat", Arial, sans-serif;
      background: #f2f3eb;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1rem;
    }

    .card {
      background: linear-gradient(
        90deg,
        rgba(238, 174, 202, 1) 0%,
        rgba(154, 186, 231, 1) 93%,
        rgba(148, 187, 233, 1) 100%
      );
      border: solid 3px #474544;
      border-radius: 1cm;
      padding: 2.5rem 2rem;
      width: 100%;
      max-width: 380px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .logo {
      width: 100px;
      height: auto;
      margin-bottom: 0.75rem;
    }

    h1 {
      font-size: 1.5rem;
      color: #474544;
      text-align: center;
      margin-bottom: 1.25rem;
      letter-spacing: 5px;
      text-transform: uppercase;
      font-weight: 700;
    }

    .underline {
      border-bottom: solid 2px #474544;
      margin: 0 auto 1.5rem;
      width: 80px;
    }

    label {
      display: block;
      font-size: 0.95rem;
      color: #474544;
      margin-bottom: 0.35rem;
      font-weight: 500;
      width: 100%;
      text-align: left;
    }

    input[type="text"],
    input[type="password"] {
      width: 100%;
      padding: 0.75rem 0;
      font-size: 1rem;
      font-family: "Montserrat", Arial, sans-serif;
      background: none;
      border: none;
      border-bottom: solid 2px #474544;
      color: #474544;
      margin-bottom: 1.25rem;
      outline: none;
      letter-spacing: 1px;
      transition: border-color 0.3s;
    }

    input:focus {
      border-bottom-color: #8b1a2b;
    }

    input::placeholder {
      color: #474544;
    }

    form {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    button {
      background: none;
      border: solid 2px #474544;
      color: #474544;
      cursor: pointer;
      font-family: "Montserrat", Arial, sans-serif;
      font-size: 0.875rem;
      font-weight: bold;
      padding: 15px 35px;
      text-transform: uppercase;
      transition: all 0.3s;
      margin-top: 0.5rem;
    }

    button:hover {
      background: #474544;
      color: #f2f3eb;
    }

    .error {
      color: #c0392b;
      font-size: 0.9rem;
      text-align: center;
      margin-bottom: 1rem;
      min-height: 1.25rem;
      font-weight: 500;
    }

    @media screen and (max-width: 480px) {
      .card {
        border-radius: 0;
        border: none;
        min-height: 100vh;
        justify-content: center;
        max-width: 100%;
        padding: 2rem 1.5rem;
      }

      h1 {
        font-size: 1.25rem;
      }

      button {
        padding: 12px 25px;
      }
    }
  </style>
</head>
<body>
  <div class="card">
    <img src="/hussain.png" alt="Relay" class="logo">
    <h1>Relay</h1>
    <div class="underline"></div>
    <div class="error">{{ERROR_MESSAGE}}</div>
    <form method="POST" action="/login">
      <label for="username">Username</label>
      <input type="text" id="username" name="username" placeholder="Username" autocomplete="username" required>
      <label for="password">Password</label>
      <input type="password" id="password" name="password" placeholder="Password" autocomplete="current-password" required>
      <button type="submit">Confirm</button>
    </form>
  </div>
</body>
</html>
```

The `{{ERROR_MESSAGE}}` placeholder will be replaced server-side. When there is no error, it will be replaced with an empty string.

- [ ] **Step 3: Commit**

Run:
```bash
git add views/login.html
git commit -m "feat: add login page with RSVP theme"
```

---

### Task 3: Create the Video Page

**Files:**
- Create: `views/watch.html`

- [ ] **Step 1: Create watch.html**

Create `views/watch.html` with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relay</title>
  <link rel="icon" type="image/png" href="/hussain.png">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: "Montserrat", Arial, sans-serif;
      background: #f2f3eb;
      min-height: 100vh;
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 2rem;
      background: linear-gradient(
        90deg,
        rgba(238, 174, 202, 1) 0%,
        rgba(154, 186, 231, 1) 93%,
        rgba(148, 187, 233, 1) 100%
      );
      border-bottom: solid 2px #474544;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .header-logo {
      width: 40px;
      height: auto;
    }

    header h1 {
      font-size: 1.1rem;
      color: #474544;
      letter-spacing: 5px;
      text-transform: uppercase;
      font-weight: 700;
    }

    .logout-btn {
      background: none;
      border: solid 2px #474544;
      color: #474544;
      cursor: pointer;
      font-family: "Montserrat", Arial, sans-serif;
      font-size: 0.8rem;
      font-weight: bold;
      padding: 8px 20px;
      text-transform: uppercase;
      transition: all 0.3s;
    }

    .logout-btn:hover {
      background: #474544;
      color: #f2f3eb;
    }

    main {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
      min-height: calc(100vh - 65px);
    }

    .video-container {
      position: relative;
      width: 100%;
      max-width: 800px;
      aspect-ratio: 16 / 9;
      background: #000;
      border-radius: 8px;
      overflow: hidden;
      user-select: none;
      -webkit-user-select: none;
      border: solid 2px #474544;
    }

    .video-container iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: none;
    }

    .video-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10;
      cursor: pointer;
    }

    .video-overlay.hidden {
      display: none;
    }

    @media screen and (max-width: 480px) {
      header {
        padding: 0.5rem 1rem;
      }

      header h1 {
        font-size: 0.9rem;
        letter-spacing: 3px;
      }

      .header-logo {
        width: 30px;
      }

      .logout-btn {
        padding: 6px 14px;
        font-size: 0.75rem;
      }
    }
  </style>
</head>
<body>
  <header>
    <div class="header-left">
      <img src="/hussain.png" alt="Relay" class="header-logo">
      <h1>Relay</h1>
    </div>
    <form method="POST" action="/logout">
      <button type="submit" class="logout-btn">Log out</button>
    </form>
  </header>
  <main>
    <div class="video-container">
      <iframe
        src="https://www.youtube-nocookie.com/embed/{{YOUTUBE_VIDEO_ID}}"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
      <div class="video-overlay" id="overlay"></div>
    </div>
  </main>
  <script>
    var overlay = document.getElementById('overlay');
    overlay.addEventListener('click', function () {
      overlay.classList.add('hidden');
    });
    document.querySelector('.video-container').addEventListener('mouseleave', function () {
      overlay.classList.remove('hidden');
    });
    overlay.addEventListener('contextmenu', function (e) {
      e.preventDefault();
    });
  </script>
</body>
</html>
```

The `{{YOUTUBE_VIDEO_ID}}` placeholder will be replaced server-side with the value from the environment variable before sending to the client.

The overlay starts visible (blocking right-click). User clicks once to interact with the YouTube player. Overlay returns when the mouse leaves the container.

- [ ] **Step 2: Commit**

Run:
```bash
git add views/watch.html
git commit -m "feat: add video page with YouTube embed, overlay, and RSVP theme"
```

---

### Task 4: Build the Express Server

**Files:**
- Create: `server.js`

- [ ] **Step 1: Create server.js**

Create `server.js` with:

```js
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Configuration ---

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
const YOUTUBE_VIDEO_ID = process.env.YOUTUBE_VIDEO_ID || 'dQw4w9WgXcQ';

function getUsers() {
  try {
    return JSON.parse(process.env.USERS || '[]');
  } catch {
    console.error('Failed to parse USERS env var. Expected JSON array.');
    return [];
  }
}

// --- Middleware ---

app.use(express.urlencoded({ extended: false }));

// Serve static files (logo, favicon)
app.use(express.static(path.join(__dirname, 'public')));

const sessionStore = new session.MemoryStore();

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
const activeSessions = new Map();

// --- Helper: read and inject HTML ---

function sendView(res, viewName, replacements) {
  const filePath = path.join(__dirname, 'views', viewName);
  let html = fs.readFileSync(filePath, 'utf8');
  for (const [placeholder, value] of Object.entries(replacements)) {
    html = html.replace(placeholder, value);
  }
  res.send(html);
}

// --- Auth Middleware ---

function requireAuth(req, res, next) {
  if (!req.session.username) {
    return res.redirect('/');
  }
  // Verify this session is still the active one for this user
  const activeSessionId = activeSessions.get(req.session.username);
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
  }
  req.session.destroy(function () {
    res.redirect('/');
  });
});

// --- Start ---

app.listen(PORT, function () {
  console.log('Relay running on port ' + PORT);
});
```

- [ ] **Step 2: Test locally**

Set env vars and run:

```bash
USERS='[{"username":"test","password":"test123"}]' YOUTUBE_VIDEO_ID='dQw4w9WgXcQ' node server.js
```

Expected: `Relay running on port 3000` in the terminal.

- [ ] **Step 3: Verify login flow manually**

1. Open `http://localhost:3000` in a browser.
2. See the login form with the hussain.png logo and "Relay" heading on the gradient card.
3. Enter wrong credentials — see "Invalid username or password" in red.
4. Enter `test` / `test123` — redirected to `/watch`.
5. See the YouTube video embedded with the overlay. Header shows logo + "Relay" on the left, "Log out" on the right.
6. Click "Log out" — redirected to `/`.

- [ ] **Step 4: Verify single-session enforcement manually**

1. Log in as `test` in Browser A (or normal window).
2. Log in as `test` in Browser B (or incognito window).
3. Go back to Browser A, click anything or refresh — redirected to login page.

- [ ] **Step 5: Commit**

Run:
```bash
git add server.js
git commit -m "feat: add Express server with auth, single-session, and video route"
```

---

### Task 5: Deploy to Render.com

**Files:** None — this is a deployment task.

- [ ] **Step 1: Create a GitHub repository**

Run:
```bash
cd /Users/accuser/Downloads/Relay
gh repo create Relay --public --source=. --push
```

Expected: Repository created on GitHub, code pushed.

If `gh` is not installed or not authenticated, create the repo manually on GitHub and push:

```bash
git remote add origin https://github.com/<your-username>/Relay.git
git push -u origin main
```

- [ ] **Step 2: Create a Web Service on Render.com**

1. Go to https://dashboard.render.com
2. Click **New** → **Web Service**
3. Connect your GitHub account if not already connected.
4. Select the **Relay** repository.
5. Configure:
   - **Name:** `relay`
   - **Region:** Choose closest to your users
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** `Free`

- [ ] **Step 3: Set environment variables on Render**

In the Render dashboard for your service, go to **Environment** and add:

| Key | Value |
|-----|-------|
| `USERS` | `[{"username":"ali","password":"yourpassword"}]` |
| `SESSION_SECRET` | A random string (e.g., run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` to generate one) |
| `YOUTUBE_VIDEO_ID` | The video ID from your YouTube URL (the part after `v=`) |

- [ ] **Step 4: Deploy and verify**

1. Render auto-deploys after setup. Wait for the build to complete (1-2 minutes).
2. Open the Render URL (e.g., `https://relay-xxxx.onrender.com`).
3. Verify: login page loads with gradient card and hussain.png logo, credentials work, video plays, logout works.
4. Verify single-session: log in on two devices/browsers, confirm the first gets kicked.

- [ ] **Step 5: Commit any final adjustments**

If any tweaks were needed during deployment, commit them:

```bash
git add -A
git commit -m "chore: deployment adjustments"
git push
```

---

## Summary

| Task | What It Does | Commit Message |
|------|-------------|----------------|
| 1 | Project setup, dependencies, logo download, git init | `chore: initialize project with express, express-session, and logo` |
| 2 | Login page with RSVP gradient theme and logo | `feat: add login page with RSVP theme` |
| 3 | Video page with YouTube embed, overlay, RSVP theme | `feat: add video page with YouTube embed, overlay, and RSVP theme` |
| 4 | Express server with auth, single-session, static serving | `feat: add Express server with auth, single-session, and video route` |
| 5 | Deploy to Render.com via GitHub | `chore: deployment adjustments` (if needed) |
