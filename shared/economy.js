/* فكّر — نظام النقاط والمكافآت (محفظة، ستريك+مضاعف، متجر، استبدال) */

function fkUid() { return "id_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

// ---------------- المحفظة ----------------
Fakker.Wallet = {
  KEY: "fakker_wallet",
  _state() {
    try {
      return Object.assign({ balance: 0, lifetime: 0, ledger: [] }, JSON.parse(localStorage.getItem(this.KEY)) || {});
    } catch (e) { return { balance: 0, lifetime: 0, ledger: [] }; }
  },
  _save(s) {
    if (s.ledger.length > 200) s.ledger = s.ledger.slice(-200);
    localStorage.setItem(this.KEY, JSON.stringify(s));
  },
  get() { const s = this._state(); return { balance: s.balance, lifetime: s.lifetime }; },
  ledger(limit) { const s = this._state(); return s.ledger.slice(-(limit || 50)).reverse(); },
  _applyDelta(amount, reason, countAsLifetime) {
    const s = this._state();
    if (amount > 0 && countAsLifetime) s.lifetime += amount;
    s.balance = Math.max(0, s.balance + amount);
    s.ledger.push({ id: fkUid(), ts: Date.now(), amount, reason, balanceAfter: s.balance });
    this._save(s);
    return { balance: s.balance, lifetime: s.lifetime };
  },
  award(amount, reason) { return this._applyDelta(Math.abs(amount), reason, true); },
  penalize(amount, reason) { return this._applyDelta(-Math.abs(amount), reason, false); },
  // شراء آمن: يتحقق من الرصيد قبل الخصم (يمنع الرصيد السالب)
  spend(amount, reason) {
    const s = this._state();
    if (s.balance < amount) return { ok: false, error: "insufficient" };
    this._applyDelta(-amount, reason, false);
    return { ok: true, state: this.get() };
  },
  refund(amount, reason) { this._applyDelta(amount, reason, false); return this.get(); },
};

// ---------------- إعدادات مركزية قابلة للتعديل من لوحة المعلم (تُخزَّن كتراكب فوق الإعدادات الافتراضية) ----------------
Fakker.EconomyConfig = {
  KEY: "fakker_economy_overrides",
  _overrides() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || {}; } catch (e) { return {}; }
  },
  get() {
    const o = this._overrides();
    return {
      points: Object.assign({}, ECONOMY_CONFIG.points, o.points || {}),
      streakMultipliers: o.streakMultipliers || ECONOMY_CONFIG.streakMultipliers,
    };
  },
  setPoints(points) { const o = this._overrides(); o.points = points; localStorage.setItem(this.KEY, JSON.stringify(o)); },
  setMultipliers(tiers) { const o = this._overrides(); o.streakMultipliers = tiers; localStorage.setItem(this.KEY, JSON.stringify(o)); },
  isDefault() { const o = this._overrides(); return !o.points && !o.streakMultipliers; },
  reset() { localStorage.removeItem(this.KEY); },
};

// ---------------- نظام الستريك والمضاعف ----------------
Fakker.Economy = {
  multiplierFor(streak) {
    const tiers = Fakker.EconomyConfig.get().streakMultipliers;
    for (const t of tiers) if (streak >= t.min) return t;
    return { mult: 1, message: null };
  },
  // تُستدعى بعد كل إجابة صحيحة: تحسب النقاط بالمضاعف وتضيفها للمحفظة، وترجع تفاصيل للعرض
  awardCorrect(streakAfterThisAnswer) {
    const tier = this.multiplierFor(streakAfterThisAnswer);
    const base = Fakker.EconomyConfig.get().points.correct;
    const points = Math.round(base * tier.mult);
    const wallet = Fakker.Wallet.award(points, "إجابة صحيحة (×" + tier.mult + ")");
    return { points, mult: tier.mult, message: tier.message, wallet };
  },
  awardWrong() {
    const points = Fakker.EconomyConfig.get().points.wrong;
    const wallet = Fakker.Wallet.penalize(Math.abs(points), "إجابة خاطئة");
    return { points, wallet };
  },
  spendHint() {
    const points = Fakker.EconomyConfig.get().points.hint;
    const wallet = Fakker.Wallet.penalize(Math.abs(points), "استخدام تلميح");
    return { points, wallet };
  },
  awardCompletion(gameLabel) {
    const points = Fakker.EconomyConfig.get().points.completeBonus;
    const wallet = Fakker.Wallet.award(points, "إكمال نشاط: " + (gameLabel || ""));
    return { points, wallet };
  },
};

