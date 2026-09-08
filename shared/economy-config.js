/*
  فكّر — إعدادات نظام النقاط والمكافآت (ملف مركزي)
  عدّل القيم هنا فقط — بدون لمس منطق الألعاب.
*/
const ECONOMY_CONFIG = {
  points: {
    correct: 10,
    wrong: -2,
    hint: -1,
    completeBonus: 50,
  },
  // شرائح مضاعف التتابع: أول عتبة تُطابق streak الحالي (من الأعلى للأقل) هي المستخدمة
  streakMultipliers: [
    { min: 3, mult: 2,   message: "ثلاثية رائعة! 🔥🔥" },
    { min: 2, mult: 1.5, message: "إجابتان متتاليتان! 🔥" },
    { min: 1, mult: 1,   message: null },
  ],
  defaultRewards: [
    {
      id: "cr7-celebration",
      name: "احتفال النجم! SUIII 🐐",
      description: "افتح احتفال هدف أسطوري خاص بفكّر عند فوزك القادم",
      cost: 1000,
      type: "digital",
      icon: "🏆",
      qty: null,
      active: true,
      approvalRequired: false,
    },
    {
      id: "candy",
      name: "مصاصة حلوى 🍭",
      description: "المعلم يعطيك مصاصة حلوى بالفصل",
      cost: 1500,
      type: "real",
      icon: "🍭",
      qty: 20,
      active: true,
      approvalRequired: true,
    },
    {
      id: "homework-pass",
      name: "إعفاء من الواجب لليلة واحدة 📋",
      description: "لا واجب عليك الليلة!",
      cost: 10000,
      type: "real",
      icon: "📋",
      qty: 5,
      active: true,
      approvalRequired: true,
    },
  ],
};
