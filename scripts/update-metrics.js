import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleAuth } from "google-auth-library";
import admin from "firebase-admin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const UPTIMEROBOT_API_KEY = process.env.UPTIMEROBOT_API_KEY;
const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!GA4_PROPERTY_ID) {
  throw new Error("Missing GA4_PROPERTY_ID in environment.");
}
if (!FIREBASE_SERVICE_ACCOUNT) {
  throw new Error("Missing FIREBASE_SERVICE_ACCOUNT in environment.");
}

const auth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/analytics.readonly"]
});

const serviceAccountRaw = await fs.readFile(FIREBASE_SERVICE_ACCOUNT, "utf-8");
const serviceAccount = JSON.parse(serviceAccountRaw);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

const clientsPath = path.join(__dirname, "clients.json");
const clientsRaw = await fs.readFile(clientsPath, "utf-8");
const clients = JSON.parse(clientsRaw);

async function getAccessToken() {
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  return tokenResponse.token;
}

async function ga4Request(body) {
  const token = await getAccessToken();
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GA4 request failed: ${response.status} ${text}`);
  }

  return response.json();
}

function hostnameFilter(hostname) {
  if (!hostname) return undefined;
  return {
    filter: {
      fieldName: "hostName",
      stringFilter: {
        matchType: "EXACT",
        value: hostname
      }
    }
  };
}

async function fetchTotalUsers(hostname) {
  const report = await ga4Request({
    dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
    metrics: [{ name: "totalUsers" }],
    dimensions: hostname ? [{ name: "hostName" }] : [],
    dimensionFilter: hostname ? hostnameFilter(hostname) : undefined
  });

  const value = report?.rows?.[0]?.metricValues?.[0]?.value;
  return Number(value || 0);
}

async function fetchEventCount(eventName, hostname) {
  const report = await ga4Request({
    dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
    metrics: [{ name: "eventCount" }],
    dimensions: [{ name: "eventName" }],
    dimensionFilter: {
      andGroup: {
        expressions: [
          {
            filter: {
              fieldName: "eventName",
              stringFilter: { matchType: "EXACT", value: eventName }
            }
          },
          ...(hostname
            ? [
                {
                  filter: {
                    fieldName: "hostName",
                    stringFilter: { matchType: "EXACT", value: hostname }
                  }
                }
              ]
            : [])
        ]
      }
    }
  });

  const value = report?.rows?.[0]?.metricValues?.[0]?.value;
  return Number(value || 0);
}

async function fetchUptimeRatio(monitorId) {
  if (!UPTIMEROBOT_API_KEY || !monitorId) return null;
  const response = await fetch("https://api.uptimerobot.com/v2/getMonitors", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      api_key: UPTIMEROBOT_API_KEY,
      monitors: monitorId,
      format: "json"
    })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`UptimeRobot request failed: ${response.status} ${text}`);
  }
  const data = await response.json();
  const ratio = data?.monitors?.[0]?.uptime_ratio;
  return ratio ? Number(ratio) : null;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function formatSpeed(ms) {
  if (!ms) return "—";
  const seconds = ms / 1000;
  return `${seconds.toFixed(1)}s`;
}

function statusFromScore(score) {
  if (score == null) return { label: "Pending", tone: "warn" };
  if (score >= 95) return { label: "Excellent", tone: "good" };
  if (score >= 85) return { label: "Great", tone: "good" };
  return { label: "Needs work", tone: "warn" };
}

function statusFromSpeed(seconds) {
  if (seconds == null) return { label: "Pending", tone: "warn" };
  if (seconds <= 2) return { label: "Fast", tone: "good" };
  if (seconds <= 3) return { label: "Good", tone: "warn" };
  return { label: "Slow", tone: "warn" };
}

function statusFromUptime(ratio) {
  if (ratio >= 99.9) return { label: "Stable", tone: "good" };
  if (ratio >= 99) return { label: "Monitor", tone: "warn" };
  return { label: "At risk", tone: "warn" };
}

function buildMetrics({
  uptimeRatio,
  totalUsers,
  contactActions,
  directionClicks,
  formSubmissions
}) {
  const speedSeconds = null;
  const uptimeValue = uptimeRatio ? `${uptimeRatio.toFixed(2)}%` : "—";
  const healthScore = uptimeRatio ? Math.round(uptimeRatio) : null;

  const healthStatus = statusFromScore(healthScore);
  const vitalsStatus = statusFromScore(null);
  const speedStatus = statusFromSpeed(speedSeconds);
  const uptimeStatus = uptimeRatio ? statusFromUptime(uptimeRatio) : { label: "Pending", tone: "warn" };

  return {
    healthScore: healthScore != null ? `${healthScore}%` : "—",
    healthStatus: healthStatus.label,
    healthTone: healthStatus.tone,
    vitalsScore: "—",
    vitalsStatus: vitalsStatus.label,
    vitalsTone: vitalsStatus.tone,
    uptimeValue,
    uptimeStatus: uptimeStatus.label,
    uptimeTone: uptimeStatus.tone,
    speedValue: "—",
    speedStatus: speedStatus.label,
    speedTone: speedStatus.tone,
    trafficValue: formatNumber(totalUsers),
    trafficTrend: "Auto",
    trafficTone: "up",
    actionTrend: "Auto",
    actionTone: "up",
    contactActions: formatNumber(contactActions),
    directionClicks: formatNumber(directionClicks),
    formSubmissions: formatNumber(formSubmissions),
    checklistStatus: "Synced",
    checklistTone: "good",
    nextAudit: "Scheduled: Daily sync",
    lastSync: new Date().toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short"
    })
  };
}

for (const client of clients) {
  const { docId, hostname, uptimeMonitorId } = client;
  if (!docId) {
    throw new Error("Each client needs docId.");
  }

  const totalUsers = await fetchTotalUsers(hostname);
  const contactCalls = await fetchEventCount("call_click", hostname);
  const contactEmails = await fetchEventCount("email_click", hostname);
  const directionClicks = await fetchEventCount("direction_click", hostname);
  const formSubmissions = await fetchEventCount("form_submit", hostname);
  const contactActions = contactCalls + contactEmails;

  const uptimeRatio = await fetchUptimeRatio(uptimeMonitorId);

  const metrics = buildMetrics({
    uptimeRatio,
    totalUsers,
    contactActions,
    directionClicks,
    formSubmissions
  });

  await db.collection("clients").doc(docId).set(
    {
      metrics
    },
    { merge: true }
  );

  console.log(`Updated metrics for ${docId}`);
}
