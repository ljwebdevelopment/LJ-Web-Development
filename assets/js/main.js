const EMAIL_TO = "ljwebdevelopmentok@gmail.com";

function scrollToId(id){
  const el = document.getElementById(id);
  if(!el) return;
  const offset = 78;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: "smooth" });
}

// Modal elements
const modalBack = document.getElementById("modalBack");
const closeModalBtn = document.getElementById("closeModal");
const modalSubjectEl = document.getElementById("modalSubject");
const modalMessageEl = document.getElementById("modalMessage");
const toast = document.getElementById("toast");

const openMailAppBtn = document.getElementById("openMailApp");
const openGmailBtn = document.getElementById("openGmail");
const copyMsgBtn = document.getElementById("copyMsg");

let currentSubject = "";
let currentMessagePlain = "";
let currentMessageEncoded = "";

function openEmailModal(subject, messageEncoded){
  currentSubject = subject || "Website Inquiry - Luke Johnson";
  currentMessageEncoded = messageEncoded || "";
  currentMessagePlain = decodeURIComponent((messageEncoded || "").replace(/\+/g, "%20"));

  modalSubjectEl.textContent = currentSubject;
  modalMessageEl.textContent = currentMessagePlain || "Message will be here.";

  toast.style.display = "none";
  modalBack.style.display = "flex";
  modalBack.setAttribute("aria-hidden", "false");
}

function closeModal(){
  modalBack.style.display = "none";
  modalBack.setAttribute("aria-hidden", "true");
}

closeModalBtn?.addEventListener("click", closeModal);
modalBack?.addEventListener("click", (e)=>{ if(e.target === modalBack) closeModal(); });

// Open email app (mailto)
openMailAppBtn?.addEventListener("click", ()=>{
  const url = `mailto:${EMAIL_TO}?subject=${encodeURIComponent(currentSubject)}&body=${currentMessageEncoded}`;
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
});

// Open Gmail compose (fallback)
openGmailBtn?.addEventListener("click", ()=>{
  const gmailUrl =
    "https://mail.google.com/mail/?view=cm&fs=1" +
    `&to=${encodeURIComponent(EMAIL_TO)}` +
    `&su=${encodeURIComponent(currentSubject)}` +
    `&body=${encodeURIComponent(currentMessagePlain)}`;
  window.open(gmailUrl, "_blank", "noopener,noreferrer");
});

// Copy message
copyMsgBtn?.addEventListener("click", async ()=>{
  const full = `To: ${EMAIL_TO}\nSubject: ${currentSubject}\n\n${currentMessagePlain}`;
  try{
    await navigator.clipboard.writeText(full);
    toast.style.display = "block";
  }catch(err){
    const textarea = document.createElement("textarea");
    textarea.value = full;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    toast.style.display = "block";
  }
});

// Global click router
document.addEventListener("click", function(e){
  const t = e.target.closest("[data-action]");
  if(!t) return;

  const action = t.getAttribute("data-action");

  if(action === "scroll"){
    e.preventDefault();
    const target = t.getAttribute("data-target");
    if(target === "top"){ window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    scrollToId(target);
    return;
  }

  if(action === "email"){
    e.preventDefault();
    const subject = t.getAttribute("data-subject") || "Website Inquiry - Luke Johnson";
    const msg = t.getAttribute("data-message") || "";
    openEmailModal(subject, msg);
    return;
  }

  if(action === "plan"){
    e.preventDefault();
    const plan = t.getAttribute("data-plan") || "Support Plan";
    const subject = `Website Build + ${plan}`;
    const msg = encodeURIComponent(
      `Hey Luke,\n\nI would like to talk to you about building a website with the ${plan}.\n\nBusiness name:\nBest contact:\nWhat I need on the website:\n\nThanks!`
    );
    openEmailModal(subject, msg);
    return;
  }

  if(action === "addon"){
    e.preventDefault();
    const addon = t.getAttribute("data-addon") || "Add-on";
    const subject = `Add-on Request - ${addon}`;
    const msg = encodeURIComponent(
      `Hey Luke,\n\nI want to add: ${addon}\n\nBusiness name:\nBest contact:\nDetails:\n\nThanks!`
    );
    openEmailModal(subject, msg);
    return;
  }

  if(action === "build"){
    e.preventDefault();
    scrollToId("contact");
    const subject = "Website Build + Support Plan";
    const msg = encodeURIComponent(
      "Hey Luke,\n\nI would like to talk to you about building a website with a support plan.\n\nBusiness name:\nBest contact:\nWhat I need on the website:\nSupport plan I’m leaning toward (Basic/Standard/Full Service):\n\nThanks!"
    );
    openEmailModal(subject, msg);
    return;
  }
});

// Quick Support
document.getElementById("supportBtn")?.addEventListener("click", ()=>{
  const subject = "Quick Support - Luke Johnson";
  const msg = encodeURIComponent(
    "Hey Luke,\n\nI need quick support on my website.\n\nBusiness name:\nWhat’s going on:\nUrgency (today/this week/whenever):\n\nThanks!"
  );
  openEmailModal(subject, msg);
});

// Quote form → opens email modal
document.getElementById("quoteForm")?.addEventListener("submit", (e)=>{
  e.preventDefault();

  const name = document.getElementById("name")?.value?.trim() || "";
  const biz = document.getElementById("biz")?.value?.trim() || "";
  const need = document.getElementById("need")?.value?.trim() || "";
  const details = document.getElementById("details")?.value?.trim() || "";

  const subject = "Website Build + Support Plan (Quote Request)";
  const body = encodeURIComponent(
    `Hey Luke,\n\nHere’s what I’m looking for:\n\nName: ${name}\nBusiness: ${biz}\nPackage: ${need}\n\nDetails:\n${details}\n\nThanks!`
  );

  openEmailModal(subject, body);
});

// Mobile nav toggle
const menuBtn = document.getElementById("menuBtn");
const nav = document.getElementById("nav");
if(menuBtn && nav){
  menuBtn.addEventListener("click", function(){
    menuBtn.classList.toggle("active");
    nav.classList.toggle("open");
  });
  nav.querySelectorAll("button").forEach(function(btn){
    btn.addEventListener("click", function(){
      menuBtn.classList.remove("active");
      nav.classList.remove("open");
    });
  });
}

// Year
const y = document.getElementById("year");
if(y) y.textContent = new Date().getFullYear();
