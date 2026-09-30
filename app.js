const STORAGE_KEY = "nexus-live-network-v1";
const CHANNEL_NAME = "nexus-live-network-channel";

const demoPeople = [
  { id:"p1", name:"Aisha Mehta", role:"Robotics Founder", company:"Kinetik Labs", interests:["Robotics","AI","Startups"], lookingFor:["Investors","Hiring","Design partners"], skills:["Computer Vision","Product","Fundraising"], bio:"Building warehouse robots that reduce repetitive picking work for small manufacturers.", present:true },
  { id:"p2", name:"Kabir Rao", role:"Embedded Systems Engineer", company:"Flux Motors", interests:["Embedded","EV","Robotics"], lookingFor:["Co-builders","Jobs","Hardware vendors"], skills:["MCUs","Motor Control","PCB Design"], bio:"Designing embedded control systems for next-gen electric mobility platforms.", present:true },
  { id:"p3", name:"Maya Srinivasan", role:"VC Analyst", company:"Northstar Ventures", interests:["Startups","Deep Tech","AI"], lookingFor:["Founders","Deal Flow","Researchers"], skills:["Market Maps","Due Diligence","Fundraising"], bio:"Exploring capital-efficient deep-tech companies with strong technical moats.", present:true },
  { id:"p4", name:"Rohan Kapoor", role:"Product Manager", company:"Orbit Health", interests:["HealthTech","AI","Product"], lookingFor:["Technical Talent","Founders","Mentors"], skills:["Product Strategy","UX","Go-to-Market"], bio:"Turning clinical workflows into simple software products used by care teams.", present:true },
  { id:"p5", name:"Zoya Khan", role:"Hardware Lead", company:"AeroForge", interests:["Drones","Defense","Embedded"], lookingFor:["Suppliers","Engineers","Testing Partners"], skills:["RF Systems","PCB Design","Verification"], bio:"Working on rugged electronics for autonomous aerial systems and field deployments.", present:true },
  { id:"p6", name:"Arjun Iyer", role:"Student Builder", company:"BITS Pilani", interests:["Robotics","Open Source","IoT"], lookingFor:["Teammates","Mentors","Internships"], skills:["Arduino","ROS","Rapid Prototyping"], bio:"Building small robots fast and learning from every failed prototype.", present:true },
  { id:"p7", name:"Nikhil Verma", role:"Corporate Innovation", company:"Vertex Manufacturing", interests:["Manufacturing","Robotics","Sustainability"], lookingFor:["Vendors","Pilots","Founders"], skills:["Operations","Procurement","Automation"], bio:"Looking for practical automation projects that can survive real factory constraints.", present:false },
  { id:"p8", name:"Simran Bose", role:"AI Researcher", company:"SenseLab", interests:["AI","Computer Vision","Neuroscience"], lookingFor:["Researchers","Founders","Collaborators"], skills:["ML","Vision","Data"], bio:"Researching machine perception and how intelligent systems make decisions under uncertainty.", present:true },
  { id:"p9", name:"Dev Malhotra", role:"Growth Lead", company:"Launchpad", interests:["Startups","Marketing","Community"], lookingFor:["Founders","Partners","Creators"], skills:["Growth","Community","Content"], bio:"Helping early-stage teams turn niche communities into repeatable acquisition channels.", present:true }
];

const defaultEvent = {
  name:"NEXUS Builders' Mixer",
  subtitle:"A live networking layer for high-signal conversations",
  code:"NEXUS26",
  venue:"Innovation Hall · Bengaluru",
  date:"Tonight · 6:30 PM – 9:30 PM"
};

let state = loadState();
let activeView = state.currentUser ? "home" : "landing";
let currentFilter = "all";
let searchQuery = "";
let toastTimer = null;

const channel = "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL_NAME) : null;
if (channel) channel.addEventListener("message", (event) => {
  if (event.data?.type === "sync") {
    state = loadState();
    render();
  }
});
window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY) {
    state = loadState();
    render();
  }
});

