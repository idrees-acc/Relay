# Relay — Design Spec

## Overview

Relay is a minimal, secure website that lets trusted users log in and watch a single embedded YouTube video. Access is temporary and manually provisioned — no sign-up flow, no admin panel.

## Architecture

A single Node.js + Express app deployed on Render.com. It serves both the API and the HTML pages.

```
User's Browser
    |
    v
Render.com (Node.js + Express)
    ├── GET /           → Login page (HTML)
    ├── POST /login     → Authenticate, create session, kill previous session
    ├── GET /watch      → Video page (protected, requires valid session)
    ├── POST /logout    → Destroy session, redirect to login
    └── express-session → In-memory session store
```

**No database.** User credentials are stored in a Render environment variable as a JSON array.

**No frontend framework.** Plain HTML/CSS. Two pages: login and video.

**Sessions** are managed by `express-session` with the default in-memory store. A `Map` tracks `username → sessionId` for single-session enforcement. Sessions are lost on service restart — users simply log in again.

## Authentication

### Credentials

Stored in the `USERS` environment variable on Render:

```json
[{"username":"ali","password":"mypass123"},{"username":"sara","password":"hello456"}]
```

Plain text passwords. Acceptable trade-off for temporary trusted access. Anyone with Render dashboard access can read them.

### Login Flow

1. User submits username + password on the login form.
2. Server parses the `USERS` env var and looks up the username.
3. Server compares the submitted password with a simple string match.
4. **If valid:**
   - Check the active sessions Map for this username.
   - If a previous session exists, destroy it (previous user gets kicked).
   - Create a new session, store `username → sessionId` in the Map.
   - Redirect to `/watch`.
5. **If invalid:** Re-render login page with "Invalid username or password" error.

### Single-Session Enforcement

- A server-side `Map<string, string>` maps `username → sessionId`.
- On login, if the username already has an active session, that session is destroyed in the session store.
- When the kicked user next interacts, their session is gone and they are redirected to `/`.

### Session Protection

- The `/watch` route checks `req.session.username`.
- If no valid session, redirect to `/`.

### Logout

Removed. Users remain logged in until their session expires (24h) or another login for the same username kicks them.

## YouTube Embed Protection

### What we do

- Embed via `youtube-nocookie.com` (privacy-enhanced mode).
- Wrap the iframe in a container with a transparent overlay `div` to block right-click context menu on the iframe.
- Apply `user-select: none` on the video container.
- The YouTube video ID is stored in the `YOUTUBE_VIDEO_ID` env var and only rendered server-side for authenticated users. It never appears in publicly accessible page source.
- YouTube branding on the player is expected and acceptable.

### Honest limitation

A determined user with browser DevTools can inspect the iframe `src` attribute and extract the video ID. No client-side technique can fully prevent this. For trusted temporary access, the above measures are proportionate.

## UI Design

### Visual Theme (derived from the RSVP project)

- **Logo:** `hussain.png` from `idrees-acc/rsvp` repo — deep maroon Arabic calligraphy on transparent background. Used as both logo and favicon.
- **Background:** `#f2f3eb` (warm off-white/cream)
- **Card/container gradient:** `rgba(238, 174, 202, 1)` pink → `rgba(154, 186, 231, 1)` soft blue
- **Text/borders:** `#474544` (dark charcoal)
- **Font:** Montserrat (400, 700) via Google Fonts
- **Accent:** Maroon from the logo (~`#8b1a2b`)
- **Buttons:** Charcoal border on transparent, fills charcoal on hover with cream text

### Login Page (`/`)

- Cream background, centered card with pink-to-blue gradient.
- `hussain.png` logo centered at top of card.
- "Relay" as text heading below the logo.
- Username field, password field, "Confirm" button (charcoal bordered style).
- Inline error message area for bad credentials.
- No sign-up link, no forgot password.

### Video Page (`/watch`)

- Cream background.
- Header bar with `hussain.png` logo (small, top-left) and "Relay" text.
- Centered, responsive YouTube player (scales to screen width, max ~800px).
- Transparent overlay on the video container.
- No logout button. No navigation, no sidebar.

### Accessibility

- Large, readable font sizes (Montserrat).
- High contrast: charcoal `#474544` on cream `#f2f3eb`.
- Big click targets for form fields and buttons.
- Responsive layout — works on mobile and desktop.
- Serves all age groups by being simple with nothing confusing.

## Login Logging

Every successful login is appended to `logs/logins.csv` with columns:

| Column | Source |
|--------|--------|
| `timestamp` | Server UTC time |
| `username` | Submitted username |
| `ip` | `req.ip` |
| `user_agent` | `req.headers['user-agent']` |
| `fingerprint` | Browser fingerprint via Fingerprint2.js, submitted as hidden form field |

The CSV file is ephemeral on Render's free tier (lost on redeploy/restart). Acceptable for temporary access.

Fingerprint2.js is included from the RSVP repo (`idrees-acc/rsvp`) and loaded on the login page. It generates a browser fingerprint before form submission and populates a hidden field.

## User Management

Users are stored in the `USERS` environment variable on Render as a JSON array.

A local CLI script `scripts/manage-users.js` helps manage the user list:

- `node scripts/manage-users.js add <username> <password>` — adds a user and outputs the updated JSON
- `node scripts/manage-users.js remove <username>` — removes a user and outputs the updated JSON
- `node scripts/manage-users.js list` — lists current usernames

The script reads from stdin or a `--current` flag with the existing USERS JSON, outputs the new value to copy-paste into Render's env var dashboard.

## Project Structure

```
Relay/
├── server.js              — Express app (auth, sessions, routes)
├── package.json           — Dependencies (express, express-session)
├── public/
│   ├── hussain.png        — Logo and favicon
│   └── fingerprint2.js    — Browser fingerprinting library
├── scripts/
│   └── manage-users.js    — CLI tool to add/remove users
├── logs/                  — Created at runtime, gitignored
│   └── logins.csv         — Login event log
└── views/
    ├── login.html         — Login page
    └── watch.html         — Video page
```

## Deployment (Render.com)

### Setup

1. Initialize a git repo and push to GitHub.
2. Create a new **Web Service** on Render.com, connect the GitHub repo.
3. Configure:
   - **Build command:** `npm install`
   - **Start command:** `node server.js`
4. Set environment variables:
   - `USERS` — JSON array of `{username, password}` objects.
   - `SESSION_SECRET` — A random string for signing session cookies.
   - `YOUTUBE_VIDEO_ID` — The YouTube video ID (the part after `v=` in the URL).

### Free Tier Notes

- Service spins down after 15 minutes of inactivity.
- First visit after spin-down takes ~30 seconds (cold start).
- 750 free hours/month.
- Auto-deploys on every push to `main`.

## Dependencies

- `express` — Web framework.
- `express-session` — Session middleware.

Two dependencies total. No build step.

## What Is Not Included

- No database.
- No sign-up or registration page.
- No password hashing (plain text, accepted for this use case).
- No rate limiting or account lockout.
- No admin panel — video and users are changed by editing env vars / code.
- No CI/CD pipeline — Render handles deploys from git.
