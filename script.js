// ═══════════════════════════════════
// DATA STORE
// ═══════════════════════════════════
let txns    = JSON.parse(localStorage.getItem('sw3_txns')    || '[]');
let budgets = JSON.parse(localStorage.getItem('sw3_budgets') || '{}');
let goals   = JSON.parse(localStorage.getItem('sw3_goals')   || '[]');
let profile = JSON.parse(localStorage.getItem('sw3_profile') || 'null') || {name:'',currency:'₹',theme:'light',savingsGoal:0};
let editId   = null;
let selCat   = '';
let curType  = 'expense';
let curMonth = new Date(); curMonth.setDate(1);
let editGoalId    = null;
let addGoalTarget = null;

// ─── CATEGORIES ───
const CATS = {
  expense:[
    {id:'food',      label:'Food & Dining',       emoji:'🍔', bg:'#FEF2F2', color:'#DC2626'},
    {id:'transport', label:'Transport',            emoji:'🚗', bg:'#FFFBEB', color:'#D97706'},
    {id:'shopping',  label:'Shopping',             emoji:'🛍️', bg:'#F5F3FF', color:'#7C3AED'},
    {id:'bills',     label:'Bills & Utilities',    emoji:'🧾', bg:'#F0F9FF', color:'#0284C7'},
    {id:'health',    label:'Healthcare',           emoji:'🏥', bg:'#ECFDF5', color:'#059669'},
    {id:'education', label:'Education',            emoji:'📚', bg:'#FFFBEB', color:'#D97706'},
    {id:'fun',       label:'Fun & Entertainment',  emoji:'🎮', bg:'#FDF2F8', color:'#DB2777'},
    {id:'travel',    label:'Travel',               emoji:'✈️', bg:'#F0FDFA', color:'#0D9488'},
    {id:'rent',      label:'Rent / EMI',           emoji:'🏠', bg:'#EEF2FF', color:'#4F46E5'},
    {id:'other',     label:'Other',                emoji:'📦', bg:'#F7F8FC', color:'#9CA3AF'},
  ],
  income:[
    {id:'salary',    label:'Salary',               emoji:'💼', bg:'#ECFDF5', color:'#059669'},
    {id:'freelance', label:'Freelance / Side Gig', emoji:'💻', bg:'#F0F9FF', color:'#0284C7'},
    {id:'invest',    label:'Investment Returns',   emoji:'📈', bg:'#FFFBEB', color:'#D97706'},
    {id:'gift',      label:'Gift / Bonus',         emoji:'🎁', bg:'#FDF2F8', color:'#DB2777'},
    {id:'rental',    label:'Rental Income',        emoji:'🏘️', bg:'#F5F3FF', color:'#7C3AED'},
    {id:'business',  label:'Business',             emoji:'🏪', bg:'#F0FDFA', color:'#0D9488'},
    {id:'other-inc', label:'Other',                emoji:'💰', bg:'#ECFDF5', color:'#059669'},
  ]
};
const GOAL_ICONS = ['🏖️','💻','🚗','🏠','✈️','📱','💍','🎓','🐶','🎸','🛋️','👶','🏋️','📷','⌚'];
const allCats = [...CATS.expense,...CATS.income];
const getCat  = id => allCats.find(c=>c.id===id) || {emoji:'📦',label:id,bg:'#F7F8FC',color:'#9CA3AF'};
const sym     = () => profile.currency || '₹';
const fmt     = n  => sym()+Math.abs(n).toLocaleString('en-IN',{maximumFractionDigits:0});
const fmtDate = d  => new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
const esc     = s  => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

// ═══════════════════════════════════
// ONBOARDING
// ═══════════════════════════════════
function finishOnboard(){
  const name = document.getElementById('ob-name').value.trim();
  const cur  = document.getElementById('ob-currency').value;
  const goal = parseFloat(document.getElementById('ob-goal').value)||0;
  if(!name) return toast('Please enter your name 😊','e');
  profile = {name,currency:cur,theme:'light',savingsGoal:goal};
  localStorage.setItem('sw3_profile',JSON.stringify(profile));
  launchApp();
}
function skipOnboard(){
  if(!profile.name) profile.name='My Wallet';
  localStorage.setItem('sw3_profile',JSON.stringify(profile));
  launchApp();
}
function launchApp(){
  document.getElementById('onboard').style.display='none';
  document.getElementById('app').style.display='flex';
  applyTheme(profile.theme);
  seedData();
  updateAll();
  renderChips();
  setType('expense');
}
// ═══════════════════════════════════
// THEME
// ═══════════════════════════════════
function setTheme(t){
  profile.theme=t;
  applyTheme(t);
  localStorage.setItem('sw3_profile',JSON.stringify(profile));
  document.getElementById('theme-light').classList.toggle('active',t==='light');
  document.getElementById('theme-dark').classList.toggle('active',t==='dark');
}
function applyTheme(t){
  document.documentElement.setAttribute('data-theme',t||'light');
  document.getElementById('theme-light')?.classList.toggle('active',t==='light');
  document.getElementById('theme-dark')?.classList.toggle('active',t==='dark');
}

