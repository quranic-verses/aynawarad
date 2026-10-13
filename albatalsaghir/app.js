(function(){
'use strict';
const CFG = window.QUIZ_CONFIG || {};
const PALETTE = ['#FF6B57','#3B82F6','#A855F7','#0EA5A4','#EC4899','#F59E0B','#1FA463','#6366F1'];
const KID_COLORS = ['#FF6B57','#3B82F6','#1FA463','#A855F7','#F59E0B','#EC4899','#0EA5A4','#6366F1','#E11D48','#0284C7','#65A30D','#C026D3'];
const MAX_KIDS = 25, MAX_Q = 20;
const PLACEHOLDERS = ['يوسف', 'يحيى'];
const STORE_KEY = 'albatal.bank.' + (CFG.sheetId || 'local');
const ar = n => Number(n).toLocaleString('ar-EG');

/* ---------- storage (never required) ---------- */
const store = {
  get(k){ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } },
  set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};

/* ---------- question bank ---------- */
// Bank format: [{title, qs:[[question, correct, wrong1, wrong2, wrong3?], ...]}]
// Three sections on screen: the sheet's sections (column «القسم») are grouped into them; a section name that isn't
// listed here keeps its own chip, so nothing in the sheet is lost.
const GROUPS = [
  ['الأنبياء', '#3B82F6', ['أسماء الأنبياء', 'أولو العزم من الرسل', 'الأنبياء']],
  ['السيرة', '#FF6B57', ['اسم النبي ﷺ كاملًا', 'أبناء النبي ﷺ', 'زوجات النبي ﷺ', 'الخلفاء الراشدون', 'العشرة المبشرون بالجنة', 'السيرة']],
  ['جزء عمّ', '#1FA463', ['جزء عمّ', 'جزء عم']]
];
function toCats(bank){
  const out = GROUPS.map(([title, color]) => ({ id: title, title, color, qs: [] }));
  bank.filter(c => c.qs && c.qs.length).forEach(c => {
    const gi = GROUPS.findIndex(g => g[2].includes(c.title.trim()));
    let cat = gi >= 0 ? out[gi] : out.find(x => x.id === c.title);
    if (!cat) { cat = { id: c.title, title: c.title, color: PALETTE[out.length % PALETTE.length], qs: [] }; out.push(cat); }
    c.qs.forEach(r => cat.qs.push([r[0], r.slice(1).filter(Boolean)]));
  });
  return out.filter(c => c.qs.length);
}
let CATS = toCats(store.get(STORE_KEY)?.bank || window.BUILTIN_QUESTIONS || []);

function parseCSV(text){
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++){
    const ch = text[i];
    if (q){
      if (ch === '"'){ if (text[i+1] === '"'){ cur += '"'; i++; } else q = false; }
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ','){ row.push(cur); cur = ''; }
    else if (ch === '\n'){ row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (ch !== '\r') cur += ch;
  }
  if (cur !== '' || row.length){ row.push(cur); rows.push(row); }
  return rows;
}
function rowsToBank(rows){
  const order = [], map = {};
  rows.forEach((r, i) => {
    const t = s => (s || '').trim();
    const [cat, q, right, w1, w2, w3, show] = r.map(t);
    if (i === 0 && cat === 'القسم') return;           // header row
    if (!cat || !q || !right) return;
    if (show === 'لا') return;                        // hidden in the sheet
    const wrongs = [w1, w2, w3].filter(w => w && w !== right);
    if (wrongs.length < 1 && !isRecite(q)) return;     // «أكمل» questions need no options
    if (!map[cat]){ map[cat] = { title: cat, qs: [] }; order.push(cat); }
    map[cat].qs.push([q, right, ...wrongs]);
  });
  return order.map(c => map[c]);
}
async function loadSheet(){
  if (!CFG.sheetId) return;
  const url = `https://docs.google.com/spreadsheets/d/${CFG.sheetId}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(CFG.sheetName || 'الأسئلة')}&_=${Date.now()}`;
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), CFG.timeoutMs || 6000);
  try{
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    const text = await res.text();
    if (/^\s*</.test(text)) throw new Error('not csv');  // sheet not shared publicly → HTML page
    const bank = rowsToBank(parseCSV(text));
    if (!bank.length) throw new Error('empty');
    store.set(STORE_KEY, { bank, at: Date.now() });
    CATS = toCats(bank);
    if (onSetup) refreshSetup();
  }catch(e){ /* keep saved or built-in questions */ }
  finally{ clearTimeout(timer); }
}

