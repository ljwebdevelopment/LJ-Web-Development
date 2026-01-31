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

  // Avatar (optional: use photoURL if present)
  const avatar = byId("clientAvatar");
  if (avatar) {
    if (user.photoURL) {
      avatar.src = user.photoURL;
      avatar.alt = "Client avatar";
    } else {
      // Hide broken img if empty
      avatar.removeAttribute("src");
      avatar.alt = "";
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
  let snap = await db.collection("clients").doc(user.uid).get();

  // 2) Fallback: query by email (in case your doc IDs are not UIDs)
  if (!snap.exists && user.email) {
    const q = await db.collection("clients")
      .where("email", "==", user.email)
      .limit(1)
      .get();

    if (!q.empty) snap = q.docs[0];
  }

  if (!snap.exists) {
    // Nothing found in Firestore for this user
    setText("plan", "—");
    setText("lastUpdate", "—");
    setText("notes", "No client record found for this account yet.");
    setLink("website", "—", "#");

    setText("planMeta", "—");
    setLink("websiteMeta", "—", "#");
    return;
  }

  const data = typeof snap.data === "function" ? snap.data() : snap.data; // supports both doc + query doc
  const safe = data || {};

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

      // Pull what’s already on the page if available
      const plan = byId("plan")?.textContent || byId("planMeta")?.textContent || "—";
      const website = byId("website")?.textContent || byId("websiteMeta")?.textContent || "—";
      const businessName = byId("helloName")?.textContent || "";

      // Fill hidden POST inputs
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

      // Submit to Apps Script via hidden iframe
      sheetPostForm.submit();

      // Reset visible form
      supportForm.reset();
      if (impactNum) impactNum.textContent = "5";

      if (toast) {
        toast.style.display = "block";
        // auto-hide after a bit
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

  // If we’re on dashboard and logged in, populate data + wire UI
  if (user && isDashboardPage()) {
    wireLogout();
    await loadClientData(user);
    wireSupportForm(user);
  }
});