function clone(data){ return JSON.parse(JSON.stringify(data)); }
function seedState(){
  return { event: clone(defaultEvent), currentUser:null, attendees:clone(demoPeople), connections:[], lastActivity:[], createdAt:Date.now() };
}
function loadState(){
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return parsed && parsed.attendees ? parsed : seedState();
  } catch { return seedState(); }
}
function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (channel) channel.postMessage({type:"sync"});
}
function initials(name=""){ return name.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase(); }
function escapeHtml(value=""){
  return String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[ch]));
}
function allPeople(){
  const people = state.attendees.slice();
  if (state.currentUser && !people.some(p=>p.id===state.currentUser.id)) people.unshift(state.currentUser);
  return people;
}
function getCurrent(){ return state.currentUser ? allPeople().find(p=>p.id===state.currentUser.id) || state.currentUser : null; }
function presentPeople(){ return allPeople().filter(p=>p.present); }
function intersect(a,b){ return a.filter(x=>b.includes(x)); }

function calculateMatch(a,b){
  if (!a || !b) return {score:0, reasons:[]};
  const interestOverlap = intersect(a.interests||[], b.interests||[]);
  const needOverlap = intersect(a.lookingFor||[], b.skills||[]);
  const reverseNeedOverlap = intersect(b.lookingFor||[], a.skills||[]);
  const roleBoost = (a.company && b.company && a.company!==b.company) ? 7 : 2;
  const sharedCount = interestOverlap.length * 12;
  const needs = (needOverlap.length + reverseNeedOverlap.length) * 13;
  const presenceBoost = b.present ? 8 : 0;
  const score = Math.min(99, 35 + sharedCount + needs + roleBoost + presenceBoost);
  const reasons = [];
  if (interestOverlap.length) reasons.push(`Shared interest: ${interestOverlap.slice(0,2).join(" + ")}`);
  if (needOverlap.length) reasons.push(`You may help with: ${needOverlap[0]}`);
  if (reverseNeedOverlap.length) reasons.push(`They may help with: ${reverseNeedOverlap[0]}`);
  if (!reasons.length) reasons.push("Different profile, but complementary goals can make this a useful conversation.");
  return {score, reasons};
}

function connectionSet(){ return new Set(state.connections); }
function connected(id){ return connectionSet().has(id); }

function addActivity(text){
  state.lastActivity.unshift({text, time:Date.now()});
  state.lastActivity = state.lastActivity.slice(0,10);
}
function timeAgo(ts){
  const seconds=Math.max(1, Math.floor((Date.now()-ts)/1000));
  if(seconds<60) return `${seconds}s ago`;
  const minutes=Math.floor(seconds/60);
  if(minutes<60) return `${minutes}m ago`;
  return `${Math.floor(minutes/60)}h ago`;
}

function toast(message){
  const el=document.getElementById("toast");
  el.textContent=message; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),2600);
}

function navItem(id,label,icon){
  return `<button class="nav-item ${activeView===id?"active":""}" data-view="${id}"><span>${icon}</span>${label}</button>`;
}

function render(){
  const app=document.getElementById("app");
  if(!state.currentUser){ app.innerHTML=renderLanding(); bindLanding(); return; }
  app.innerHTML=renderApp(); bindApp();
}

function renderLanding(){
  return `<main class="landing container">
    <div class="hero-shell" style="width:100%">
      <section class="hero">
        <div class="logo"><span class="logo-mark">N</span> NEXUS</div>
        <div class="eyebrow" style="margin-top:42px">LIVE EVENT NETWORKING</div>
        <h1>Know <span>who</span><br/>to meet.</h1>
        <p class="lead">A networking companion that turns a room full of strangers into a ranked set of relevant conversations — with live presence, match reasons, and one-tap connection tracking.</p>
        <div class="hero-actions">
          <button class="btn primary" id="start-demo">Enter live demo →</button>
          <button class="btn" id="show-how">How it works</button>
        </div>
        <p class="demo-note">Demo data is preloaded so the complete flow can be tested in under two minutes. Open a second browser tab to simulate live presence sync.</p>
      </section>
      <aside class="feature-stack">
        <div class="feature glass"><div class="feature-number">01 · LIVE PRESENCE</div><div><h3>See who is actually here.</h3><p>Check-in/out state updates instantly across open tabs using browser sync — no manual attendance list refresh.</p></div></div>
        <div class="feature glass"><div class="feature-number">02 · RELEVANCE</div><div><h3>Know why to walk over.</h3><p>Every attendee gets a match score and a human-readable reason before you decide to start the conversation.</p></div></div>
        <div class="feature glass"><div class="feature-number">03 · ACTION</div><div><h3>Turn introductions into outcomes.</h3><p>Save connections, see your best next conversations, and export attendance data for organizers.</p></div></div>
      </aside>
    </div>
  </main>`;
}