// ---------------- نافذة الاحتفال (تُستخدم بسطر واحد من أي لعبة) ----------------
Fakker.Celebrate = function (opts) {
  opts = opts || {};
  const mood = opts.mood || "correct"; // correct | wrong
  const reduceMotion = Fakker.Settings.get().reduceMotion;

  let overlay = document.getElementById("fk-celebrate");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "fk-celebrate";
    overlay.style.cssText = "position:fixed;top:18px;left:50%;transform:translateX(-50%);z-index:900;pointer-events:none;";
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = "";

  const card = document.createElement("div");
  const bg = mood === "correct" ? "linear-gradient(135deg,#22c55e,#16a34a)" : "linear-gradient(135deg,#f59e0b,#d97706)";
  card.style.cssText = `background:${bg};color:#fff;padding:14px 22px;border-radius:18px;font-family:'Tajawal',sans-serif;font-weight:800;text-align:center;box-shadow:0 10px 26px rgba(0,0,0,.25);min-width:220px;` +
    (reduceMotion ? "" : "animation:fk-pop .35s ease;");
  let html = `<div style="font-size:17px;">${opts.message || (mood === "correct" ? "أحسنت!" : "حاول مرة ثانية!")}</div>`;
  if (typeof opts.points === "number") {
    const sign = opts.points > 0 ? "+" : "";
    html += `<div style="font-size:22px;margin-top:2px;">${sign}${opts.points} نقطة</div>`;
  }
  if (opts.streakMsg) html += `<div style="font-size:13px;margin-top:4px;opacity:.95;">${opts.streakMsg}</div>`;
  card.innerHTML = html;
  overlay.appendChild(card);

  if (!document.getElementById("fk-celebrate-style")) {
    const style = document.createElement("style");
    style.id = "fk-celebrate-style";
    style.textContent = "@keyframes fk-pop{0%{transform:scale(.6);opacity:0;}60%{transform:scale(1.06);opacity:1;}100%{transform:scale(1);}}";
    document.head.appendChild(style);
  }

  clearTimeout(Fakker.Celebrate._t);
  Fakker.Celebrate._t = setTimeout(() => { overlay.innerHTML = ""; }, opts.duration || 1100);
};

// ---------------- متجر المكافآت (قابل للتعديل من لوحة المعلم) ----------------
Fakker.Rewards = {
  KEY: "fakker_rewards",
  _init() {
    if (localStorage.getItem(this.KEY) == null) {
      localStorage.setItem(this.KEY, JSON.stringify(ECONOMY_CONFIG.defaultRewards));
    }
  },
  list() { this._init(); try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch (e) { return []; } },
  listActive() { return this.list().filter((r) => r.active && (r.qty === null || r.qty > 0)); },
  get(id) { return this.list().find((r) => r.id === id) || null; },
  _save(list) { localStorage.setItem(this.KEY, JSON.stringify(list)); },
  upsert(reward) {
    const list = this.list();
    const idx = list.findIndex((r) => r.id === reward.id);
    if (idx >= 0) list[idx] = reward; else list.push(reward);
    this._save(list);
  },
  remove(id) { this._save(this.list().filter((r) => r.id !== id)); },
  decrementQty(id) {
    const list = this.list();
    const r = list.find((x) => x.id === id);
    if (r && r.qty !== null) r.qty = Math.max(0, r.qty - 1);
    this._save(list);
  },
  incrementQty(id) {
    const list = this.list();
    const r = list.find((x) => x.id === id);
    if (r && r.qty !== null) r.qty += 1;
    this._save(list);
  },
};