/* ---------- helpers ---------- */
const starSVG = (c, size) => `<svg viewBox="0 0 40 40" ${size?`width="${size}" height="${size}"`:''} aria-hidden="true"><g transform="translate(20 20)" fill="${c}" stroke="#1F2547" stroke-width="2.5" stroke-linejoin="round"><rect x="-11" y="-11" width="22" height="22"/><rect x="-11" y="-11" width="22" height="22" transform="rotate(45)"/></g><circle cx="20" cy="20" r="4.5" fill="#fff"/></svg>`;
const checkSVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="#1FA463" stroke="#1F2547" stroke-width="1.6"/><path d="M7 12.5l3.2 3.2L17 8.8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const bulbSVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2a7 7 0 0 0-4.2 12.6c.8.6 1.2 1.4 1.2 2.3V18h6v-.9c0-.9.4-1.7 1.2-2.3A7 7 0 0 0 12 2.2z" fill="#FFD23F" stroke="#1F2547" stroke-width="1.6" stroke-linejoin="round"/><rect x="9" y="18.6" width="6" height="3.2" rx="1.2" fill="#3B6FE0" stroke="#1F2547" stroke-width="1.4"/><path d="M10 10.5l2 2 2-2" fill="none" stroke="#1F2547" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmtQ = s => esc(s).replace(/﴿[^﴾]*﴾/g, m => `<span class="ayah">${m}</span>`).replace(/ﷺ/g, '<span class="saw">ﷺ</span>');
const shuffle = a => { a = a.slice(); for (let i = a.length-1; i > 0; i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; };
const initial = n => (Array.from(n.trim())[0] || '؟');
const pick = a => a[Math.floor(Math.random()*a.length)];
const kidColor = i => KID_COLORS[i % KID_COLORS.length];
const placeholder = i => PLACEHOLDERS[i] || ('البطل ' + ar(i+1));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// Questions that start with «أكمل» are said aloud; a parent marks them right or wrong.
const isRecite = q => /^\s*أكمل/.test(q || '');

/* ---------- sound: pops, a soft chime-free "bloop", applause — no music ---------- */
let ctx = null, master = null, noiseBuf = null, soundOn = store.get('albatal.sound') !== false;
let celebBus = null, lastCeleb = 0;
function audio(){
  if (!ctx){
    try{ ctx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ return null; }
    // One shared output with a limiter, so overlapping sounds can't clip or distort.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 12; comp.attack.value = .003; comp.release.value = .2;
    master = ctx.createGain(); master.gain.value = .9;
    master.connect(comp).connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random()*2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function pop(t, base, out, vol){
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(base, t); o.frequency.exponentialRampToValueAtTime(base*2.6, t+.07);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol || .32, t+.008); g.gain.exponentialRampToValueAtTime(.0001, t+.12);
  o.connect(g).connect(out || master); o.start(t); o.stop(t+.14);
}
function sndRight(){ if (!soundOn || !audio()) return; const t = ctx.currentTime; pop(t,380); pop(t+.11,520); pop(t+.22,700); }
function sndLearn(){ if (!soundOn || !audio()) return; const t = ctx.currentTime; pop(t,300,null,.22); pop(t+.16,360,null,.22); }
function clap(t, amp, out){
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900 + Math.random()*1800; f.Q.value = .9;
  const g = ctx.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(amp, t+.003); g.gain.exponentialRampToValueAtTime(.0001, t+.07+Math.random()*.04);
  s.connect(f).connect(g).connect(out); s.start(t, Math.random()*1.8, .12);
}
function sndCelebrate(){
  if (!soundOn || !audio()) return;
  const now = ctx.currentTime;
  if (now - lastCeleb < .7) return;            // ignore rapid repeat taps
  lastCeleb = now;
  // Fade out the previous round of applause instead of stacking a second one on top.
  if (celebBus){ const old = celebBus; old.gain.cancelScheduledValues(now); old.gain.setTargetAtTime(0, now, .05); setTimeout(() => { try{ old.disconnect(); }catch(e){} }, 400); }
  const bus = ctx.createGain(); bus.gain.value = 1; bus.connect(master); celebBus = bus;
  const t0 = now + .05;
  for (let i = 0; i < 8; i++) pop(t0 + i*.07 + Math.random()*.03, 300 + Math.random()*500, bus);
  const dur = 3.2;
  for (let i = 0; i < 150; i++){
    const x = Math.random(), t = t0 + .25 + x*dur;
    const env = x < .15 ? x/.15 : Math.pow(1 - (x-.15)/.85, 1.4);
    clap(t, .04 + .28*env*Math.random(), bus);
  }
}

/* ---------- confetti ---------- */
const cv = document.getElementById('confetti'), cx = cv.getContext('2d'); let parts = [], raf = null;
function confetti(){
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = innerWidth*dpr; cv.height = innerHeight*dpr;
  const cols = ['#FF6B57','#FFB21F','#1FA463','#3B82F6','#A855F7','#EC4899'];
  const add = Math.max(0, Math.min(170, 420 - parts.length));   // cap total pieces
  for (let i = 0; i < add; i++) parts.push({x:Math.random()*cv.width, y:-Math.random()*cv.height*.5, vx:(Math.random()-.5)*4, vy:(2+Math.random()*4)*dpr, r:Math.random()*6.28, vr:(Math.random()-.5)*.3, s:(6+Math.random()*8)*dpr, c:cols[i%cols.length], star:Math.random()<.3});
  if (!raf) tick();
}
function tick(){
  cx.clearRect(0, 0, cv.width, cv.height);
  parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vy += .03; cx.save(); cx.translate(p.x,p.y); cx.rotate(p.r); cx.fillStyle = p.c;
    if (p.star){ cx.fillRect(-p.s/2,-p.s/2,p.s,p.s); cx.rotate(Math.PI/4); cx.fillRect(-p.s/2,-p.s/2,p.s,p.s); } else cx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2); cx.restore(); });
  parts = parts.filter(p => p.y < cv.height + 40);
  raf = parts.length ? requestAnimationFrame(tick) : (cx.clearRect(0,0,cv.width,cv.height), null);
}