function renderApp(){
  const me=getCurrent();
  const present=presentPeople().length;
  const matches=topMatches(3);
  return `<div class="app-shell">
    <header class="topbar"><div class="topbar-inner">
      <div class="row"><div class="logo"><span class="logo-mark">N</span> NEXUS</div><div class="event-chip"><span class="live-dot"></span><div><strong style="font-size:12px">${escapeHtml(state.event.name)}</strong><div class="tiny muted">${present} here now · ${escapeHtml(state.event.code)}</div></div></div></div>
      <div class="top-actions"><button class="btn" id="share-event">Share event</button><div class="user-mini"><div class="avatar">${initials(me.name)}</div><div style="display:none" class="tiny"><strong>${escapeHtml(me.name)}</strong></div></div></div>
    </div></header>
    <div class="content">
      <nav class="toolbar" style="margin-bottom:22px">
        ${navItem("home","Home","⌂")}${navItem("discover","Discover","⌕")}${navItem("matches","My network","◎")}${navItem("profile","My profile","◈")}${navItem("organizer","Organizer","▦")}
      </nav>
      <section id="home" class="view ${activeView==='home'?"active":""}">${renderHome(matches,present)}</section>
      <section id="discover" class="view ${activeView==='discover'?"active":""}">${renderDiscover()}</section>
      <section id="matches" class="view ${activeView==='matches'?"active":""}">${renderMatches()}</section>
      <section id="profile" class="view ${activeView==='profile'?"active":""}">${renderProfile()}</section>
      <section id="organizer" class="view ${activeView==='organizer'?"active":""}">${renderOrganizer()}</section>
    </div>
  </div>`;
}

function topMatches(n=6){
  const me=getCurrent();
  return presentPeople().filter(p=>p.id!==me?.id).map(p=>({person:p,...calculateMatch(me,p)})).sort((a,b)=>b.score-a.score).slice(0,n);
}

function renderHome(matches,presentCount){
  const me=getCurrent();
  return `<div class="dashboard-grid">
    <div class="hero-card glass welcome">
      <div class="eyebrow">YOU ARE LIVE</div>
      <h2>Good to see you, ${escapeHtml(me.name.split(" ")[0])}.</h2>
      <p>There are <strong style="color:var(--text)">${presentCount-1}</strong> other people checked in. NEXUS found <strong style="color:var(--accent)">${topMatches(6).length}</strong> relevant people for you right now. Start with the conversation you can act on.</p>
      <div class="hero-actions"><button class="btn primary" data-view="discover">Find people to meet →</button><button class="btn" data-view="profile">Edit my profile</button><button class="btn danger" id="toggle-presence">${me.present?"Check out":"Check back in"}</button></div>
      <div class="stats"><div class="stat"><strong>${presentCount}</strong><span>people here now</span></div><div class="stat"><strong>${state.connections.length}</strong><span>connections saved</span></div><div class="stat"><strong>${matches[0]?.score || "—"}</strong><span>top match score</span></div></div>
    </div>
    <aside class="glass card priority">
      <div class="priority-head"><div><div class="eyebrow">NEXT CONVERSATIONS</div><strong>Your best bets</strong></div><button class="btn" data-view="discover">See all</button></div>
      ${matches.map(m=>miniMatch(m)).join("") || `<div class="muted">No other attendees are currently present.</div>`}
    </aside>
  </div>
  <div class="glass card" style="margin-top:16px">
    <div class="row between"><div><div class="eyebrow">LIVE SIGNAL</div><strong>Recent activity</strong></div><span class="tiny muted">Auto-updates</span></div>
    <div style="margin-top:12px">${renderActivity()}</div>
  </div>`;
}

function miniMatch(m){
  const p=m.person;
  return `<div class="match-card"><div class="mini-avatar">${initials(p.name)}</div><div><div class="name">${escapeHtml(p.name)}</div><div class="role">${escapeHtml(p.role)} · ${escapeHtml(p.company)}</div></div><div class="score" title="Match score">${m.score}</div></div>`;
}

function renderActivity(){
  if(!state.lastActivity.length) return `<div class="muted tiny">No activity yet. Check someone in/out or connect with an attendee to create a live signal.</div>`;
  return state.lastActivity.slice(0,5).map(a=>`<div class="row between" style="padding:10px 0;border-bottom:1px solid var(--line)"><span style="font-size:13px">${escapeHtml(a.text)}</span><span class="tiny muted">${timeAgo(a.time)}</span></div>`).join("");
}

