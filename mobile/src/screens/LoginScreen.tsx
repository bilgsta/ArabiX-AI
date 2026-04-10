import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/colors';
import { BASE_URL } from '../api/client';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const { colors } = useTheme();
  const { refetchUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await WebBrowser.openAuthSessionAsync(
        `${BASE_URL}/api/login`,
        `${BASE_URL}/api/auth/user`
      );
      if (result.type === 'success') {
        await refetchUser();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0a140a', '#0f1a0f', '#0d1f12']} style={styles.container}>
      <View style={[styles.circle, styles.c1]} />
      <View style={[styles.circle, styles.c2]} />

      <View style={styles.content}>
        <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.logo}>
          <Text style={styles.logoText}>أ</Text>
        </LinearGradient>

        <Text style={styles.title}>أبو اليزيد</Text>
        <Text style={styles.subtitle}>مساعدك الذكي الشخصي بالعربية</Text>

        <View style={styles.features}>
          {['محادثات ذكية بالعربية', 'وضع الصوت المتقدم', 'تحليل الصور والملفات', 'شخصيات متعددة للمساعد'].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Feather name="check-circle" size={16} color={Colors.primary} />
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>{f}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleLogin}
          style={styles.loginBtn}
          activeOpacity={0.85}
          disabled={loading}
        >
          <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.loginGrad}>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="log-in" size={20} color="#fff" />
                <Text style={styles.loginText}>تسجيل الدخول مع Replit</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[styles.note, { color: colors.textMuted }]}>
          بتسجيل الدخول توافق على شروط الخدمة وسياسة الخصوصية
        </Text>
      </View>

      <Text style={styles.brand}>ArabiX AI</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  circle: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: Colors.primary,
    opacity: 0.06,
  },
  c1: { width: 400, height: 400, top: -100, right: -100 },
  c2: { width: 300, height: 300, bottom: 50, left: -80 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  logo: {
    width: 80, height: 80, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOpacity: 0.5,
    shadowRadius: 16, elevation: 10, marginBottom: 8,
  },
  logoText: { fontSize: 38, color: '#fff', fontWeight: '800' },
  title: { fontSize: 30, fontWeight: '800', color: '#f0fdf4' },
  subtitle: { fontSize: 15, color: '#86efac', opacity: 0.9, textAlign: 'center' },
  features: { gap: 10, marginVertical: 8, alignSelf: 'stretch' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'flex-end' },
  featureText: { fontSize: 14, fontWeight: '500' },
  loginBtn: {
    alignSelf: 'stretch',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    marginTop: 8,
  },
  loginGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  loginText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  note: { fontSize: 11, textAlign: 'center', marginTop: 4 },
  brand: {
    position: 'absolute', bottom: 40,
    alignSelf: 'center', fontSize: 12,
    color: Colors.primaryMuted, letterSpacing: 3,
    opacity: 0.5, textTransform: 'uppercase',
  },
});