// ═══════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════
const PAGE_META = {
  home:{
    title:'Home',
    sub: () => `Welcome back, ${profile.name || 'Friend'} 👋`
  },
  activity:{
    title:'Activity',
    sub:'All your income & expense entries'
  },
  goals:{
    title:'Savings Goals',
    sub:'Track your savings targets'
  },
  insights:{
    title:'Spending Insights',
    sub:'Understand your spending habits'
  },
  payments:{
    title:'Monthly Payments',
    sub:'Fixed bills & subscriptions'
  },
  budget:{
    title:'Budget Limits',
    sub:'Control your monthly spending'
  },
  settings:{
    title:'Settings',
    sub:'Manage your profile & preferences'
  }
};
function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.bnav-item').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+id)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b=>{if(b.getAttribute('onclick')?.includes("'"+id+"'"))b.classList.add('active');});
  document.querySelectorAll('.bnav-item').forEach(b=>{if(b.getAttribute('onclick')?.includes("'"+id+"'"))b.classList.add('active');});
  const meta=PAGE_META[id]||{title:id,sub:''};
  document.getElementById('page-title').textContent = meta.title;
  document.getElementById('page-sub').textContent   = typeof meta.sub==='function'?meta.sub():meta.sub;
  closeSidebar();
  if(id==='activity') renderActivity();
  if(id==='budget')   renderBudgetPage();
  if(id==='insights') renderInsights();
  if(id==='payments') renderPayments();
  if(id==='goals')    renderGoals();
  if(id==='settings') loadSettings();
}
function openSidebar(){document.getElementById('sidebar').classList.add('open');document.getElementById('backdrop').classList.add('show');}
function closeSidebar(){document.getElementById('sidebar').classList.remove('open');document.getElementById('backdrop').classList.remove('show');}

// ═══════════════════════════════════
// TRANSACTION MODAL
// ═══════════════════════════════════
function openModal(type='expense',recurring=false){
  editId=null; setType(type);
  document.getElementById('f-desc').value='';
  document.getElementById('f-amount').value='';
  document.getElementById('f-date').value=new Date().toISOString().slice(0,10);
  document.getElementById('f-note').value='';
  document.getElementById('f-rec').checked=recurring;
  document.getElementById('modal-title').textContent='Add Transaction';
  document.getElementById('txn-modal').classList.add('open');
}
function openEdit(id){
  const t=txns.find(x=>x.id===id);if(!t)return;
  editId=id; setType(t.type); selCat=t.category; renderChips();
  document.getElementById('f-desc').value=t.desc;
  document.getElementById('f-amount').value=t.amount;
  document.getElementById('f-date').value=t.date;
  document.getElementById('f-note').value=t.note||'';
  document.getElementById('f-rec').checked=!!t.recurring;
  document.getElementById('modal-title').textContent='Edit Transaction';
  document.getElementById('txn-modal').classList.add('open');
}
function closeTxnModal(e){if(!e||e.target===document.getElementById('txn-modal'))document.getElementById('txn-modal').classList.remove('open');}

function setType(type){
  curType=type; selCat='';
  document.getElementById('ttype-inc').className='ttype'+(type==='income'?' sel-inc':'');
  document.getElementById('ttype-exp').className='ttype'+(type==='expense'?' sel-exp':'');
  renderChips();
}
function renderChips(){
  document.getElementById('cat-chips').innerHTML=CATS[curType].map(c=>
    `<div class="cchip${selCat===c.id?' sel':''}" onclick="pickCat('${c.id}')">${c.emoji} ${c.label}</div>`
  ).join('');
}
function pickCat(id){selCat=id;renderChips();}

function saveTxn(){
  const desc=document.getElementById('f-desc').value.trim();
  const amount=parseFloat(document.getElementById('f-amount').value);
  const date=document.getElementById('f-date').value;
  const note=document.getElementById('f-note').value.trim();
  const rec=document.getElementById('f-rec').checked;
  if(!desc)return toast('Please describe the transaction 😊','e');
  if(!amount||amount<=0)return toast('Please enter a valid amount','e');
  if(!date)return toast('Please pick a date','e');
  if(!selCat)return toast('Please choose a category','e');
  const t={id:editId||Date.now().toString(),desc,amount,date,type:curType,category:selCat,note,recurring:rec};
  if(editId){txns=txns.map(x=>x.id===editId?t:x);toast('Updated! ✅','s');}
  else{txns.unshift(t);toast('Saved! 🎉','s');}
  save();closeTxnModal();updateAll();
  if(document.getElementById('page-activity').classList.contains('active'))renderActivity();
  if(document.getElementById('page-payments').classList.contains('active'))renderPayments();
}
function deleteTxn(id){
if(!confirm('Delete this transaction?')) return;
txns=txns.filter(t=>t.id!==id);
save();
toast('Deleted','e');
updateAll();
if(document.getElementById('page-activity').classList.contains('active'))
renderActivity();
if(document.getElementById('page-payments').classList.contains('active'))
renderPayments();
}

// ═══════════════════════════════════
// GOAL MODAL
// ═══════════════════════════════════
function openGoalModal(id=null){
  editGoalId=id;
  const g=id?goals.find(x=>x.id===id):null;
  document.getElementById('gmodal-title').textContent=g?'Edit Goal':'New Goal';
  document.getElementById('g-name').value=g?g.name:'';
  document.getElementById('g-target').value=g?g.target:'';
  document.getElementById('g-saved').value=g?g.saved:'';
  document.getElementById('g-deadline').value=g&&g.deadline?g.deadline:'';
  renderGoalIcons(g?g.icon:'');
  document.getElementById('goal-modal').classList.add('open');
}
function closeGoalModal(e){if(!e||e.target===document.getElementById('goal-modal'))document.getElementById('goal-modal').classList.remove('open');}
let selGoalIcon='🏖️';
function renderGoalIcons(sel=''){
  selGoalIcon=sel||GOAL_ICONS[0];
  document.getElementById('goal-icons').innerHTML=GOAL_ICONS.map(ic=>
    `<div class="cchip${selGoalIcon===ic?' sel':''}" onclick="pickGoalIcon('${ic}')" style="font-size:18px;padding:8px 12px;">${ic}</div>`
  ).join('');
}
function pickGoalIcon(ic){selGoalIcon=ic;renderGoalIcons(ic);}