function renderDiscover(){
  const me=getCurrent();
  const visible=presentPeople().filter(p=>p.id!==me?.id).filter(p=>{
    const q=searchQuery.trim().toLowerCase();
    const hay=[p.name,p.role,p.company,...p.interests,...p.lookingFor,...p.skills].join(" ").toLowerCase();
    const matchesQuery=!q||hay.includes(q);
    const matchesFilter=currentFilter==="all" || p.interests.includes(currentFilter) || p.lookingFor.includes(currentFilter) || p.skills.includes(currentFilter);
    return matchesQuery && matchesFilter;
  }).map(p=>({person:p,...calculateMatch(me,p)})).sort((a,b)=>b.score-a.score);
  const filters=["all","Robotics","AI","Startups","Embedded","Deep Tech","Product","Defense","Manufacturing"];
  return `<div class="view-head"><div><div class="eyebrow">DISCOVER</div><h1 class="section-title">People worth meeting.</h1><p class="section-copy">You see only people who are currently checked in. Scores are based on shared interests plus two-way complementarity between what you offer and what they are looking for.</p></div><div class="toolbar"><input class="input search-box" id="discover-search" value="${escapeHtml(searchQuery)}" placeholder="Search name, skill, company…"/></div></div>
  <div class="chips" style="margin-bottom:16px">${filters.map(f=>`<button class="chip ${currentFilter===f?"green":""}" data-filter="${escapeHtml(f)}">${escapeHtml(f==='all'?"Everyone":f)}</button>`).join("")}</div>
  <div class="people-grid">${visible.map(personCard).join("") || `<div class="glass card" style="grid-column:1/-1"><strong>No matching attendees.</strong><div class="muted tiny" style="margin-top:6px">Try a broader search or clear the filter.</div></div>`}</div>`;
}

function personCard(m){
  const p=m.person; const isConnected=connected(p.id);
  return `<article class="person glass card"><div class="person-top"><div class="mini-avatar">${initials(p.name)}</div><div><h3>${escapeHtml(p.name)}</h3><div class="meta">${escapeHtml(p.role)} · ${escapeHtml(p.company)}</div></div><div class="score">${m.score}</div></div>
    <p class="bio">${escapeHtml(p.bio)}</p>
    <div class="chips">${p.interests.map(x=>`<span class="chip">${escapeHtml(x)}</span>`).join("")}</div>
    <div class="match-reason"><strong>Why this match:</strong> ${m.reasons.map(escapeHtml).join(" · ")}</div>
    <div class="chips"><span class="chip blue">Looking for: ${escapeHtml(p.lookingFor.slice(0,2).join(" · "))}</span></div>
    <div class="person-actions"><button class="btn ${isConnected?"secondary":"primary"}" data-connect="${p.id}">${isConnected?"✓ Connected":"Connect"}</button><button class="btn" data-profile="${p.id}">Details</button></div>
  </article>`;
}

function renderMatches(){
  const me=getCurrent();
  const matches=presentPeople().filter(p=>p.id!==me?.id).map(p=>({person:p,...calculateMatch(me,p)})).sort((a,b)=>b.score-a.score);
  const connectedPeople=allPeople().filter(p=>p.id!==me?.id && connected(p.id));
  return `<div class="view-head"><div><div class="eyebrow">MY NETWORK</div><h1 class="section-title">From introductions to outcomes.</h1><p class="section-copy">Your saved connections stay here, separate from the live attendee pool. Use this list as your follow-up queue after the event.</p></div></div>
    <div class="dashboard-grid">
      <div class="glass card"><div class="eyebrow">SAVED CONNECTIONS</div><h2 style="font:700 30px 'Space Grotesk';margin:8px 0 14px">${connectedPeople.length}</h2>${connectedPeople.length?connectedPeople.map(p=>{const m=calculateMatch(me,p); return `<div class="attendee-row"><div class="mini-avatar">${initials(p.name)}</div><div><strong>${escapeHtml(p.name)}</strong><div class="tiny muted">${escapeHtml(p.role)} · ${escapeHtml(p.company)}</div></div><span class="chip green">${m.score} match</span></div>`}).join(""):"<div class='muted tiny'>No connections yet. Go to Discover and save someone worth a follow-up.</div>"}</div>
      <div class="glass card"><div class="eyebrow">FOLLOW-UP QUEUE</div><h3 style="font:700 23px 'Space Grotesk';margin:8px 0 12px">Top uncontacted people</h3>${matches.filter(m=>!connected(m.person.id)).slice(0,4).map(miniMatch).join("")}</div>
    </div>`;
}

