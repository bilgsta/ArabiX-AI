# أبو اليزيد – تطبيق الأندرويد

تطبيق Android أصلي لمساعد أبو اليزيد الذكي، مبني بـ React Native + Expo.

## 🚀 كيفية التشغيل

### المتطلبات
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- حساب Expo: https://expo.dev

### تثبيت التبعيات
```bash
cd mobile
npm install
```

### تشغيل على المحاكي/الجهاز
```bash
npx expo start --android
```

### بناء APK للاختبار
```bash
# تسجيل دخول EAS أولاً
npx eas login

# بناء APK
npx eas build --platform android --profile preview
```

### بناء AAB لـ Google Play
```bash
npx eas build --platform android --profile production
```

## ⚙️ إعداد الـ Backend

في ملف `src/api/client.ts`، عدّل `BASE_URL` ليشير إلى backend الخاص بك:
```typescript
export const BASE_URL = 'https://your-replit-app.replit.dev';
```

## 📱 الشاشات

| الشاشة | الوصف |
|--------|-------|
| Splash | شاشة بداية متحركة |
| Login | تسجيل دخول عبر Replit Auth |
| Chat | الشاشة الرئيسية للمحادثة |
| Settings | إعدادات الشخصية والمظهر والصوت |

## 🎨 الميزات

- ✅ واجهة عربية RTL بالكامل
- ✅ وضع مظلم / مضيء
- ✅ دفق الردود (Streaming)
- ✅ رفع الصور وتحليلها
- ✅ تسجيل صوتي
- ✅ 4 شخصيات للمساعد
- ✅ ذاكرة طويلة المدى
- ✅ إدارة المحادثات (إنشاء، حذف، بحث)
- ✅ معالجة زر الرجوع في Android
- ✅ SafeArea handling

## 📦 الحزم الرئيسية

- `expo` ~51.0.0
- `react-native` 0.74.1
- `expo-av` — تسجيل صوتي
- `expo-image-picker` — رفع صور
- `expo-linear-gradient` — خلفيات متدرجة
- `react-native-markdown-display` — عرض Markdown
