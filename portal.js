// Firebase config (SAFE to expose)
const firebaseConfig = {
  apiKey: "AIzaSyDBPFR35ijo-UTfnC22y0FR2rVMBVo5RE0",
  authDomain: "lj-web-development-portal.firebaseapp.com",
  projectId: "lj-web-development-portal",
  storageBucket: "lj-web-development-portal.firebasestorage.app",
  messagingSenderId: "1027196050099",
  appId: "1:1027196050099:web:38e50f1be663ec14d62ec6"
};

// ============================
// GOOGLE SHEETS ENDPOINT
// 1) Deploy your Apps Script as a Web App
// 2) Paste the Web App URL here
// ============================
const SUPPORT_ENDPOINT_URL = "https://script.google.com/macros/s/AKfycbx5FpCO8UIzHZ86BQ5CH20tjPL3zMHq5kEHJM8Kwv2AKhTTW-J8tA8kzlsXTgrGzyHB2Q/exec";

// Init Firebase safely
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();

// Firestore is OPTIONAL on login page; required on dashboard page if you show client data
const hasFirestore = typeof firebase.firestore === "function";
const db = hasFirestore ? firebase.firestore() : null;

/* ============================
   HELPERS
============================ */
function isDashboardPage() {
  const path = (window.location.pathname || "").toLowerCase();
  return path.includes("dashboard");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setHref(id, text, href) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  if ("href" in el) el.href = href || "#";
}

function safeString(v) {
  return (v === null || v === undefined) ? "" : String(v);
}

function friendlyAuthError(err) {
  const code = err?.code || "";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "Incorrect email or password.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many attempts. Please wait a minute and try again.";
  }
  if (code === "auth/invalid-email") {
    return "Please enter a valid email address.";
  }
  if (code === "auth/network-request-failed") {
    return "Network error. Check your connection and try again.";
  }
  if (code === "auth/unauthorized-domain") {
    return "This domain isn’t authorized in Firebase yet. Add ljwebdevelopment.com in Firebase Auth → Settings → Authorized domains.";
  }
  return err?.message || "Something went wrong. Please try again.";
}

function setButtonLoading(btn, loadingText = "Working…") {
  if (!btn) return () => {};
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.style.opacity = "0.9";
  btn.textContent = loadingText;

  return () => {
    btn.disabled = false;
    btn.style.opacity = "";
    btn.textContent = originalText;
  };
}

function getCheckedRadioValue(name) {
  const chosen = document.querySelector(`input[name="${name}"]:checked`);
  return chosen ? chosen.value : "";
}