function renderProfile(){
  const me=getCurrent();
  const interestOptions=["Robotics","AI","Startups","Embedded","Deep Tech","Product","Defense","Manufacturing","HealthTech","IoT","Drones","Open Source"];
  const needOptions=["Investors","Hiring","Design partners","Co-builders","Jobs","Hardware vendors","Technical Talent","Founders","Mentors","Suppliers","Researchers","Collaborators","Teammates","Internships","Vendors","Pilots","Partners","Creators"];
  return `<div class="view-head"><div><div class="eyebrow">MY PROFILE</div><h1 class="section-title">Make your intent visible.</h1><p class="section-copy">A clear profile increases the quality of the match explanation. Keep it specific enough that a stranger can tell why they should walk over.</p></div><button class="btn primary" id="save-profile">Save profile</button></div>
  <div class="profile-grid"><div class="glass card profile-panel"><div class="profile-hero"><div class="avatar">${initials(me.name)}</div><div><h2>${escapeHtml(me.name)}</h2><p>${escapeHtml(me.role)} · ${escapeHtml(me.company)}</p></div></div><div class="eyebrow">PROFILE SIGNAL</div><p class="muted" style="line-height:1.6">${escapeHtml(me.bio || "Add a short one-line description of what you do and what kind of conversation you are open to.")}</p><div class="chips" style="margin-top:15px">${me.interests.map(x=>`<span class="chip green">${escapeHtml(x)}</span>`).join("")}</div></div>
  <div class="glass card profile-panel"><div class="form-grid">
    <div class="field"><label>Full name</label><input id="p-name" class="input" value="${escapeHtml(me.name)}" /></div>
    <div class="field"><label>Role</label><input id="p-role" class="input" value="${escapeHtml(me.role)}" /></div>
    <div class="field"><label>Company / college</label><input id="p-company" class="input" value="${escapeHtml(me.company)}" /></div>
    <div class="field"><label>Skills (comma separated)</label><input id="p-skills" class="input" value="${escapeHtml(me.skills.join(", "))}" /></div>
    <div class="field full"><label>Bio</label><textarea id="p-bio" rows="3">${escapeHtml(me.bio)}</textarea></div>
    <div class="field full"><label>Interests</label><div class="chips">${interestOptions.map(x=>`<button class="chip ${me.interests.includes(x)?"green":""}" data-profile-interest="${escapeHtml(x)}">${escapeHtml(x)}</button>`).join("")}</div></div>
    <div class="field full"><label>I'm looking for</label><div class="chips">${needOptions.map(x=>`<button class="chip ${me.lookingFor.includes(x)?"blue":""}" data-profile-need="${escapeHtml(x)}">${escapeHtml(x)}</button>`).join("")}</div></div>
  </div></div></div>`;
}

