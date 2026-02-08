/* ============================
   Firebase init
============================ */
const firebaseConfig = {
  apiKey: "AIzaSyDBPFR35ijo-UTfnC22y0FR2rVMBVo5RE0",
  authDomain: "lj-web-development-portal.firebaseapp.com",
  projectId: "lj-web-development-portal",
  storageBucket: "lj-web-development-portal.firebasestorage.app",
  messagingSenderId: "1027196050099",
  appId: "1:1027196050099:web:38e50f1be663ec14d62ec6"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = (typeof firebase.firestore === "function") ? firebase.firestore() : null;

/* ============================
   Helpers
============================ */
function isDashboardPage() {
  const path = (window.location.pathname || "").toLowerCase();
  return path.includes("dashboard");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setLink(id, text, href) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text || "—";
  el.href = href || "#";
}

function setStatusPill(id, text, tone) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text || "—";
  el.classList.remove("good", "warn");
  if (tone === "good" || tone === "warn") {
    el.classList.add(tone);
  }
}

function setTrendTag(id, text, tone) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text || "—";
  el.classList.remove("up");
  if (tone === "up") {
    el.classList.add("up");
  }
}

function byId(id) {
  return document.getElementById(id);
}

function friendlyAuthError(err) {
  const code = err?.code || "";
  if (code === "auth/invalid-email") return "Please enter a valid email address.";
  if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
    return "Incorrect email or password.";
  }
  if (code === "auth/too-many-requests") return "Too many attempts. Please wait a minute and try again.";
  if (code === "auth/network-request-failed") return "Network error. Check your connection and try again.";
  if (code === "auth/unauthorized-domain") {
    return "This domain isn’t authorized in Firebase yet. Add ljwebdevelopment.com and www.ljwebdevelopment.com in Firebase → Auth → Settings → Authorized domains.";
  }
  return err?.message || "Something went wrong. Please try again.";
}

function setButtonLoading(btn, loadingText) {
  if (!btn) return () => {};
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = loadingText || "Working…";
  return () => {
    btn.disabled = false;
    btn.textContent = original;
  };
}

/* ============================
   LOGIN (login.html)
============================ */
const loginForm = byId("loginForm");
const loginError = byId("loginError");
const rememberMe = byId("rememberMe");

if (loginForm) {
  const loginBtn = loginForm.querySelector('button[type="submit"]');

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = (byId("email")?.value || "").trim();
    const password = byId("password")?.value || "";

    if (loginError) loginError.textContent = "";

    const stop = setButtonLoading(loginBtn, "Signing in…");

    try {
      const persistence = rememberMe?.checked
        ? firebase.auth.Auth.Persistence.LOCAL
        : firebase.auth.Auth.Persistence.SESSION;

      await auth.setPersistence(persistence);
      await auth.signInWithEmailAndPassword(email, password);

      window.location.href = "dashboard.html";
    } catch (err) {
      if (loginError) loginError.textContent = friendlyAuthError(err);
    } finally {
      stop();
    }
  });
}

/* ============================
   DASHBOARD DATA (dashboard.html)
============================ */
async function loadClientData(user) {
  // Fill obvious meta immediately
  setText("emailMeta", user.email || "—");

  // Default greeting name
  const displayName = user.displayName || (user.email ? user.email.split("@")[0] : "");
  setText("helloName", displayName || "—");

  // Avatar element (we will set after we load Firestore data too)
  const avatarEl = byId("clientAvatar");
  if (avatarEl) {
    // temporary: use auth profile photo if present, otherwise hide src
    if (user.photoURL) {
      avatarEl.src = user.photoURL;
      avatarEl.alt = "Client photo";
    } else {
      avatarEl.removeAttribute("src");
      avatarEl.alt = "";
    }
  }

  // If Firestore isn't available, show a clear note
  if (!db) {
    setText("plan", "—");
    setText("lastUpdate", "—");
    setText("notes", "Firestore isn’t enabled on this page.");
    setLink("website", "—", "#");

    setText("planMeta", "—");
    setLink("websiteMeta", "—", "#");
    return;
  }

  // 1) Try clients/{uid}
  let docSnap = await db.collection("clients").doc(user.uid).get();
  let safe = docSnap.exists ? (docSnap.data() || {}) : null;

  // 2) Fallback: query by email (in case your doc IDs are not UIDs)
  if (!safe && user.email) {
    const q = await db.collection("clients")
      .where("email", "==", user.email)
      .limit(1)
      .get();

    if (!q.empty) {
      safe = q.docs[0].data() || {};
    }
  }

  if (!safe) {
    // Nothing found in Firestore for this user
    setText("plan", "—");
    setText("lastUpdate", "—");
    setText("notes", "No client record found for this account yet.");
    setLink("website", "—", "#");

    setText("planMeta", "—");
    setLink("websiteMeta", "—", "#");
    return;
  }

  // ✅ Photo from Firestore (preferred)
  const photoUrl = safe.photoUrl || safe.photo || "";
  if (avatarEl) {
    if (photoUrl) {
      avatarEl.src = photoUrl;
      avatarEl.alt = "Client photo";
    } else if (user.photoURL) {
      avatarEl.src = user.photoURL;
      avatarEl.alt = "Client photo";
    } else {
      avatarEl.removeAttribute("src");
      avatarEl.alt = "";
    }
  }

  const plan = safe.plan || "—";
  const lastUpdate = safe.lastUpdate || "—";
  const notes = safe.notes || "—";
  const website = safe.website || "—";
  const businessName = safe.businessName || safe.name || "";

  // Overview cards
  setText("plan", plan);
  setText("lastUpdate", lastUpdate);
  setText("notes", notes);
  setLink("website", website, website === "—" ? "#" : website);

  // Top meta line
  setText("planMeta", plan);
  setLink("websiteMeta", website, website === "—" ? "#" : website);

  // Prefer business name for greeting if available
  if (businessName) setText("helloName", businessName);

  // Optional performance metrics
  const metrics = safe.metrics || {};
  if (Object.keys(metrics).length) {
    if (metrics.healthScore) setText("healthScore", metrics.healthScore);
    if (metrics.healthStatus) setStatusPill("healthStatus", metrics.healthStatus, metrics.healthTone);
    if (metrics.vitalsScore) setText("vitalsScore", metrics.vitalsScore);
    if (metrics.vitalsStatus) setStatusPill("vitalsStatus", metrics.vitalsStatus, metrics.vitalsTone);
    if (metrics.uptimeValue) setText("uptimeValue", metrics.uptimeValue);
    if (metrics.uptimeStatus) setStatusPill("uptimeStatus", metrics.uptimeStatus, metrics.uptimeTone);
    if (metrics.speedValue) setText("speedValue", metrics.speedValue);
    if (metrics.speedStatus) setStatusPill("speedStatus", metrics.speedStatus, metrics.speedTone);
    if (metrics.trafficValue) setText("trafficValue", metrics.trafficValue);
    if (metrics.trafficTrend) setTrendTag("trafficTrend", metrics.trafficTrend, metrics.trafficTone);
    if (metrics.actionTrend) setTrendTag("actionTrend", metrics.actionTrend, metrics.actionTone);
    if (metrics.contactActions) setText("contactActions", metrics.contactActions);
    if (metrics.directionClicks) setText("directionClicks", metrics.directionClicks);
    if (metrics.formSubmissions) setText("formSubmissions", metrics.formSubmissions);
    if (metrics.checklistStatus) setStatusPill("checklistStatus", metrics.checklistStatus, metrics.checklistTone);
    if (metrics.nextAudit) setText("nextAudit", metrics.nextAudit);
    if (metrics.lastSync) setText("lastSync", metrics.lastSync);
  }
}

