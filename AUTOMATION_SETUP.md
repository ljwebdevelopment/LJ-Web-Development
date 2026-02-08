# Automatic Dashboard Metrics (Beginner Guide)

This guide shows you how to **automatically** update the dashboard metrics every day.

## ✅ What you will set up
1. Google Analytics 4 (GA4) access
2. UptimeRobot (free uptime monitoring)
3. A small script that writes the metrics into Firestore
4. A daily schedule (cron)

---

## 1) Add GA4 to your website (required for traffic + events)
You need a **Measurement ID** (starts with `G-`).
1. Go to **Google Analytics → Admin → Data Streams**.
2. Click your web data stream.
3. Copy the **Measurement ID**.
4. Add the GA4 script to your site (I can add it once you send the ID).

### Event names this dashboard expects
These are already wired in `script.js`:
- `call_click`
- `email_click`
- `direction_click`
- `form_submit`

If you want call tracking, add a clickable phone link and we’ll tag it.

---

## 2) Set up a free uptime monitor (UptimeRobot)
1. Go to: https://uptimerobot.com/
2. Create a free account.
3. Add a **monitor** for your website.
4. Go to **My Settings → API Settings** and copy your **API Key**.
5. Use the **Main API Key** (not the monitor-specific key).
6. Copy the **monitor ID** for your site.

---

## 3) Prepare your Firestore service account
You need a service account JSON file with access to Firestore:
1. Go to **Firebase Console → Project Settings → Service Accounts**.
2. Click **Generate new private key**.
3. Save the JSON file somewhere safe on your computer.

---

## 4) Create your environment file
Copy the example file:
```bash
cp scripts/.env.example scripts/.env
```

Open `scripts/.env` and fill in your values:
```
GA4_PROPERTY_ID=522365420
UPTIMEROBOT_API_KEY=YOUR_UPTIMEROBOT_API_KEY
FIREBASE_SERVICE_ACCOUNT=/absolute/path/to/service-account.json
```

---

## 5) Set up the client list
Copy the example file:
```bash
cp scripts/clients.example.json scripts/clients.json
```

Edit `scripts/clients.json`:
```json
[
  {
    "docId": "CLIENT_DOCUMENT_ID",
    "hostname": "example.com",
    "uptimeMonitorId": "123456789"
  }
]
```

**Tip:** Your Firestore doc ID is the client’s document ID in the `clients` collection.

---

## 6) Install dependencies
```bash
npm install
```

---

## 7) Run the script once (manual test)
```bash
set -a
source scripts/.env
set +a
npm run update:metrics
```

If it works, your Firestore document will now include a `metrics` object.

---

## 8) Schedule it daily (Linux/Mac)
Edit your crontab:
```bash
crontab -e
```

Add this line (runs at 3 AM daily):
```
0 3 * * * cd /path/to/LJ-Web-Development && set -a && source scripts/.env && set +a && npm run update:metrics
```

---

## ✅ What the dashboard will show
Once the script runs, the dashboard will auto-update:
- Health score
- Core Web Vitals
- Uptime
- Traffic & actions
- Last updated time

The dashboard reads these metrics automatically from Firestore.
