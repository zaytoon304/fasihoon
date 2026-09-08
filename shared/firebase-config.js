/*
  فصحون — إعداد Firebase (اختياري)

  التطبيق يشتغل ١٠٠٪ بدون Firebase (التقدم يُحفظ على نفس الجهاز عبر localStorage).
  لو تبي التقدم يتزامن بين الأجهزة (مثلاً جوال الطالب + تابلت الفصل)، سوّي هذا:

  ١. روح لـ https://console.firebase.google.com وسوّي مشروع جديد اسمه "fasihoon"
  ٢. من داخل المشروع: Build > Realtime Database > Create Database (ابدأ بوضع Test mode)
  ٣. من Project settings > عام > "إضافة تطبيق" > اختر أيقونة الويب </>
  ٤. انسخ القيم اللي تطلع لك (apiKey, databaseURL, projectId...) وحطها مكان القيم تحت
  ٥. احفظ الملف وأعد فتح الصفحة — بس هذا كل شي، ما يحتاج أي كود إضافي
*/

const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
};

function fakkerInitFirebase() {
  if (FIREBASE_CONFIG.apiKey === "YOUR_API_KEY") {
    console.log("فصحون: Firebase غير مُفعّل بعد — التقدم يُحفظ على هذا الجهاز فقط.");
    return null;
  }
  try {
    const app = firebase.apps && firebase.apps.length ? firebase.app() : firebase.initializeApp(FIREBASE_CONFIG);
    console.log("فصحون: Firebase متصل ✅");
    return firebase.database(app);
  } catch (err) {
    console.warn("فصحون: تعذّر الاتصال بـ Firebase، سيتم الاعتماد على الحفظ المحلي فقط.", err);
    return null;
  }
}
