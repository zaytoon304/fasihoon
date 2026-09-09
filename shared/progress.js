/* فصحون — بيانات مشتركة: المستويات، الأنشطة، الملف الشخصي، التقدم، مؤثرات الاحتفال */

const FAKKER_LEVELS = [
  { id: 1, grade: "الصف الأول الابتدائي", short: "أول ابتدائي", color: "var(--level-1)", soft: "var(--level-1-soft)", emoji: "🟢", icon: "🎈", stage: "المرحلة ١" },
  { id: 2, grade: "الصف الثاني والثالث الابتدائي", short: "ثاني وثالث", color: "var(--level-2)", soft: "var(--level-2-soft)", emoji: "🔵", icon: "📚", stage: "المرحلة ٢" },
  { id: 3, grade: "الصف الرابع والخامس والسادس", short: "رابع إلى سادس", color: "var(--level-3)", soft: "var(--level-3-soft)", emoji: "🟣", icon: "🔬", stage: "المرحلة ٣" },
  { id: 4, grade: "المرحلة المتوسطة", short: "متوسط", color: "var(--level-4)", soft: "var(--level-4-soft)", emoji: "🟠", icon: "💡", stage: "المرحلة ٤" },
  { id: 5, grade: "المرحلة الثانوية", short: "ثانوي", color: "var(--level-5)", soft: "var(--level-5-soft)", emoji: "🔴", icon: "🎓", stage: "المرحلة ٥" },
];

const FAKKER_GAMES = [
  { id: "fasihoon", name: "فصحون", emoji: "📖", file: "games/fasihoon.html", desc: "مع الأستاذ فصيح: حروف وكلمات وجُمل وقدرات لغوية" },
  { id: "asas", name: "أساس القراءة", emoji: "🌱", file: "games/asas.html", desc: "تعلّم القراءة من الصفر، خطوة خطوة وبدون عجلة" },
];

const Fakker = {};

Fakker.Profile = {
  KEY: "fasihoon_profile",
  get() {
    try { return JSON.parse(localStorage.getItem(this.KEY)); } catch (e) { return null; }
  },
  save(profile) { localStorage.setItem(this.KEY, JSON.stringify(profile)); },
  create(name, avatar) {
    const profile = {
      id: "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name.trim(),
      avatar: avatar || "🦊",
      createdAt: Date.now(),
    };
    this.save(profile);
    return profile;
  },
  clear() { localStorage.removeItem(this.KEY); },
};

Fakker.Progress = {
  db: null,
  init() {
    if (typeof fakkerInitFirebase === "function") this.db = fakkerInitFirebase();
  },
  KEY: "fasihoon_progress",
  _all() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || {}; } catch (e) { return {}; }
  },
  _save(all) {
    localStorage.setItem(this.KEY, JSON.stringify(all));
    const profile = Fakker.Profile.get();
    if (this.db && profile) {
      this.db.ref("students/" + profile.id).set({
        name: profile.name,
        avatar: profile.avatar,
        updatedAt: Date.now(),
        progress: all,
      }).catch((e) => console.warn("فصحون: تعذّر الحفظ على Firebase", e));
    }
  },
  record(gameId, levelId, opts) {
    opts = opts || {};
    const stars = opts.stars || 0;
    const score = opts.score || 0;
    const all = this._all();
    const key = gameId + "_" + levelId;
    const prev = all[key] || { bestStars: 0, bestScore: 0, plays: 0 };
    all[key] = {
      bestStars: Math.max(prev.bestStars, stars),
      bestScore: Math.max(prev.bestScore, score),
      plays: prev.plays + 1,
      lastPlayed: Date.now(),
    };
    this._save(all);
    return all[key];
  },
  get(gameId, levelId) {
    const all = this._all();
    return all[gameId + "_" + levelId] || { bestStars: 0, bestScore: 0, plays: 0 };
  },
  totalStars() {
    const all = this._all();
    return Object.values(all).reduce((sum, v) => sum + (v.bestStars || 0), 0);
  },
  allForGame(gameId) {
    const all = this._all();
    const out = {};
    FAKKER_LEVELS.forEach((lv) => {
      out[lv.id] = all[gameId + "_" + lv.id] || { bestStars: 0, bestScore: 0, plays: 0 };
    });
    return out;
  },
};

// إجابات الطالب المكتوبة بقِطع القراءة — تُحفظ محلياً دايماً، وعلى Firebase لو مفعّل (عشان المعلم يشوفها من جهازه)
Fakker.Answers = {
  _timers: {},
  save(stageId, passageIndex, field, value) {
    const profile = Fakker.Profile.get();
    if (!Fakker.Progress.db || !profile) return;
    const key = stageId + "_" + passageIndex + "_" + field;
    clearTimeout(this._timers[key]);
    this._timers[key] = setTimeout(() => {
      Fakker.Progress.db.ref(`students/${profile.id}/answers/${stageId}/${passageIndex}/${field}`).set({
        text: value,
        studentName: profile.name,
        studentAvatar: profile.avatar,
        updatedAt: Date.now(),
      }).catch((e) => console.warn("فصحون: تعذّر حفظ الإجابة على Firebase", e));
    }, 800);
  },
  // لوحة المعلم: تجيب كل الطلاب وإجاباتهم من Firebase دفعة وحدة
  fetchAllStudents(callback) {
    if (!Fakker.Progress.db) { callback([]); return; }
    Fakker.Progress.db.ref("students").once("value")
      .then((snap) => {
        const val = snap.val() || {};
        const list = Object.keys(val).map((id) => Object.assign({ id }, val[id]));
        callback(list);
      })
      .catch((e) => { console.warn("فصحون: تعذّر جلب بيانات الطلاب", e); callback([]); });
  },
};