function renderOrganizer(){
  const people=allPeople(); const present=people.filter(p=>p.present); const rate=Math.round((present.length/people.length)*100);
  const interestCounts={}; people.forEach(p=>(p.interests||[]).forEach(i=>interestCounts[i]=(interestCounts[i]||0)+1));
  const topInterests=Object.entries(interestCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);
  return `<div class="view-head"><div><div class="eyebrow">ORGANIZER MODE</div><h1 class="section-title">Know the room.</h1><p class="section-copy">A lightweight control room for live attendance and post-event follow-up. This demo stores state locally so you can test the complete flow without credentials.</p></div><div class="toolbar"><button class="btn secondary" id="simulate-arrival">+ Simulate arrival</button><button class="btn" id="simulate-departure">↘ Simulate departure</button><button class="btn" id="export-csv">Export CSV</button></div></div>
  <div class="kpi-grid"><div class="kpi glass"><div class="number">${present.length}</div><div class="label">present now</div></div><div class="kpi glass"><div class="number">${people.length}</div><div class="label">registered in demo</div></div><div class="kpi glass"><div class="number">${rate}%</div><div class="label">live check-in rate</div></div><div class="kpi glass"><div class="number">${state.connections.length}</div><div class="label">connections saved</div></div></div>
  <div class="organizer-grid"><div class="glass card"><div class="row between"><div><div class="eyebrow">ATTENDANCE</div><strong>Live roster</strong></div><span class="tiny muted">${state.event.code}</span></div><div style="margin-top:12px">${people.map(p=>`<div class="attendee-row"><div class="mini-avatar">${initials(p.name)}</div><div><strong>${escapeHtml(p.name)}</strong><div class="tiny muted">${escapeHtml(p.role)} · ${escapeHtml(p.company)}</div></div><span class="presence ${p.present?"on":""}">${p.present?"Here":"Left"}</span></div>`).join("")}</div></div>
  <div class="glass card"><div class="eyebrow">ROOM COMPOSITION</div><h3 style="font:700 23px 'Space Grotesk';margin:8px 0 18px">Top interests</h3>${topInterests.map(([name,count])=>`<div style="margin:14px 0"><div class="row between tiny" style="margin-bottom:6px"><span>${escapeHtml(name)}</span><span class="muted">${count} people</span></div><div class="bar"><span style="width:${Math.round((count/people.length)*100)}%"></span></div></div>`).join("")}</div></div>
  <div class="glass card" style="margin-top:16px"><div class="row between"><div><div class="eyebrow">DEMO CONTROLS</div><strong>Reset the room</strong></div><button class="btn danger" id="reset-demo">Reset demo data</button></div><p class="muted tiny" style="margin-bottom:0">Use this before recording the walkthrough to restore the original attendee pool.</p></div>`;
}

function bindLanding(){
  document.getElementById("start-demo")?.addEventListener("click", openJoinModal);
  document.getElementById("show-how")?.addEventListener("click", ()=>alert("1) Join the room. 2) See who is present. 3) Discover ranked matches with reasons. 4) Save connections. 5) Switch to Organizer to see live attendance and export CSV."));
}

function bindApp(){
  document.querySelectorAll("[data-view]").forEach(btn=>btn.addEventListener("click",()=>{ activeView=btn.dataset.view; render(); window.scrollTo({top:0,behavior:"smooth"}); }));
  document.getElementById("share-event")?.addEventListener("click", shareEvent);
  document.getElementById("toggle-presence")?.addEventListener("click", toggleCurrentPresence);
  document.querySelectorAll("[data-connect]").forEach(btn=>btn.addEventListener("click",()=>toggleConnection(btn.dataset.connect)));
  document.querySelectorAll("[data-profile]").forEach(btn=>btn.addEventListener("click",()=>showPerson(btn.dataset.profile)));
  document.querySelectorAll("[data-filter]").forEach(btn=>btn.addEventListener("click",()=>{currentFilter=btn.dataset.filter; render(); activeView="discover";}));
  document.getElementById("discover-search")?.addEventListener("input",e=>{searchQuery=e.target.value; renderDiscoverOnly();});
  document.querySelectorAll("[data-profile-interest]").forEach(btn=>btn.addEventListener("click",()=>toggleProfileTag("interests",btn.dataset.profileInterest)));
  document.querySelectorAll("[data-profile-need]").forEach(btn=>btn.addEventListener("click",()=>toggleProfileTag("lookingFor",btn.dataset.profileNeed)));
  document.getElementById("save-profile")?.addEventListener("click",saveProfile);
  document.getElementById("simulate-arrival")?.addEventListener("click",simulateArrival);
  document.getElementById("simulate-departure")?.addEventListener("click",simulateDeparture);
  document.getElementById("export-csv")?.addEventListener("click",exportCSV);
  document.getElementById("reset-demo")?.addEventListener("click",resetDemo);
}
function renderDiscoverOnly(){
  const node=document.getElementById("discover"); if(!node)return;
  node.innerHTML=renderDiscover();
  node.querySelector("#discover-search")?.addEventListener("input",e=>{searchQuery=e.target.value; renderDiscoverOnly();});
  node.querySelectorAll("[data-filter]").forEach(btn=>btn.addEventListener("click",()=>{currentFilter=btn.dataset.filter; renderDiscoverOnly();}));
  node.querySelectorAll("[data-connect]").forEach(btn=>btn.addEventListener("click",()=>toggleConnection(btn.dataset.connect)));
  node.querySelectorAll("[data-profile]").forEach(btn=>btn.addEventListener("click",()=>showPerson(btn.dataset.profile)));
}