function saveGoal(){
  const name=document.getElementById('g-name').value.trim();
  const target=parseFloat(document.getElementById('g-target').value);
  const saved=parseFloat(document.getElementById('g-saved').value)||0;
  const deadline=document.getElementById('g-deadline').value;
  if(!name)return toast('Please name your goal 😊','e');
  if(!target||target<=0)return toast('Please enter a target amount','e');
  const g={id:editGoalId||Date.now().toString(),name,target,saved,icon:selGoalIcon,deadline};
  if(editGoalId){goals=goals.map(x=>x.id===editGoalId?g:x);toast('Goal updated! ✅','s');}
  else{goals.push(g);toast('Goal created! 🎯','s');}
  save();closeGoalModal();renderGoals();
}

function deleteGoal(id){
if(!confirm('Delete this goal?')) return;
goals=goals.filter(g=>g.id!==id);
save();
renderGoals();
toast('Goal removed','e');
}
function openAddToGoal(id){
  addGoalTarget=id;
  const g=goals.find(x=>x.id===id);
  document.getElementById('ag-name').value=g?g.name:'';
  document.getElementById('ag-amount').value='';
  document.getElementById('add-goal-modal').classList.add('open');
}
function closeAddGoalModal(e){if(!e||e.target===document.getElementById('add-goal-modal'))document.getElementById('add-goal-modal').classList.remove('open');}
function addToGoal(){
  const amount=parseFloat(document.getElementById('ag-amount').value);
  if(!amount||amount<=0)return toast('Enter a valid amount','e');
  goals=goals.map(g=>g.id===addGoalTarget?{...g,saved:Math.min(g.saved+amount,g.target)}:g);
  save();closeAddGoalModal();renderGoals();toast('Amount added to goal! 💰','s');
}

// ═══════════════════════════════════
// SAVE
// ═══════════════════════════════════
function save(){
  localStorage.setItem('sw3_txns',JSON.stringify(txns));
  localStorage.setItem('sw3_budgets',JSON.stringify(budgets));
  localStorage.setItem('sw3_goals',JSON.stringify(goals));
  localStorage.setItem('sw3_profile',JSON.stringify(profile));
}

// ═══════════════════════════════════
// MONTH
// ═══════════════════════════════════
function monthTxns(){
  const y=curMonth.getFullYear(),m=curMonth.getMonth();
  return txns.filter(t=>{const d=new Date(t.date);return d.getFullYear()===y&&d.getMonth()===m;});
}
function changeMonth(dir){curMonth.setMonth(curMonth.getMonth()+dir);updateAll();}
function updateMonthLabel(){
  const lbl=curMonth.toLocaleDateString('en-IN',{month:'long',year:'numeric'});
  document.getElementById('month-lbl').textContent=lbl;
  document.getElementById('sb-month').textContent=lbl;
}

// ═══════════════════════════════════
// UPDATE ALL
// ═══════════════════════════════════
function updateAll(){
  updateMonthLabel();
  document.getElementById('sb-name').textContent=profile.name||'My Wallet';
  document.getElementById('sb-txn-count').textContent=txns.length;
  renderStats();
  renderRecentList();
  renderDonut();
  renderTrend();
  renderBudgetHome();
  renderSmartInsightBanner();
}

// ═══════════════════════════════════
// STATS
// ═══════════════════════════════════
function renderStats(){
  const mt=monthTxns();
  const inc=mt.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const exp=mt.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const bal=inc-exp;
  const rate=inc>0?Math.round((bal/inc)*100):0;
  const iCnt=mt.filter(t=>t.type==='income').length;
  const eCnt=mt.filter(t=>t.type==='expense').length;
  const cards=[
    {label:'Money Available',val:fmt(bal),icon:'💼',bg:'#EEF2FF',
     badge:bal>=0?{t:'Positive',cls:'badge-up'}:{t:'Negative',cls:'badge-down'},
     sub:'Total income minus expenses',color:bal>=0?'var(--green)':'var(--red)'},
    {label:'Total Income',val:fmt(inc),icon:'📥',bg:'#ECFDF5',
     badge:{t:iCnt+' entries',cls:'badge-neutral'},
     sub:'Money received this month',color:'var(--green)'},
    {label:'Total Expenses',val:fmt(exp),icon:'📤',bg:'#FEF2F2',
     badge:{t:eCnt+' entries',cls:'badge-neutral'},
     sub:'Money spent this month',color:'var(--red)'},
    {label:'Savings Rate',val:rate+'%',icon:'🐷',bg:'#FFFBEB',
     badge:rate>=20?{t:'Great!',cls:'badge-up'}:rate>=10?{t:'OK',cls:'badge-neutral'}:{t:'Low',cls:'badge-down'},
     sub:'of income saved',color:rate>=20?'var(--green)':rate>=10?'var(--amber)':'var(--red)'},
  ];
  document.getElementById('stat-cards').innerHTML=cards.map(c=>`
    <div class="stat-card">
      <div class="stat-card-top">
        <div class="stat-icon" style="background:${c.bg}">${c.icon}</div>
        <span class="stat-badge ${c.badge.cls}">${c.badge.t}</span>
      </div>
      <div class="stat-label">${c.label}</div>
      <div class="stat-val" style="color:${c.color}">${c.val}</div>
      <div class="stat-sub">${c.sub}</div>
    </div>`).join('');
}

