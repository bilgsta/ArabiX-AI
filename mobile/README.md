# أبو اليزيد – تطبيق Android الأصلي

تطبيق Android أصلي مبني بـ **React Native + Expo**، يتصل بنفس الـ backend الموجود.

---

## 📁 هيكل المشروع

```
mobile/
├── App.tsx                    ← نقطة الدخول + Navigation
├── app.json                   ← إعدادات Expo
├── eas.json                   ← إعدادات البناء (APK / AAB)
├── babel.config.js
├── tsconfig.json
├── package.json               ← التبعيات
├── assets/
│   ├── icon.png               ← أيقونة التطبيق (1024x1024)
│   ├── adaptive-icon.png      ← Android adaptive icon
│   ├── splash.png             ← شاشة البداية
│   └── favicon.png
└── src/
    ├── api/
    │   └── client.ts          ← HTTP client + SSE streaming
    ├── constants/
    │   └── colors.ts          ← لوح الألوان (dark/light)
    ├── contexts/
    │   ├── AuthContext.tsx     ← حالة المصادقة
    │   └── ThemeContext.tsx    ← إدارة المظهر
    ├── components/
    │   ├── ChatBubble.tsx      ← فقاعة الرسالة (markdown)
    │   ├── InputBar.tsx        ← شريط الإدخال السفلي
    │   └── Sidebar.tsx        ← الشريط الجانبي (Drawer)
    └── screens/
        ├── SplashScreen.tsx   ← شاشة البداية المتحركة
        ├── LoginScreen.tsx    ← تسجيل الدخول
        ├── ChatScreen.tsx     ← الشاشة الرئيسية
        ├── VoiceScreen.tsx    ← وضع المساعد الصوتي
        └── SettingsScreen.tsx ← الإعدادات
```

---

## ⚙️ إعداد الـ Backend URL

في `src/api/client.ts` عدّل السطر الأول:

```typescript
export const BASE_URL = 'https://YOUR-REPLIT-APP.replit.dev';
```

---

## 🚀 خطوات التشغيل

### 1. تثبيت المتطلبات المسبقة
```bash
# Node.js 18+, npm
node --version

# تثبيت Expo CLI
npm install -g expo-cli eas-cli
```

### 2. تثبيت الحزم
```bash
cd mobile
npm install
```

### 3. تشغيل على المحاكي أو الجهاز
```bash
# تشغيل Expo Go على هاتف Android
npx expo start

# أو مباشرة على المحاكي
npx expo start --android
```

---

## 📦 بناء APK للاختبار

```bash
# تسجيل دخول Expo
npx eas login

# بناء APK (preview)
npx eas build --platform android --profile preview
```

سيُرسَل رابط التحميل بعد اكتمال البناء (5-10 دقائق على خوادم Expo).

---

## 🏪 رفع على Google Play Store

```bash
# بناء AAB (production)
npx eas build --platform android --profile production

# رفع تلقائي
npx eas submit --platform android
```

---

## 📱 الشاشات والميزات

| الشاشة | الميزات |
|--------|---------|
| **Splash** | شاشة بداية خضراء متحركة، fade-in animation |
| **Login** | تسجيل دخول Replit OAuth عبر WebBrowser |
| **Chat** | Drawer sidebar، streaming SSE، رفع صور، تسجيل صوتي |
| **Voice** | مساعد صوتي متكامل، STT + TTS، continuous mode |
| **Settings** | نموذج AI، شخصية، مظهر، ذاكرة، صوت |

---

## 🎨 التصميم

- اللون الأساسي: `#16a34a` (أخضر إسلامي)
- واجهة عربية RTL بالكامل
- وضع مظلم (افتراضي) + مضيء
- 60fps animations
- SafeArea + Android back button handling

---

## 📋 التبعيات الرئيسية

| الحزمة | الغرض |
|--------|--------|
| `expo ~51` | إطار العمل |
| `react-native 0.74` | المكتبة الأساسية |
| `expo-av` | تسجيل الصوت |
| `expo-image-picker` | رفع الصور |
| `expo-linear-gradient` | خلفيات متدرجة |
| `expo-speech` | Text-to-Speech |
| `expo-web-browser` | OAuth login |
| `react-native-markdown-display` | عرض Markdown |
| `@react-native-async-storage/async-storage` | حفظ محلي |

---

## 🔐 المصادقة

التطبيق يستخدم Replit Auth (OIDC) عبر `expo-web-browser`:
1. يفتح WebBrowser لصفحة تسجيل الدخول
2. بعد النجاح يعود للتطبيق تلقائياً
3. الـ session يُحفظ ويُرسَل مع كل طلب API

---

## 🔧 حل المشاكل الشائعة

**مشكلة:** `Unable to resolve module`
```bash
cd mobile && npx expo install --fix
```

**مشكلة:** الصوت لا يعمل
- تأكد من منح إذن المايكروفون في إعدادات Android

**مشكلة:** API لا يستجيب
- تأكد من صحة `BASE_URL` في `src/api/client.ts`
- تأكد أن الـ backend شغّال