// إحصائيات الاستخدام: كم مرة لُعبت كل نشاط
Fakker.Analytics = {
  KEY: "fasihoon_analytics_plays",
  logPlay(gameId) {
    let list = [];
    try { list = JSON.parse(localStorage.getItem(this.KEY)) || []; } catch (e) { list = []; }
    list.push({ gameId, ts: Date.now() });
    if (list.length > 3000) list = list.slice(-3000);
    localStorage.setItem(this.KEY, JSON.stringify(list));
  },
  allPlays() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch (e) { return []; }
  },
  countsByGame() {
    const counts = {};
    this.allPlays().forEach((p) => { counts[p.gameId] = (counts[p.gameId] || 0) + 1; });
    return counts;
  },
  totalPlays() { return this.allPlays().length; },
};

// إعدادات إتاحة: كتم الصوت وتقليل الحركة (يحترمها كل مكان بالتطبيق)
Fakker.Settings = {
  KEY: "fasihoon_settings",
  _state() {
    try { return Object.assign({ sound: true, reduceMotion: false }, JSON.parse(localStorage.getItem(this.KEY)) || {}); }
    catch (e) { return { sound: true, reduceMotion: false }; }
  },
  _save(s) { localStorage.setItem(this.KEY, JSON.stringify(s)); },
  get() { return this._state(); },
  setSound(on) { const s = this._state(); s.sound = on; this._save(s); },
  setReduceMotion(on) { const s = this._state(); s.reduceMotion = on; this._save(s); },
};

// يضيف زر إعدادات صغير (⚙️) لأي شريط علوي — نداء واحد من كل صفحة
Fakker.mountSettingsToggle = function (containerSelector) {
  const host = document.querySelector(containerSelector || ".topbar");
  if (!host || document.getElementById("fk-settings-btn")) return;
  const wrap = document.createElement("div");
  wrap.style.position = "relative";
  const btn = document.createElement("div");
  btn.id = "fk-settings-btn";
  btn.className = "icon-btn";
  btn.textContent = "⚙️";
  const panel = document.createElement("div");
  panel.style.cssText = "position:absolute;top:52px;left:0;background:var(--card-bg);border-radius:14px;box-shadow:0 8px 20px var(--shadow);padding:12px;min-width:180px;display:none;z-index:80;font-size:14px;";
  function renderPanel() {
    const s = Fakker.Settings.get();
    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 0;cursor:pointer;" id="fk-toggle-sound">
        <span>${s.sound ? "🔊" : "🔇"} الأصوات</span><span>${s.sound ? "تشغيل" : "مكتوم"}</span>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 0;cursor:pointer;" id="fk-toggle-motion">
        <span>${s.reduceMotion ? "⏸️" : "🎬"} الحركة</span><span>${s.reduceMotion ? "مخفّضة" : "كاملة"}</span>
      </div>`;
    panel.querySelector("#fk-toggle-sound").onclick = () => { Fakker.Settings.setSound(!Fakker.Settings.get().sound); renderPanel(); };
    panel.querySelector("#fk-toggle-motion").onclick = () => { Fakker.Settings.setReduceMotion(!Fakker.Settings.get().reduceMotion); renderPanel(); };
  }
  renderPanel();
  btn.onclick = (e) => { e.stopPropagation(); panel.style.display = panel.style.display === "none" ? "block" : "none"; };
  document.addEventListener("click", () => { panel.style.display = "none"; });
  wrap.appendChild(btn); wrap.appendChild(panel);
  host.appendChild(wrap);
};

Fakker.FX = {
  messages: ["أحسنت!", "رائع!", "ممتاز!", "عبقري!", "شغل نظيف!", "استمر كذا!", "مبدع!"],
  encourage: ["حاول مرة ثانية!", "قريب جداً، كمّل!", "لا بأس، المرة الجاية أفضل!"],

  randomPraise() { return this.messages[Math.floor(Math.random() * this.messages.length)]; },
  randomEncourage() { return this.encourage[Math.floor(Math.random() * this.encourage.length)]; },

  confetti(container, count) {
    if (Fakker.Settings.get().reduceMotion) return;
    container = container || document.body;
    count = count || 40;
    const colors = ["#f97316", "#22c55e", "#3b82f6", "#a855f7", "#ef4444", "#eab308"];
    for (let i = 0; i < count; i++) {
      const piece = document.createElement("div");
      piece.className = "confetti-piece";
      const size = 6 + Math.random() * 6;
      piece.style.width = size + "px";
      piece.style.height = size * 0.6 + "px";
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.left = Math.random() * 100 + "vw";
      piece.style.animationDuration = 1.6 + Math.random() * 1.4 + "s";
      piece.style.animationDelay = Math.random() * 0.3 + "s";
      container.appendChild(piece);
      setTimeout(() => piece.remove(), 3200);
    }
  },

  _ctx: null,
  _getCtx() {
    if (!this._ctx) this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    return this._ctx;
  },
  playTone(freqs, duration) {
    if (!Fakker.Settings.get().sound) return;
    freqs = freqs || [660];
    duration = duration || 0.12;
    try {
      const ctx = this._getCtx();
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.value = 0.08;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const start = ctx.currentTime + i * duration;
        osc.start(start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        osc.stop(start + duration + 0.02);
      });
    } catch (e) { /* المتصفح ما يدعم الصوت، تجاهل بهدوء */ }
  },
  success() { this.playTone([523, 659, 784], 0.11); },
  wrong() { this.playTone([220], 0.15); },
  win() { this.playTone([523, 659, 784, 1046], 0.13); },
};

Fakker.Progress.init();