function openJoinModal(){
  const root=document.getElementById("modal-root");
  root.innerHTML=`<div class="modal-backdrop" id="join-backdrop"><div class="modal"><div class="eyebrow">JOIN ${escapeHtml(state.event.code)}</div><h2>Make your networking intent visible.</h2><p>Choose the demo profile for a fast walkthrough, or enter your own details. Your data stays in this browser for the prototype.</p><div class="row" style="gap:7px;flex-wrap:wrap;margin:12px 0 18px">${demoPeople.filter(p=>p.present).slice(0,6).map(p=>`<button class="chip" data-demo="${p.id}">${escapeHtml(p.name)}</button>`).join("")}</div>
  <div class="form-grid"><div class="field"><label>Name</label><input id="join-name" class="input" placeholder="e.g. Priya Shah" /></div><div class="field"><label>Role</label><input id="join-role" class="input" placeholder="e.g. ECE student" /></div><div class="field"><label>Company / college</label><input id="join-company" class="input" placeholder="e.g. BITS Pilani" /></div><div class="field"><label>Interests</label><input id="join-interests" class="input" placeholder="Robotics, Startups, AI" /></div><div class="field full"><label>What are you looking for?</label><input id="join-looking" class="input" placeholder="Mentors, Teammates, Internships" /></div></div>
  <div class="modal-actions"><button class="btn" id="close-join">Cancel</button><button class="btn primary" id="join-now">Enter event →</button></div></div></div>`;
  root.querySelectorAll("[data-demo]").forEach(b=>b.addEventListener("click",()=>fillDemoProfile(b.dataset.demo)));
  root.querySelector("#close-join").addEventListener("click",()=>root.innerHTML="");
  root.querySelector("#join-now").addEventListener("click",joinNow);
}
function fillDemoProfile(id){
  const p=demoPeople.find(x=>x.id===id); if(!p)return;
  document.getElementById("join-name").value=p.name;
  document.getElementById("join-role").value=p.role;
  document.getElementById("join-company").value=p.company;
  document.getElementById("join-interests").value=p.interests.join(", ");
  document.getElementById("join-looking").value=p.lookingFor.join(", ");
}
function joinNow(){
  const name=document.getElementById("join-name").value.trim();
  if(!name) return toast("Add your name to enter the event.");
  const id="me-"+Date.now();
  state.currentUser={id,name,role:document.getElementById("join-role").value.trim()||"Attendee",company:document.getElementById("join-company").value.trim()||"Independent",interests:csv(document.getElementById("join-interests").value),lookingFor:csv(document.getElementById("join-looking").value),skills:["Networking"],bio:"Here to find useful people and useful next steps.",present:true};
  state.attendees=state.attendees.filter(p=>p.id!==id); state.attendees.unshift(state.currentUser); addActivity(`${name} checked in.`); saveState(); document.getElementById("modal-root").innerHTML=""; activeView="home"; render(); toast("You're in. Start with your best match.");
}
function csv(value){ return value.split(",").map(x=>x.trim()).filter(Boolean); }

function showPerson(id){
  const p=allPeople().find(x=>x.id===id); if(!p)return; const m=calculateMatch(getCurrent(),p);
  const root=document.getElementById("modal-root");
  root.innerHTML=`<div class="modal-backdrop" id="person-backdrop"><div class="modal"><div class="row"><div class="avatar">${initials(p.name)}</div><div><div class="eyebrow">${m.score}% MATCH</div><h2 style="margin-top:5px">${escapeHtml(p.name)}</h2><div class="muted">${escapeHtml(p.role)} · ${escapeHtml(p.company)}</div></div></div><p style="margin-top:18px">${escapeHtml(p.bio)}</p><div class="chips">${p.interests.map(x=>`<span class="chip green">${escapeHtml(x)}</span>`).join("")}</div><div class="match-reason" style="margin-top:18px"><strong>Conversation angle:</strong> ${m.reasons.map(escapeHtml).join(" · ")}</div><div class="eyebrow" style="margin-top:20px">THEY ARE LOOKING FOR</div><div class="chips" style="margin-top:8px">${p.lookingFor.map(x=>`<span class="chip blue">${escapeHtml(x)}</span>`).join("")}</div><div class="modal-actions"><button class="btn" id="close-person">Close</button><button class="btn primary" id="connect-person">${connected(p.id)?"✓ Connected":"Save connection"}</button></div></div></div>`;
  root.querySelector("#close-person").addEventListener("click",()=>root.innerHTML="");
  root.querySelector("#connect-person").addEventListener("click",()=>{toggleConnection(p.id);root.innerHTML="";});
}