function setAvatarFromFavicon(imgEl, faviconUrl, fallbackName = "Client") {
  if (!imgEl) return;

  const fallbackSvg = `data:image/svg+xml;charset=utf-8,` + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fff7ed"/>
          <stop offset="1" stop-color="#ffffff"/>
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#g)"/>
      <text x="60" y="70" text-anchor="middle" font-family="Poppins, Arial" font-size="44" font-weight="800" fill="#0f172a">
        ${fallbackName.trim().slice(0,1).toUpperCase() || "C"}
      </text>
    </svg>
  `);

  imgEl.referrerPolicy = "no-referrer";
  imgEl.alt = "";

  if (faviconUrl) {
    imgEl.src = faviconUrl;
    imgEl.onerror = () => { imgEl.src = fallbackSvg; };
  } else {
    imgEl.src = fallbackSvg;
  }
}

/* ============================
   LOGIN
============================ */
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const rememberMe = document.getElementById("rememberMe");
const loginButton = loginForm ? loginForm.querySelector('button[type="submit"]') : null;

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailEl = document.getElementById("email");
    const passEl = document.getElementById("password");

    const email = (emailEl ? emailEl.value : "").trim();
    const password = passEl ? passEl.value : "";

    if (loginError) loginError.textContent = "";

    const stopLoading = setButtonLoading(loginButton, "Signing in…");

    try {
  await fetch(SUPPORT_ENDPOINT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });

  // With no-cors, the browser won’t let us read the response.
  // If the request is dispatched, we treat it as success.
  form.reset();
  if (impactNum) impactNum.textContent = "5";
  if (toast) toast.style.display = "block";
} catch (err) {
  if (errBox) errBox.textContent = "Couldn’t send request. Please try again in a moment.";
  console.error("Support submit error:", err);
} finally {
  stopLoading();
}

  });
}

/* ============================
   DASHBOARD (protected + data + support form)
============================ */
auth.onAuthStateChanged(async (user) => {
  // If you hit dashboard without a user, go to login
  if (!user && isDashboardPage()) {
    window.location.href = "login.html";
    return;
  }

  // Only run dashboard logic if dashboard DOM exists
  const planEl = document.getElementById("plan");
  if (!user || !planEl) return;

  // Profile header elements (from new dashboard.html)
  const helloNameEl = document.getElementById("helloName");
  const emailMetaEl = document.getElementById("emailMeta");
  const planMetaEl = document.getElementById("planMeta");
  const websiteMetaEl = document.getElementById("websiteMeta");
  const avatarImg = document.getElementById("clientAvatar");

  // Default: we ALWAYS can show email from auth
  if (emailMetaEl) emailMetaEl.textContent = user.email || "—";

  // If no Firestore, we can still show basics and keep support form working
  if (!db) {
    console.warn("Firestore not loaded. Add firebase-firestore-compat.js to dashboard.html if you want client data.");

    setText("plan", "—");
    setText("lastUpdate", "—");
    setText("notes", "Firestore not enabled on this page.");

    setText("planMeta", "—");
    setHref("website", "—", "#");
    setHref("websiteMeta", "—", "#");

    if (helloNameEl) helloNameEl.textContent = user.email ? user.email.split("@")[0] : "Client";
    setAvatarFromFavicon(avatarImg, "", helloNameEl?.textContent || "Client");

    initSupportForm({
      uid: user.uid,
      email: user.email || "",
      businessName: helloNameEl?.textContent || "Client",
      website: "",
      plan: ""
    });

    return;
  }

  try {
    const snap = await db.collection("clients").doc(user.uid).get();

    if (!snap.exists) {
      setText("plan", "—");
      setText("lastUpdate", "—");
      setText("notes", "No client record found.");

      setText("planMeta", "—");
      setHref("website", "—", "#");
      setHref("websiteMeta", "—", "#");

      const fallbackName = user.email ? user.email.split("@")[0] : "Client";
      if (helloNameEl) helloNameEl.textContent = fallbackName;
      setAvatarFromFavicon(avatarImg, "", fallbackName);

      initSupportForm({
        uid: user.uid,
        email: user.email || "",
        businessName: fallbackName,
        website: "",
        plan: ""
      });

      return;
    }

    const data = snap.data() || {};

    const plan = safeString(data.plan || "—");
    const website = safeString(data.website || "—");
    const lastUpdate = safeString(data.lastUpdate || "—");
    const notes = safeString(data.notes || "—");

    const businessName = safeString(data.businessName || data.business || data.name || (user.email ? user.email.split("@")[0] : "Client"));
    const faviconUrl = safeString(data.favicon || data.faviconUrl || data.faviconURL || "");

    // Main cards (existing)
    setText("plan", plan);
    setText("lastUpdate", lastUpdate);
    setText("notes", notes);

    const site = document.getElementById("website");
    if (site) {
      site.textContent = website;
      site.href = (website && website !== "—") ? website : "#";
    }

    // Profile header (new)
    if (helloNameEl) helloNameEl.textContent = businessName || "Client";
    setText("planMeta", plan);
    setHref("websiteMeta", website, (website && website !== "—") ? website : "#");
    setAvatarFromFavicon(avatarImg, faviconUrl, businessName || "Client");

    // Support form
    initSupportForm({
      uid: user.uid,
      email: user.email || "",
      businessName,
      website: (website && website !== "—") ? website : "",
      plan: (plan && plan !== "—") ? plan : ""
    });

  } catch (err) {
    console.error("Dashboard data error:", err);
    setText("plan", "—");
    setText("notes", "Could not load dashboard data.");

    const fallbackName = user.email ? user.email.split("@")[0] : "Client";
    const helloNameEl = document.getElementById("helloName");
    if (helloNameEl) helloNameEl.textContent = fallbackName;

    initSupportForm({
      uid: user.uid,
      email: user.email || "",
      businessName: fallbackName,
      website: "",
      plan: ""
    });
  }
});

/* ============================
   SUPPORT FORM -> GOOGLE SHEET
============================ */
function initSupportForm(context) {
  const form = document.getElementById("supportForm");
  if (!form) return;

  const impact = document.getElementById("impact");
  const impactNum = document.getElementById("impactNum");
  const toast = document.getElementById("supportToast");
  const errBox = document.getElementById("supportError");
  const submitBtn = document.getElementById("submitReq");

  // Live impact number
  if (impact && impactNum) {
    impactNum.textContent = impact.value || "5";
    impact.addEventListener("input", () => {
      impactNum.textContent = impact.value;
    });
  }

  // Prevent multiple bindings if auth state fires again
  if (form.dataset.bound === "1") return;
  form.dataset.bound = "1";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (toast) toast.style.display = "none";
    if (errBox) errBox.textContent = "";

    if (!SUPPORT_ENDPOINT_URL || SUPPORT_ENDPOINT_URL.includes("PASTE_YOUR")) {
      if (errBox) errBox.textContent = "Support endpoint isn’t set yet. Paste your Google Apps Script Web App URL into portal.js.";
      return;
    }

    const category = (document.getElementById("reqCategory")?.value || "").trim();
    const priority = getCheckedRadioValue("priority");
    const message = (document.getElementById("reqMessage")?.value || "").trim();
    const pageUrl = (document.getElementById("reqUrl")?.value || "").trim();
    const impactVal = document.getElementById("impact")?.value || "5";

    if (!category || !priority || !message) {
      if (errBox) errBox.textContent = "Please fill Category, Priority, and Message.";
      return;
    }

    const payload = {
      uid: context.uid,
      email: context.email,
      businessName: context.businessName,
      website: context.website,
      plan: context.plan,
      category,
      priority,
      impact: impactVal,
      pageUrl,
      message
    };

    const stopLoading = setButtonLoading(submitBtn, "Sending…");

    try {
      const res = await fetch(SUPPORT_ENDPOINT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });

      // Apps Script sometimes returns 200 with text
      const text = await res.text();
      let data = {};
      try { data = JSON.parse(text); } catch (_) {}

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "Request failed.");
      }

      // Success UI
      form.reset();
      if (impactNum) impactNum.textContent = "5";
      if (toast) toast.style.display = "block";
    } catch (err) {
      if (errBox) errBox.textContent = "Couldn’t send request. Please try again in a moment.";
      console.error("Support submit error:", err);
    } finally {
      stopLoading();
    }
  });
}

/* ============================
   LOGOUT (both buttons)
============================ */
function bindLogout(id) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.addEventListener("click", async () => {
    try {
      await auth.signOut();
    } finally {
      window.location.href = "login.html";
    }
  });
}

bindLogout("logout");
bindLogout("logoutTop");