// ═══════════════════════════════════
// TRANSACTION ROW
// ═══════════════════════════════════
function txnRow(t){
  const cat=getCat(t.category);
  const s=t.type==='income'?'+':'-';
  return `<div class="txn-row">
    <div class="txn-ico" style="background:${cat.bg}">${cat.emoji}</div>
    <div class="txn-info">
      <div class="txn-name">${esc(t.desc)}</div>
      <div class="txn-meta">${cat.emoji} ${cat.label}${t.recurring?' &nbsp;<span class="rec-badge">🔁 Monthly</span>':''}</div>
    </div>
    <div class="txn-r">
      <div class="txn-amt ${t.type==='income'?'pos':'neg'}">${s}${fmt(t.amount)}</div>
      <div class="txn-date">${fmtDate(t.date)}</div>
    </div>
    <div class="txn-actions">
      <button class="act-btn act-edit" onclick="openEdit('${t.id}')" title="Edit">✏️</button>
      <button class="act-btn act-del"  onclick="deleteTxn('${t.id}')" title="Delete">🗑️</button>
    </div>
  </div>`;
}

function renderRecentList(){
  const el=document.getElementById('recent-list');
  const items=monthTxns().slice(0,6);
  if(!items.length){
    el.innerHTML=emptyState('💸','No transactions yet','Tap "+ Add Expense" or "+ Add Income" to get started!');return;
  }
  el.innerHTML='<div class="txn-list">'+items.map(txnRow).join('')+'</div>';
}

// ═══════════════════════════════════
// DONUT
// ═══════════════════════════════════
function renderDonut(){
  const mt=monthTxns().filter(t=>t.type==='expense');
  const total=mt.reduce((s,t)=>s+t.amount,0);
  document.getElementById('donut-cv').textContent=fmt(total);
  const map={};mt.forEach(t=>{map[t.category]=(map[t.category]||0)+t.amount;});
  const entries=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,7);
  const canvas=document.getElementById('donut-c');
  const ctx=canvas.getContext('2d');
  const W=140,H=140,cx=70,cy=70,OR=62,IR=40;
  ctx.clearRect(0,0,W,H);
  if(!entries.length){
    ctx.beginPath();ctx.arc(cx,cy,OR,0,Math.PI*2);
    ctx.strokeStyle='#E4E9F2';ctx.lineWidth=OR-IR;ctx.stroke();
    document.getElementById('donut-legend').innerHTML='<span style="font-size:13px;color:var(--text3);font-weight:500">No expenses this month 🎉</span>';
    return;
  }
  let angle=-Math.PI/2;
  entries.forEach(([catId,val])=>{
    const cat=getCat(catId);
    const slice=(val/total)*Math.PI*2;
    ctx.beginPath();ctx.arc(cx,cy,OR,angle,angle+slice);
    ctx.arc(cx,cy,IR,angle+slice,angle,true);
    ctx.closePath();ctx.fillStyle=cat.color;ctx.fill();
    angle+=slice+0.015;
  });
  document.getElementById('donut-legend').innerHTML=entries.map(([id,val])=>{
    const c=getCat(id);
    return `<div class="leg-row"><div class="leg-dot" style="background:${c.color}"></div>
      <span class="leg-name">${c.emoji} ${c.label}</span>
      <span class="leg-pct">${Math.round((val/total)*100)}%</span></div>`;
  }).join('');
}