/* ============================
   DASHBOARD SUPPORT FORM (dashboard.html)
   Posts to your hidden Google Sheets form
============================ */
function wireSupportForm(user) {
  const supportForm = byId("supportForm");
  const sheetPostForm = byId("sheetPostForm");
  const toast = byId("supportToast");
  const errBox = byId("supportError");
  const submitBtn = byId("submitReq");

  // Live impact number
  const impact = byId("impact");
  const impactNum = byId("impactNum");
  if (impact && impactNum) {
    impactNum.textContent = String(impact.value || 5);
    impact.addEventListener("input", () => {
      impactNum.textContent = String(impact.value);
    });
  }

  if (!supportForm || !sheetPostForm) return;

  supportForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (errBox) errBox.textContent = "";
    if (toast) toast.style.display = "none";

    const stop = setButtonLoading(submitBtn, "Sending…");

    try {
      const category = byId("reqCategory")?.value || "";
      const priority = (document.querySelector('input[name="priority"]:checked')?.value) || "";
      const impactVal = byId("impact")?.value || "5";
      const pageUrl = byId("reqUrl")?.value || "";
      const message = byId("reqMessage")?.value || "";

      if (!category || !priority || !message.trim()) {
        if (errBox) errBox.textContent = "Please fill out Category, Priority, and Message.";
        stop();
        return;
      }

      const plan = byId("plan")?.textContent || byId("planMeta")?.textContent || "—";
      const website = byId("website")?.textContent || byId("websiteMeta")?.textContent || "—";
      const businessName = byId("helloName")?.textContent || "";

      sheetPostForm.elements["uid"].value = user.uid || "";
      sheetPostForm.elements["email"].value = user.email || "";
      sheetPostForm.elements["businessName"].value = businessName || "";
      sheetPostForm.elements["website"].value = website || "";
      sheetPostForm.elements["plan"].value = plan || "";
      sheetPostForm.elements["category"].value = category;
      sheetPostForm.elements["priority"].value = priority;
      sheetPostForm.elements["impact"].value = impactVal;
      sheetPostForm.elements["pageUrl"].value = pageUrl;
      sheetPostForm.elements["message"].value = message;

      sheetPostForm.submit();

      supportForm.reset();
      if (impactNum) impactNum.textContent = "5";

      if (toast) {
        toast.style.display = "block";
        setTimeout(() => { toast.style.display = "none"; }, 4000);
      }
    } catch (err) {
      if (errBox) errBox.textContent = "Could not send request. Please try again.";
      console.error(err);
    } finally {
      stop();
    }
  });
}

/* ============================
   LOGOUT (both buttons)
============================ */
function wireLogout() {
  const logoutBtn = byId("logout");
  const logoutTop = byId("logoutTop");

  async function doLogout() {
    try {
      await auth.signOut();
    } finally {
      window.location.href = "login.html";
    }
  }

  if (logoutBtn) logoutBtn.addEventListener("click", doLogout);
  if (logoutTop) logoutTop.addEventListener("click", doLogout);
}

/* ============================
   AUTH STATE ROUTING
============================ */
auth.onAuthStateChanged(async (user) => {
  if (!user && isDashboardPage()) {
    window.location.href = "login.html";
    return;
  }

  if (user && isDashboardPage()) {
    wireLogout();
    await loadClientData(user);
    wireSupportForm(user);
  }
});
