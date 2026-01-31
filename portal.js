/* =========================================================
   LJ Web Development — Client Portal (static/demo)
   - Professional UX, upgradeable to real auth later
========================================================= */

const SESSION_KEY = "ljwd_portal_session_v1";

function setSession(data){
  try{ localStorage.setItem(SESSION_KEY, JSON.stringify(data)); }catch(e){}
}
function getSession(){
  try{
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}
function clearSession(){
  try{ localStorage.removeItem(SESSION_KEY); }catch(e){}
}

function isOnLoginPage(){
  return /login\.html$/i.test(location.pathname) || document.getElementById("portalLoginForm");
}
function isOnDashboardPage(){
  return /dashboard\.html$/i.test(location.pathname) || document.getElementById("logoutBtn");
}

function go(url){
  window.location.href = url;
}

/* =========================================================
   LOGIN PAGE
========================================================= */
function initLogin(){
  const form = document.getElementById("portalLoginForm");
  const msg = document.getElementById("portalMsg");
  const demoBtn = document.getElementById("demoLoginBtn");

  // If already logged in, go straight to dashboard
  const existing = getSession();
  if(existing?.loggedIn) go("dashboard.html");

  function showMessage(text){
    if(msg) msg.textContent = text || "";
  }

  demoBtn?.addEventListener("click", ()=>{
    const demo = {
      loggedIn: true,
      email: "demo@client.com",
      plan: "Standard Support",
      lastUpdate: "Jan 30, 2026",
      status: "Live • Monitoring enabled",
      siteUrl: "https://ljwebdevelopment.com",
      notes: "Demo portal view. Replace with client-specific info later."
    };
    setSession(demo);
    go("dashboard.html");
  });

  form?.addEventListener("submit", (e)=>{
    e.preventDefault();
    const email = document.getElementById("portalEmail")?.value?.trim() || "";
    const pass = document.getElementById("portalPass")?.value || "";

    const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const okPass = pass.length >= 6;

    if(!okEmail || !okPass){
      showMessage("Check your login: valid email + password must be 6+ characters. Or use Demo Login.");
      return;
    }

    // Static portal behavior (upgrade later to real auth)
    const session = {
      loggedIn: true,
      email,
      plan: "Support plan",
      lastUpdate: "—",
      status: "Live • Portal access enabled",
      siteUrl: "",
      notes: "Client portal enabled. (Upgrade to real auth when ready.)"
    };

    setSession(session);
    go("dashboard.html");
  });
}

/* =========================================================
   DASHBOARD PAGE
========================================================= */
function initDashboard(){
  const session = getSession();
  if(!session?.loggedIn){
    go("login.html");
    return;
  }

  const welcomeLine = document.getElementById("welcomeLine");
  const planLine = document.getElementById("planLine");
  const updateLine = document.getElementById("updateLine");
  const statusLine = document.getElementById("statusLine");
  const notesLine = document.getElementById("notesLine");
  const siteLink = document.getElementById("siteLink");

  if(welcomeLine) welcomeLine.textContent = `Welcome, ${session.email}.`;
  if(planLine) planLine.textContent = session.plan || "—";
  if(updateLine) updateLine.textContent = session.lastUpdate || "—";
  if(statusLine) statusLine.textContent = session.status || "—";
  if(notesLine) notesLine.textContent = session.notes || notesLine.textContent;

  if(siteLink){
    if(session.siteUrl){
      siteLink.href = session.siteUrl;
      siteLink.textContent = session.siteUrl.replace(/^https?:\/\//, "");
    }else{
      siteLink.href = "index.html";
      siteLink.textContent = "Add your website link";
    }
  }

  document.getElementById("logoutBtn")?.addEventListener("click", ()=>{
    clearSession();
    go("login.html");
  });
}

/* =========================================================
   INIT
========================================================= */
(function(){
  if(isOnLoginPage()) initLogin();
  if(isOnDashboardPage()) initDashboard();
})();