// ═══════════════════════════════════
// TREND CHART
// ═══════════════════════════════════
function renderTrend(){
  const canvas=document.getElementById('trend-c');
  const W=canvas.parentElement.offsetWidth-40||280,H=110;
  canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,W,H);
  const months=[];
  for(let i=5;i>=0;i--){const d=new Date(curMonth);d.setMonth(d.getMonth()-i);months.push(d);}
  const data=months.map(m=>{
    const mt=txns.filter(t=>{const td=new Date(t.date);return td.getFullYear()===m.getFullYear()&&td.getMonth()===m.getMonth();});
    return{label:m.toLocaleDateString('en-IN',{month:'short'}),
      inc:mt.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0),
      exp:mt.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0)};
  });
  const maxV=Math.max(...data.flatMap(d=>[d.inc,d.exp]),1);
  const pad={t:8,b:22,l:4,r:4};
  const cH=H-pad.t-pad.b,cW=W-pad.l-pad.r;
  const slotW=cW/data.length,bW=slotW*0.3,gap=slotW*0.05;
  data.forEach((d,i)=>{
    const x=pad.l+i*slotW+slotW*0.1;
    const iH=Math.max((d.inc/maxV)*cH,2),eH=Math.max((d.exp/maxV)*cH,2);
    ctx.fillStyle='rgba(5,150,105,.7)';
    ctx.beginPath();ctx.roundRect(x,pad.t+cH-iH,bW,iH,3);ctx.fill();
    ctx.fillStyle='rgba(220,38,38,.7)';
    ctx.beginPath();ctx.roundRect(x+bW+gap,pad.t+cH-eH,bW,eH,3);ctx.fill();
    ctx.fillStyle='#9CA3AF';ctx.font='bold 10px Inter,sans-serif';ctx.textAlign='center';
    ctx.fillText(d.label,x+bW+gap/2,H-5);
  });
}
// ═══════════════════════════════════
// BUDGET HOME
// ═══════════════════════════════════
function renderBudgetHome(){
  const el=document.getElementById('bud-home');
  const mt=monthTxns().filter(t=>t.type==='expense');
  const cats=Object.keys(budgets);
  if(!cats.length){
    el.innerHTML=emptyState('🎯','No budgets set','Go to "Budget Limits" to set spending caps.',true);return;
  }
  el.innerHTML=cats.map(catId=>{
    const limit=budgets[catId];
    const spent=mt.filter(t=>t.category===catId).reduce((s,t)=>s+t.amount,0);
    const pct=Math.min((spent/limit)*100,100);
    const cat=getCat(catId);
    const over=spent>limit;
    const fill=over?'var(--red)':pct>75?'var(--amber)':'var(--green)';
    return `<div class="bud-item">
      <div class="bud-row">
        <span class="bud-name">${cat.emoji} ${cat.label}</span>
        <span class="bud-chip ${over?'bud-over':pct>75?'bud-warn':'bud-good'}">${over?'⚠️ Over':pct>75?'⚡ Near limit':'✅ Good'}</span>
      </div>
      <div class="prog"><div class="prog-fill" style="width:${pct}%;background:${fill}"></div></div>
      <div class="bud-row"><span class="bud-vals">${fmt(spent)} of ${fmt(limit)}</span><span class="bud-vals">${Math.round(pct)}%</span></div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════
// SMART INSIGHT BANNER
// ═══════════════════════════════════
function renderSmartInsightBanner(){
  const mt=monthTxns();
  const exp=mt.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const inc=mt.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const el=document.getElementById('smart-insight-banner');
  let msg='';let icon='💡';
  if(!mt.length){
    el.innerHTML='';return;
  }
  const rate=inc>0?Math.round(((inc-exp)/inc)*100):0;
  if(rate>=30){msg=`Amazing! You're saving ${rate}% of your income this month. Keep it up! 🌟`;icon='🎉';}
  else if(rate>=20){msg=`Good progress! You've saved ${rate}% of your income. Try to push it above 30% next month.`;icon='✅';}
  else if(rate>=0){msg=`You've spent most of your income this month. Consider cutting back on non-essentials.`;icon='💡';}
  else{msg=`You've spent more than you earned this month. Review your expenses to get back on track.`;icon='⚠️';}
  const catMap={};
  mt.filter(t=>t.type==='expense').forEach(t=>{catMap[t.category]=(catMap[t.category]||0)+t.amount;});
  const top=Object.entries(catMap).sort((a,b)=>b[1]-a[1])[0];
  const topNote=top?` Your highest spending is on ${getCat(top[0]).label} (${fmt(top[1])}).`:'';
  el.innerHTML=`<div class="insight-card mb20">
    <div class="insight-icon">${icon}</div>
    <div><div class="insight-title">Smart Insight for ${curMonth.toLocaleDateString('en-IN',{month:'long'})}</div>
    <div class="insight-body">${msg}${topNote}</div></div>
  </div>`;
}

// ═══════════════════════════════════
// ACTIVITY PAGE
// ═══════════════════════════════════
function renderActivity(){
  const srch=document.getElementById('srch').value.toLowerCase();
  const typeF=document.getElementById('flt-type').value;
  const catF=document.getElementById('flt-cat').value;
  const sortV=document.getElementById('flt-sort').value;
  const allC=[...new Set(txns.map(t=>t.category))];
  const catEl=document.getElementById('flt-cat');
  const prev=catEl.value;
  catEl.innerHTML='<option value="">All Categories</option>'+allC.map(c=>{
    const cat=getCat(c);
    return `<option value="${c}" ${prev===c?'selected':''}>${cat.emoji} ${cat.label}</option>`;
  }).join('');
  let filtered=monthTxns().filter(t=>{
    if(srch&&!t.desc.toLowerCase().includes(srch)&&!(t.note||'').toLowerCase().includes(srch))return false;
    if(typeF&&t.type!==typeF)return false;
    if(catF&&t.category!==catF)return false;
    return true;
  });
  if(sortV==='date-asc')filtered.sort((a,b)=>new Date(a.date)-new Date(b.date));
  else if(sortV==='date-desc')filtered.sort((a,b)=>new Date(b.date)-new Date(a.date));
  else if(sortV==='amt-desc')filtered.sort((a,b)=>b.amount-a.amount);
  else if(sortV==='amt-asc')filtered.sort((a,b)=>a.amount-b.amount);
  const el=document.getElementById('activity-list');
  if(!filtered.length){
    el.innerHTML=emptyState('🔍','Nothing found','Try different filters or add a new transaction.');return;
  }
  el.innerHTML='<div class="txn-list">'+filtered.map(txnRow).join('')+'</div>';
}

// ═══════════════════════════════════
// GOALS PAGE
// ═══════════════════════════════════
function renderGoals(){
  const el=document.getElementById('goals-grid');
  if(!goals.length){
    el.innerHTML=`<div style="grid-column:1/-1">${emptyState('🎯','No goals yet','Add your first savings goal — like a laptop, vacation, or emergency fund!',true)}</div>`;
    return;
  }
  el.innerHTML=goals.map(g=>{
    const pct=Math.min(Math.round((g.saved/g.target)*100),100);
    const done=pct>=100;
    const fill=done?'var(--green)':pct>=60?'var(--primary)':'var(--amber)';
    const rem=Math.max(g.target-g.saved,0);
    let deadlineNote='';
    if(g.deadline&&!done){
      const dl=new Date(g.deadline);
      const today=new Date();
      const days=Math.ceil((dl-today)/(1000*60*60*24));
      deadlineNote=`<div style="font-size:11px;color:var(--text3);margin-top:4px;font-weight:500">📅 ${days>0?days+' days left':'Deadline passed'}</div>`;
    }
    return `<div class="goal-card">
      <div style="position:absolute;top:14px;right:14px;display:flex;gap:5px">
        <button class="act-btn act-edit" onclick="openGoalModal('${g.id}')" title="Edit">✏️</button>
        <button class="act-btn act-del"  onclick="deleteGoal('${g.id}')" title="Delete">🗑️</button>
      </div>
      <div class="goal-card-hd">
        <div class="goal-icon" style="background:var(--primary-lt)">${g.icon}</div>
        <div>
          <div class="goal-name">${esc(g.name)}</div>
          <div class="goal-target">Target: ${fmt(g.target)}</div>
          ${deadlineNote}
        </div>
      </div>
      <div class="prog"><div class="prog-fill" style="width:${pct}%;background:${fill};height:10px;border-radius:99px"></div></div>
      <div class="goal-meta">
        <div class="goal-pct" style="color:${fill}">${pct}%</div>
        <div>
          <div style="font-size:14px;font-weight:800;color:var(--text)">${fmt(g.saved)} saved</div>
          <div class="goal-remaining">${done?'Goal reached! 🎊':fmt(rem)+' to go'}</div>
        </div>
      </div>
      ${done
        ?`<div class="goal-complete-banner">🎊 Congratulations! Goal Achieved!</div>`
        :`<div class="goal-add-btn" onclick="openAddToGoal('${g.id}')">💰 Add Money</div>`}
    </div>`;
  }).join('');
}

// ═══════════════════════════════════
// INSIGHTS PAGE
// ═══════════════════════════════════
function renderInsights(){
  const mt=monthTxns().filter(t=>t.type==='expense');
  const total=mt.reduce((s,t)=>s+t.amount,0);
  const days=new Date(curMonth.getFullYear(),curMonth.getMonth()+1,0).getDate();
  const inc=monthTxns().filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const sorted=[...mt].sort((a,b)=>b.amount-a.amount);
  const catMap={};mt.forEach(t=>{catMap[t.category]=(catMap[t.category]||0)+t.amount;});
  const topCat=Object.entries(catMap).sort((a,b)=>b[1]-a[1])[0];
  const chips=[
    {icon:'📅',label:'Avg Daily Spend',val:fmt(total/days)},
    {icon:'🏆',label:'Biggest Expense',val:sorted[0]?fmt(sorted[0].amount)+' – '+sorted[0].desc:'None'},
    {icon:'🔥',label:'Top Category',val:topCat?getCat(topCat[0]).emoji+' '+getCat(topCat[0]).label:'None'},
    {icon:'💰',label:'Money Available',val:fmt(Math.max(inc-total,0))},
  ];
  document.getElementById('insights-chips').innerHTML=chips.map(c=>`
    <div class="insight-chip">
      <span class="ichip-icon">${c.icon}</span>
      <div><div class="ichip-lbl">${c.label}</div><div class="ichip-val">${c.val}</div></div>
    </div>`).join('');
  renderBarChart(catMap);
  renderSmartInsights(mt,catMap,total,inc);
}

function renderSmartInsights(mt,catMap,total,inc){
  const insights=[];
  if(!mt.length){insights.push({icon:'😊',txt:'No expenses recorded yet this month. Add some to get personalized insights!'});
  }else{
    const rate=inc>0?Math.round(((inc-total)/inc)*100):0;
    if(rate>=30)insights.push({icon:'🌟',txt:`Excellent savings rate of ${rate}%! You're on track to build wealth.`});
    else if(rate>=20)insights.push({icon:'✅',txt:`You're saving ${rate}% of your income. Aim for 30% to build a solid emergency fund.`});
    else if(rate>0)insights.push({icon:'⚡',txt:`Your savings rate is only ${rate}%. Try to cut discretionary spending to boost it above 20%.`});
    else if(inc>0)insights.push({icon:'🚨',txt:`You've spent more than you earned this month. Identify areas to cut back immediately.`});
    const topCat=Object.entries(catMap).sort((a,b)=>b[1]-a[1])[0];
    if(topCat){
      const pct=Math.round((topCat[1]/total)*100);
      const cat=getCat(topCat[0]);
      if(pct>40)insights.push({icon:'🔍',txt:`${cat.emoji} ${cat.label} accounts for ${pct}% of your spending (${fmt(topCat[1])}). Consider if this is a priority.`});
      else insights.push({icon:'📊',txt:`Your spending is fairly spread out. Top category is ${cat.emoji} ${cat.label} at ${pct}% of total.`});
    }
    const recurring=mt.filter(t=>t.recurring).reduce((s,t)=>s+t.amount,0);
    if(recurring>0){
      const rPct=Math.round((recurring/total)*100);
      insights.push({icon:'🔁',txt:`Fixed monthly payments (rent, subscriptions) account for ${rPct}% of your expenses (${fmt(recurring)}).`});
    }
    if(mt.length>=10)insights.push({icon:'📈',txt:`You've recorded ${mt.length} transactions this month — great habit! Consistent tracking leads to smarter decisions.`});
  }
  document.getElementById('smart-insights-list').innerHTML=insights.map(i=>`
    <div style="display:flex;align-items:flex-start;gap:14px;padding:14px 0;border-bottom:1.5px solid var(--border)">
      <span style="font-size:22px;flex-shrink:0;margin-top:2px">${i.icon}</span>
      <span style="font-size:14px;color:var(--text2);line-height:1.6;font-weight:500">${i.txt}</span>
    </div>`).join('');
}

function renderBarChart(catMap){
  const canvas=document.getElementById('bar-c');
  const W=canvas.parentElement.offsetWidth-44||260,H=170;
  canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,W,H);
  const entries=Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,6);
  if(!entries.length)return;
  const maxV=Math.max(...entries.map(e=>e[1]),1);
  const pad={t:26,b:32,l:4,r:4};
  const cH=H-pad.t-pad.b,cW=W-pad.l-pad.r;
  const slotW=cW/entries.length,bW=slotW*0.55;
  entries.forEach(([catId,val],i)=>{
    const cat=getCat(catId);
    const x=pad.l+i*slotW+(slotW-bW)/2;
    const h=Math.max((val/maxV)*cH,4);
    ctx.fillStyle=cat.color+'CC';
    ctx.beginPath();ctx.roundRect(x,pad.t+cH-h,bW,h,6);ctx.fill();
    ctx.fillStyle='#4B5563';ctx.font='bold 10px Inter,sans-serif';ctx.textAlign='center';
    ctx.fillText(cat.emoji,x+bW/2,H-12);
    ctx.fillStyle='#111827';ctx.font='bold 11px Inter,sans-serif';
    ctx.fillText(fmt(val),x+bW/2,pad.t+cH-h-5);
  });
}