/* ---------- top bar ---------- */
const soundBtn = document.getElementById('soundBtn');
const paintSound = () => { soundBtn.setAttribute('aria-pressed', soundOn); soundBtn.textContent = soundOn ? 'الصوت: يعمل' : 'الصوت: متوقف'; };
paintSound();
soundBtn.addEventListener('click', () => { soundOn = !soundOn; store.set('albatal.sound', soundOn); paintSound(); });

// Install as an app
let deferredPrompt = null;
const installBtn = document.getElementById('installBtn');
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; if (!isStandalone()) installBtn.hidden = false; });
window.addEventListener('appinstalled', () => { installBtn.hidden = true; deferredPrompt = null; });
if (isIOS && !isStandalone()) installBtn.hidden = false;
installBtn.addEventListener('click', async () => {
  if (deferredPrompt){ deferredPrompt.prompt(); await deferredPrompt.userChoice.catch(()=>{}); deferredPrompt = null; installBtn.hidden = true; return; }
  const tip = document.getElementById('iosTip'); if (tip) { tip.hidden = !tip.hidden; if (!tip.hidden) tip.scrollIntoView({behavior:'smooth', block:'nearest'}); }
});

// Home link: mid-quiz it asks for a second tap so a stray tap doesn't end the round.
let inGame = false, homeArmed = null;
const homeBtn = document.getElementById('homeBtn');
function resetHome(){ clearTimeout(homeArmed); homeArmed = null; homeBtn.classList.remove('warn'); homeBtn.textContent = 'البطل الصغير'; }
homeBtn.addEventListener('click', () => {
  if (inGame && !homeArmed){ homeBtn.classList.add('warn'); homeBtn.textContent = 'اضغط مرة أخرى للخروج'; homeArmed = setTimeout(resetHome, 3000); return; }
  resetHome();
  S.certIdx = 0; setup();
});