function toggleConnection(id){
  if(!state.currentUser)return;
  if(id===state.currentUser.id)return toast("That's your own profile.");
  if(connected(id)){ state.connections=state.connections.filter(x=>x!==id); const p=allPeople().find(x=>x.id===id); addActivity(`Removed ${p?.name||"connection"} from your follow-up queue.`); toast("Connection removed."); }
  else { state.connections.push(id); const p=allPeople().find(x=>x.id===id); addActivity(`Connected with ${p?.name||"someone new"}.`); toast(`Saved ${p?.name||"connection"} for follow-up.`); }
  saveState(); render(); activeView="discover";
}

function toggleCurrentPresence(){
  const me=getCurrent(); if(!me)return;
  const target=state.attendees.find(p=>p.id===me.id); if(!target)return;
  target.present=!target.present; state.currentUser.present=target.present;
  addActivity(`${me.name} ${target.present?"checked in":"checked out"}.`); saveState(); render(); toast(target.present?"You're back in the room.":"You're checked out.");
}

function toggleProfileTag(field,value){
  const me=getCurrent(); if(!me)return;
  me[field]=me[field]||[];
  me[field]=me[field].includes(value)?me[field].filter(x=>x!==value):[...me[field],value];
  state.currentUser=me;
  const target=state.attendees.find(p=>p.id===me.id); if(target)target[field]=me[field];
  saveState(); render(); activeView="profile";
}

function saveProfile(){
  const me=getCurrent();
  me.name=document.getElementById("p-name").value.trim()||me.name;
  me.role=document.getElementById("p-role").value.trim()||me.role;
  me.company=document.getElementById("p-company").value.trim()||me.company;
  me.skills=csv(document.getElementById("p-skills").value);
  me.bio=document.getElementById("p-bio").value.trim();
  state.currentUser=me;
  const target=state.attendees.find(p=>p.id===me.id); if(target)Object.assign(target,me);
  addActivity(`${me.name} updated their networking profile.`); saveState(); render(); toast("Profile saved. Your match scores will now adjust.");
}

function simulateArrival(){
  const absent=state.attendees.filter(p=>!p.present); if(!absent.length)return toast("Everyone in the demo roster is already present.");
  const p=absent[Math.floor(Math.random()*absent.length)]; p.present=true; addActivity(`${p.name} just checked in.`); saveState(); render(); toast(`${p.name} arrived.`);
}
function simulateDeparture(){
  const present=state.attendees.filter(p=>p.present && p.id!==state.currentUser?.id); if(!present.length)return toast("No other attendee is available to simulate leaving.");
  const p=present[Math.floor(Math.random()*present.length)]; p.present=false; addActivity(`${p.name} checked out.`); saveState(); render(); toast(`${p.name} left the event.`);
}

function shareEvent(){
  const message=`Join ${state.event.name} — event code ${state.event.code}. ${state.event.venue}, ${state.event.date}.`;
  if(navigator.share){ navigator.share({title:state.event.name,text:message,url:location.href}).catch(()=>{}); }
  else { navigator.clipboard?.writeText(message); toast("Invite text copied."); }
}

function exportCSV(){
  const rows=[["Name","Role","Company","Present","Interests","Looking For","Skills"]];
  allPeople().forEach(p=>rows.push([p.name,p.role,p.company,p.present?"Yes":"No",(p.interests||[]).join(" | "),(p.lookingFor||[]).join(" | "),(p.skills||[]).join(" | ")]));
  const csvText=rows.map(r=>r.map(cell=>'"'+String(cell).replaceAll('"','""')+'"').join(",")).join("\n");
  const blob=new Blob([csvText],{type:"text/csv;charset=utf-8"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`${state.event.code}-attendees.csv`; a.click(); URL.revokeObjectURL(a.href); toast("Attendance CSV exported.");
}
function resetDemo(){
  if(!confirm("Reset all prototype data, connections, and profile changes?"))return;
  state=seedState(); activeView="landing"; currentFilter="all"; searchQuery=""; saveState(); render(); toast("Demo reset.");
}

render();