// ═══════════════════════════════════
// PAYMENTS PAGE
// ═══════════════════════════════════
function renderPayments(){
  const recs=txns.filter(t=>t.recurring);
  const el=document.getElementById('payments-list');
  if(!recs.length){
    el.innerHTML=emptyState('🔁','No monthly payments','Tick "Repeats every month" when adding rent, Netflix, or EMI.');return;
  }
  const monthly=recs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  el.innerHTML=`<div style="padding:13px 22px;background:var(--red-lt);border-bottom:1.5px solid #FCA5A5;font-size:13px;font-weight:700;color:var(--red);display:flex;align-items:center;gap:8px;">
    📊 Total monthly fixed expenses: ${fmt(monthly)}</div>
    <div class="txn-list">${recs.map(txnRow).join('')}</div>`;
}

// ═══════════════════════════════════
// BUDGET PAGE
// ═══════════════════════════════════
function renderBudgetPage(){
  const mt=monthTxns().filter(t=>t.type==='expense');
  document.getElementById('bud-setup').innerHTML=CATS.expense.map(c=>`
    <div style="display:flex;align-items:center;gap:12px;background:var(--surface2);padding:11px 14px;border-radius:var(--radius-md);border:1.5px solid var(--border)">
      <span style="font-size:22px;width:30px;text-align:center">${c.emoji}</span>
      <span style="flex:1;font-size:14px;font-weight:700">${c.label}</span>
      <input style="width:120px;padding:8px 10px;text-align:right;font-weight:700;border-radius:var(--radius-sm)" type="number"
        id="bud-${c.id}" placeholder="${sym()} limit" min="0" value="${budgets[c.id]||''}"
        onchange="setBudget('${c.id}',this.value)"/>
    </div>`).join('');
  const cats=Object.keys(budgets);
  const prog=document.getElementById('bud-progress');
  if(!cats.length){prog.innerHTML=emptyState('✏️','Enter limits on the left','Budget progress will appear here once you set a limit.',true);return;}
  prog.innerHTML=cats.map(catId=>{
    const limit=budgets[catId];
    const spent=mt.filter(t=>t.category===catId).reduce((s,t)=>s+t.amount,0);
    const pct=Math.min((spent/limit)*100,100);
    const cat=getCat(catId);const over=spent>limit;
    const fill=over?'var(--red)':pct>75?'var(--amber)':'var(--green)';
    const rem=limit-spent;
    return `<div class="bud-item">
      <div class="bud-row">
        <span class="bud-name">${cat.emoji} ${cat.label}</span>
        <span class="bud-chip ${over?'bud-over':pct>75?'bud-warn':'bud-good'}">${over?'⚠️ Over by '+fmt(-rem):pct>75?'⚡ '+fmt(rem)+' left':'✅ '+fmt(rem)+' left'}</span>
      </div>
      <div class="prog"><div class="prog-fill" style="width:${pct}%;background:${fill}"></div></div>
      <div class="bud-row"><span class="bud-vals">${fmt(spent)} of ${fmt(limit)}</span><span class="bud-vals">${Math.round(pct)}%</span></div>
    </div>`;
  }).join('');
}
function setBudget(catId,val){
  if(val&&parseFloat(val)>0)budgets[catId]=parseFloat(val);
  else delete budgets[catId];
  save();renderBudgetHome();
  if(document.getElementById('page-budget').classList.contains('active'))renderBudgetPage();
}