/* ---------- state ---------- */
const screen = document.getElementById('screen');
const S = { count: 2, names: [], off: new Set(), qPer: null, players: [], plan: [], idx: 0, certIdx: 0 };
let onSetup = false;
const activeCats = () => CATS.filter(c => !S.off.has(c.id));
const qPer = () => S.qPer || clamp(activeCats().length || 1, 1, MAX_Q);
function render(html){ screen.innerHTML = html; window.scrollTo({ top: 0, behavior: 'smooth' }); }
function saveNames(){ for (let i = 0; i < S.count; i++){ const el = document.getElementById('name'+i); if (el) S.names[i] = el.value; } }
function refreshSetup(){ saveNames(); const f = document.activeElement && document.activeElement.id; setup(true); if (f){ const el = document.getElementById(f); if (el) el.focus(); } }

/* ---------- setup ---------- */
function stepper(id, label, value, min, max){
  return `<div class="field"><label class="label" for="${id}In">${label}</label>
    <div class="stepper">
      <button class="step" id="${id}Plus" type="button" aria-label="زيادة" ${value>=max?'disabled':''}>+</button>
      <input class="count" id="${id}In" type="number" inputmode="numeric" min="${min}" max="${max}" value="${value}">
      <button class="step" id="${id}Minus" type="button" aria-label="إنقاص" ${value<=min?'disabled':''}>−</button>
    </div></div>`;
}
function wireStepper(id, get, set, min, max){
  const inp = document.getElementById(id+'In');
  const apply = v => { saveNames(); set(clamp(v|0 || min, min, max)); setup(true); const el = document.getElementById(id+'In'); };
  document.getElementById(id+'Plus').onclick = () => apply(get() + 1);
  document.getElementById(id+'Minus').onclick = () => apply(get() - 1);
  inp.addEventListener('change', () => apply(parseInt(inp.value, 10)));
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
}
function setup(quiet){
  inGame = false; onSetup = true;
  const total = CATS.reduce((n, c) => n + c.qs.length, 0);
  const html = `<div class="stack">
    <div class="hero"><h1>مسابقة <span>البطل الصغير</span></h1><p>مسابقة للأطفال في السيرة والأنبياء والصحابة وجزء عمّ</p></div>
    <section class="card stack">
      ${stepper('kids', 'كم عدد المتسابقين؟', S.count, 1, MAX_KIDS)}
      <div class="field"><div class="label">أسماء الأبطال</div>
        <div class="names">${Array.from({length:S.count},(_,i)=>`<label class="name-row"><span class="dot" style="background:${kidColor(i)}">${ar(i+1)}</span><input id="name${i}" maxlength="18" placeholder="${esc(placeholder(i))}" value="${esc(S.names[i]||'')}" autocomplete="off" enterkeyhint="next" aria-label="اسم البطل ${ar(i+1)}"></label>`).join('')}</div></div>
      <div class="field"><div class="label">أقسام المسابقة</div>
        <div class="chips">${CATS.map(c=>`<button type="button" class="chip" data-cat="${esc(c.id)}" aria-pressed="${!S.off.has(c.id)}">${starSVG(c.color)}${fmtQ(c.title)}</button>`).join('')}</div></div>
      ${stepper('qper', 'كم سؤالًا لكل بطل؟', qPer(), 1, MAX_Q)}
      <p class="hint" id="qHint">${qHint()}</p>
      <p class="err" id="err"></p>
      <div class="center"><button class="btn big" id="go" type="button">ابدأ المسابقة</button></div>
    </section>
    <div class="ios-tip" id="iosTip" hidden><p>لتثبيت التطبيق على آيفون أو آيباد: افتح الموقع في Safari، واضغط زر المشاركة، ثم اختر «إضافة إلى الشاشة الرئيسية».</p></div>
    <p class="bank-note">${ar(total)} سؤالًا في ${ar(CATS.length)} أقسام</p>
    <nav class="foot"><a href="about.html">عن المسابقة</a><a href="about.html#parents">للوالدين والمعلمين</a><a href="privacy.html">الخصوصية</a></nav>
  </div>`;
  if (quiet){ screen.innerHTML = html; } else render(html);
  wireStepper('kids', () => S.count, v => { S.count = v; }, 1, MAX_KIDS);
  wireStepper('qper', qPer, v => { S.qPer = v; }, 1, MAX_Q);
  screen.querySelectorAll('.chip').forEach(b => b.onclick = () => {
    const id = b.dataset.cat; S.off.has(id) ? S.off.delete(id) : S.off.add(id);
    b.setAttribute('aria-pressed', !S.off.has(id));
    if (!S.qPer){ const el = document.getElementById('qperIn'); if (el) el.value = qPer(); }
    document.getElementById('qHint').textContent = qHint();
  });
  document.getElementById('go').onclick = () => {
    saveNames(); audio();
    if (!activeCats().length){ document.getElementById('err').textContent = 'اختر قسمًا واحدًا على الأقل.'; return; }
    start();
  };
}
function qHint(){
  const n = qPer(), c = activeCats().length;
  if (!c) return '';
  if (n === c) return 'كل بطل يجيب عن سؤال واحد من كل قسم، والأدوار بالتناوب.';
  if (n < c){
    const what = n === 1 ? 'سؤال واحد من قسم يُختار عشوائيًا'
               : n === 2 ? 'سؤالين من قسمين يُختاران عشوائيًا'
               : `${ar(n)} أسئلة من ${ar(n)} أقسام تُختار عشوائيًا`;
    return `كل بطل يجيب عن ${what}، والأدوار بالتناوب.`;
  }
  return 'تتوزع الأسئلة على الأقسام المختارة بالتساوي، والأدوار بالتناوب.';
}