// ---------------- طلبات الاستبدال ----------------
// ملاحظة مهمة: بدون قاعدة بيانات حقيقية، هذه القائمة محفوظة محلياً على نفس الجهاز/المتصفح فقط،
// فلوحة المعلم تشوف طلبات هذا الجهاز بس. للمزامنة الحقيقية بين كل الطلاب يلزم Firebase (قرار معلّق).
Fakker.Redemptions = {
  KEY: "fakker_redemptions",
  list() { try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch (e) { return []; } },
  _save(list) { localStorage.setItem(this.KEY, JSON.stringify(list)); },
  listForStudent(studentId) { return this.list().filter((r) => r.studentId === studentId); },
  listPending() { return this.list().filter((r) => r.status === "pending"); },

  // تُنشئ طلب استبدال: تتحقق من الرصيد والمخزون، تحجز النقاط فوراً لمنع الاستخدام المزدوج
  create(reward, profile) {
    if (!reward || !reward.active) return { ok: false, error: "unavailable" };
    if (reward.qty !== null && reward.qty <= 0) return { ok: false, error: "out_of_stock" };
    const spend = Fakker.Wallet.spend(reward.cost, "طلب مكافأة: " + reward.name);
    if (!spend.ok) return { ok: false, error: "insufficient" };

    const needsApproval = !!reward.approvalRequired;
    const record = {
      id: fkUid(),
      rewardId: reward.id,
      rewardName: reward.name,
      rewardIcon: reward.icon,
      cost: reward.cost,
      studentId: profile.id,
      studentName: profile.name,
      status: needsApproval ? "pending" : "approved",
      createdAt: Date.now(),
      decidedAt: needsApproval ? null : Date.now(),
    };
    const list = this.list();
    list.push(record);
    this._save(list);
    if (!needsApproval) Fakker.Rewards.decrementQty(reward.id); // رقمية بلا موافقة = تُعتمد فوراً
    return { ok: true, record };
  },

  approve(id) {
    const list = this.list();
    const rec = list.find((r) => r.id === id);
    if (!rec || rec.status !== "pending") return false; // idempotent: ما ينفّذ مرتين
    rec.status = "approved";
    rec.decidedAt = Date.now();
    this._save(list);
    Fakker.Rewards.decrementQty(rec.rewardId);
    return true;
  },
  reject(id) {
    const list = this.list();
    const rec = list.find((r) => r.id === id);
    if (!rec || rec.status !== "pending") return false;
    rec.status = "rejected";
    rec.decidedAt = Date.now();
    this._save(list);
    Fakker.Wallet.refund(rec.cost, "استرجاع رفض: " + rec.rewardName);
    return true;
  },
  markDelivered(id) {
    const list = this.list();
    const rec = list.find((r) => r.id === id);
    if (!rec || rec.status !== "approved") return false;
    rec.status = "redeemed";
    rec.decidedAt = Date.now();
    this._save(list);
    return true;
  },
};

// ---------------- بوابة المعلم (PIN محلي — تنبيه: ليست حماية حقيقية بدون خادم) ----------------
Fakker.TeacherAuth = {
  KEY: "fakker_teacher_pin",
  SESSION_KEY: "fakker_teacher_session",
  defaultPin: "2026",
  getPin() { return localStorage.getItem(this.KEY) || this.defaultPin; },
  setPin(pin) { localStorage.setItem(this.KEY, pin); },
  isUnlocked() { return sessionStorage.getItem(this.SESSION_KEY) === "1"; },
  tryUnlock(pin) {
    if (pin === this.getPin()) { sessionStorage.setItem(this.SESSION_KEY, "1"); return true; }
    return false;
  },
  lock() { sessionStorage.removeItem(this.SESSION_KEY); },
};