// ═══════════════════════════════════
// SETTINGS
// ═══════════════════════════════════
function loadSettings(){
  document.getElementById('set-name').value=profile.name||'';
  document.getElementById('set-savings-goal').value=profile.savingsGoal||'';
  document.getElementById('set-currency').value=profile.currency||'₹';
  applyTheme(profile.theme);
}
function saveProfile(){
  profile.name=document.getElementById('set-name').value.trim()||profile.name;
  profile.savingsGoal=parseFloat(document.getElementById('set-savings-goal').value)||0;
  save();updateAll();toast('Profile saved! ✅','s');
}
function saveCurrency(){
  profile.currency=document.getElementById('set-currency').value;
  save();updateAll();toast('Currency updated! 💱','s');
}

// ═══════════════════════════════════
// EXPORT
// ═══════════════════════════════════
function exportCSV(){
  const mt=monthTxns();
  if(!mt.length)return toast('No transactions this month','e');
  const rows=[['Date','Description','Type','Category','Amount','Note']];
  mt.forEach(t=>{const cat=getCat(t.category);rows.push([t.date,t.desc,t.type==='income'?'Income':'Expense',cat.label,t.amount,t.note||'']);});
  const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download=`SpendWise-${curMonth.toISOString().slice(0,7)}.csv`;a.click();
  toast('CSV downloaded! ⬇️','s');
}
function clearAll(){
  if(!confirm('This will permanently delete ALL your data. Are you sure?'))return;
  txns=[];budgets={};goals=[];save();updateAll();toast('All data cleared 🗑️','i');
}