function start(){
  onSetup = false;
  const cats = activeCats(), n = qPer();
  // Round r uses category r (cycling), so every child gets the same mix of sections.
  // When there are fewer questions than sections, a random set of sections is used.
  const order = n < cats.length ? shuffle(cats).slice(0, n).sort((a,b) => cats.indexOf(a) - cats.indexOf(b)) : cats;
  S.players = Array.from({length:S.count}, (_,i) => ({ name: (S.names[i]||'').trim() || placeholder(i), color: kidColor(i), res: [] }));
  S.cats = order; S.plan = [];
  const pools = {};
  const draw = c => { if (!pools[c.id] || !pools[c.id].length) pools[c.id] = shuffle(c.qs); return pools[c.id].pop(); };
  for (let r = 0; r < n; r++){
    const c = order[r % order.length];
    S.players.forEach((p, pi) => { const q = draw(c); S.plan.push({ pi, cat: c, q: q[0], correct: q[1][0], opts: shuffle(q[1]), recite: isRecite(q[0]) }); });
  }
  S.idx = 0; S.certIdx = 0; inGame = true;
  next();
}
function next(){ if (S.idx >= S.plan.length){ results(); return; } if (S.players.length > 1) pass(); else question(); }
const tally = p => ({ right: p.res.filter(r => r.ok).length, learned: p.res.filter(r => !r.ok).length });

/* ---------- pass the device ---------- */
function pass(){
  const it = S.plan[S.idx], p = S.players[it.pi];
  render(`<section class="card pass">
    <div class="avatar wiggle" style="background:${p.color}">${esc(initial(p.name))}</div>
    <div class="turn-label">الدور الآن على</div>
    <div class="big-name" style="color:${p.color}">${esc(p.name)}</div>
    <div class="cat-tag">${starSVG(it.cat.color)}${fmtQ(it.cat.title)}</div>
    <button class="btn big green" id="ready" type="button">أنا جاهز!</button>
  </section>`);
  document.getElementById('ready').onclick = question;
}

/* ---------- question ---------- */
function question(){
  const it = S.plan[S.idx], p = S.players[it.pi];
  const rounds = S.plan.length / S.players.length, round = Math.floor(S.idx / S.players.length) + 1;
  render(`<div class="stack">
    <div class="players">${S.players.map((pl,i)=>{ const t = tally(pl); return `<span class="pchip ${i===it.pi?'now':''}"><span class="dot" style="background:${pl.color}">${esc(initial(pl.name))}</span><span class="n">${esc(pl.name)}</span><span class="sc" title="إجابات صحيحة">${checkSVG}${ar(t.right)}</span><span class="sc" title="معلومات جديدة">${bulbSVG}${ar(t.learned)}</span></span>`; }).join('')}</div>
    <section class="card stack">
      <div class="meta"><span class="cat-tag">${starSVG(it.cat.color)}${fmtQ(it.cat.title)}</span><span class="round">الجولة ${ar(round)} من ${ar(rounds)}</span></div>
      <div class="for">سؤال للبطل <b style="color:${p.color}">${esc(p.name)}</b></div>
      <div class="qtext">${fmtQ(it.q)}</div>
      ${it.recite ? `
      <p class="say">أكملها بصوت عالٍ ليسمعك الكبار</p>
      <div class="parent" id="parent">
        <div class="parent-head"><span>للوالدين أو المعلم: هل أكملها صحيحة؟</span></div>
        <div class="judge">
          <button class="jbtn ok" id="jOk" type="button">${checkSVG}صح</button>
          <button class="jbtn no" id="jNo" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="#FF6B57" stroke="#1F2547" stroke-width="1.6"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>خطأ</button>
        </div>
      </div>` : `
      <div class="opts">${it.opts.map((o,i)=>`<button class="opt" type="button" data-i="${i}">${fmtQ(o)}</button>`).join('')}</div>`}
      <div class="feedback" id="fb" hidden></div>
    </section></div>`);
  let done = false;
  const btns = [...screen.querySelectorAll('.opt')];
  btns.forEach(b => b.onclick = () => {
    if (done) return;
    const ok = it.opts[+b.dataset.i] === it.correct;
    btns.forEach(x => { x.disabled = true; const v = it.opts[+x.dataset.i]; if (v === it.correct) x.classList.add(ok ? 'right' : 'reveal'); else if (x === b) x.classList.add('picked'); else x.classList.add('dim'); });
    answer(ok);
  });
  if (it.recite){
    const judge = ok => { if (done) return; document.getElementById('parent').hidden = true; screen.querySelector('.say').hidden = true; answer(ok); };
    document.getElementById('jOk').onclick = () => judge(true);
    document.getElementById('jNo').onclick = () => judge(false);
  }
  function answer(ok){
    done = true;
    p.res.push({ cat: it.cat.id, ok, q: it.q, correct: it.correct, recite: it.recite });
    ok ? sndRight() : sndLearn();
    const last = S.idx === S.plan.length - 1;
    const nextP = !last && S.players.length > 1 ? S.players[S.plan[S.idx+1].pi] : null;
    const fb = document.getElementById('fb');
    fb.innerHTML = ok
      ? `<div class="fb-badge good">${checkSVG}<span>${pick(['أحسنت يا بطل!','ما شاء الله!','إجابة رائعة!','ممتاز!'])}</span></div>`
      : `<div class="fb-badge learn">${bulbSVG}<span>${pick(['معلومة جديدة!','تعلّمت شيئًا جديدًا!','معلومة تُضاف إليك!'])}</span></div>
         ${it.recite ? '' : `<p class="learn-note">الإجابة الصحيحة: <b>${fmtQ(it.correct)}</b></p>`}`;
    fb.innerHTML += `<button class="btn" id="nx" type="button">${last ? 'اعرض الشهادات' : (nextP ? `الدور التالي: ${esc(nextP.name)}` : 'السؤال التالي')}</button>`;
    fb.hidden = false;
    document.getElementById('nx').onclick = () => { S.idx++; next(); };
    fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/* ---------- certificates ---------- */
function rankTitle(r){ return r === 1 ? 'بطل متميّز' : r >= .75 ? 'رائع جدًا' : r >= .5 ? 'مجتهد ونشيط' : 'متعلّم نشيط'; }
function hijri(){ try{ return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day:'numeric', month:'long', year:'numeric' }).format(new Date()); }catch(e){ return ''; } }
function results(){
  inGame = false;
  const p = S.players[S.certIdx], t = tally(p), total = p.res.length, r = total ? t.right/total : 0;
  const cats = S.cats.filter(c => p.res.some(x => x.cat === c.id));
  const catRow = c => {
    const rs = p.res.filter(x => x.cat === c.id), ok = rs.filter(x => x.ok).length, nw = rs.length - ok;
    return `<div class="cr">${starSVG(c.color)}<span class="cn">${fmtQ(c.title)}</span><span class="pills">${ok?`<span class="pill ok">${checkSVG}${rs.length>1?ar(ok):'أحسنت'}</span>`:''}${nw?`<span class="pill new">${bulbSVG}${rs.length>1?ar(nw):'معلومة جديدة'}</span>`:''}</span></div>`;
  };
  const learned = p.res.filter(x => !x.ok);
  render(`<div class="stack">
    <div class="hero"><h1>انتهت <span>المسابقة!</span></h1><p>شهادة لكل بطل، اضغط على الاسم لعرضها</p></div>
    ${S.players.length>1?`<div class="tabs" role="tablist">${S.players.map((pl,i)=>`<button class="tab" role="tab" type="button" data-i="${i}" aria-selected="${i===S.certIdx}">${esc(pl.name)}</button>`).join('')}</div>`:''}
    <article class="cert">
      <span class="corner tl">${starSVG('#FFB21F')}</span><span class="corner tr">${starSVG('#FF6B57')}</span><span class="corner bl">${starSVG('#1FA463')}</span><span class="corner br">${starSVG('#3B82F6')}</span>
      <div class="cert-inner">
        <div class="cert-kicker">مسابقة البطل الصغير</div>
        <h2>شهادة تقدير</h2>
        <p class="to">تُمنح هذه الشهادة بكل فخر إلى</p>
        <div class="big-name" style="color:${p.color}">${esc(p.name)}</div>
        <div class="badge">${rankTitle(r)}</div>
        <div class="tally">
          <div class="tile ok">${checkSVG}<b>${ar(t.right)}</b><span>إجابات صحيحة</span></div>
          <div class="tile new">${bulbSVG}<b>${ar(t.learned)}</b><span>معلومات جديدة</span></div>
        </div>
        <div class="cat-results">${cats.map(catRow).join('')}</div>
        ${learned.length ? `<div class="learned"><h3>${bulbSVG}ما تعلّمه اليوم</h3><ul>${learned.map(x=>`<li><span class="lq">${fmtQ(x.q)}</span>${x.recite ? '' : `<b>${fmtQ(x.correct)}</b>`}</li>`).join('')}</ul></div>` : ''}
        <p class="cert-date">${hijri()}</p>
      </div>
    </article>
    <div class="center">
      <button class="btn green" id="again" type="button">احتفلوا مرة أخرى</button>
      ${S.players.length>1&&S.certIdx<S.players.length-1?`<button class="btn" id="nextc" type="button">شهادة ${esc(S.players[S.certIdx+1].name)}</button>`:''}
      <button class="btn alt" id="newg" type="button">مسابقة جديدة</button>
    </div></div>`);
  screen.querySelectorAll('.tab').forEach(tb => tb.onclick = () => { S.certIdx = +tb.dataset.i; results(); });
  document.getElementById('again').onclick = () => { sndCelebrate(); confetti(); };
  const nc = document.getElementById('nextc'); if (nc) nc.onclick = () => { S.certIdx++; results(); };
  document.getElementById('newg').onclick = () => { S.certIdx = 0; setup(); };
  sndCelebrate(); confetti();
}

/* ---------- boot ---------- */
setup(true);
loadSheet();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