// ═══════════════════════════════════
// TOAST
// ═══════════════════════════════════
function toast(msg,type='i'){
  const icons={s:'✅',e:'❌',i:'ℹ️'};
  const el=document.createElement('div');
  el.className=`toast t${type}`;
  el.innerHTML=`<span style="font-size:16px">${icons[type]}</span><span>${msg}</span>`;
  document.getElementById('toasts').appendChild(el);
  setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),220);},3000);
}

// ═══════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════
function emptyState(emoji,title,body,compact=false){
  return `<div class="empty" style="${compact?'padding:30px 20px':''}">
    <div class="empty-illo"><svg width="90" height="90" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="45" cy="45" r="40" fill="var(--surface2)" stroke="var(--border)" stroke-width="2"/>
      <text x="45" y="58" font-size="28" text-anchor="middle" font-family="Inter">${emoji}</text>
    </svg></div>
    <div class="empty-title">${title}</div>
    <div class="empty-body">${body}</div>
  </div>`;
}

// ═══════════════════════════════════
// SEED DATA
// ═══════════════════════════════════
function seedData(){
  if(txns.length)return;
  const y=new Date().getFullYear(),m=new Date().getMonth();
  const d=n=>`${y}-${String(m+1).padStart(2,'0')}-${String(n).padStart(2,'0')}`;
  txns=[
    {id:'1',desc:'Monthly Salary',amount:75000,date:d(1),type:'income',category:'salary',note:'',recurring:true},
    {id:'2',desc:'Apartment Rent',amount:18000,date:d(1),type:'expense',category:'rent',note:'',recurring:true},
    {id:'3',desc:'Big Bazaar Grocery',amount:3200,date:d(4),type:'expense',category:'food',note:'Monthly groceries'},
    {id:'4',desc:'Netflix & Spotify',amount:999,date:d(5),type:'expense',category:'fun',note:'',recurring:true},
    {id:'5',desc:'Uber Rides',amount:1100,date:d(7),type:'expense',category:'transport',note:'Week 1'},
    {id:'6',desc:'Electricity Bill',amount:1800,date:d(8),type:'expense',category:'bills',note:''},
    {id:'7',desc:'Freelance Project',amount:12000,date:d(10),type:'income',category:'freelance',note:'Logo design'},
    {id:'8',desc:'Amazon Shopping',amount:4200,date:d(12),type:'expense',category:'shopping',note:'Headphones'},
    {id:'9',desc:'Doctor Visit',amount:950,date:d(14),type:'expense',category:'health',note:''},
    {id:'10',desc:'Udemy Course',amount:499,date:d(16),type:'expense',category:'education',note:'React'},
    {id:'11',desc:'Restaurant Dinner',amount:2100,date:d(18),type:'expense',category:'food',note:'With family'},
    {id:'12',desc:'Weekend Trip',amount:5800,date:d(20),type:'expense',category:'travel',note:'Lonavala'},
  ];
  budgets={food:8000,transport:2000,fun:1500,shopping:5000,bills:3000};
  goals=[
    {id:'g1',name:'New Laptop',target:60000,saved:32000,icon:'💻',deadline:''},
    {id:'g2',name:'Goa Vacation',target:25000,saved:8500,icon:'🏖️',deadline:''},
    {id:'g3',name:'Emergency Fund',target:100000,saved:45000,icon:'🏦',deadline:''},
  ];
  save();
}
// ═══════════════════════════════════
// INIT
// ═══════════════════════════════════
(function init(){
  const hasProfile=localStorage.getItem('sw3_profile');
  if(hasProfile){
    document.getElementById('onboard').style.display='none';
    document.getElementById('app').style.display='flex';
    applyTheme(profile.theme);
    seedData();
    updateAll();
    renderChips();
    setType('expense');
  }
  renderGoalIcons();
})();

let resizeTimer;
window.addEventListener('resize',()=>{
clearTimeout(resizeTimer);
resizeTimer=setTimeout(()=>{
renderTrend();
if(document.getElementById('page-insights').classList.contains('active')){
  renderInsights();
}
},200);
});
