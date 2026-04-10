import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Switch, TextInput, Alert, ActivityIndicator, SafeAreaView
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/colors';
import { apiGet, apiPut } from '../api/client';

interface Preferences {
  language: string;
  theme: string;
  fontSize: string;
  model: string;
  personality: string;
  userName: string;
  voiceAutoPlay: boolean;
}

interface Props {
  onBack: () => void;
}

const PERSONALITIES = [
  { id: 'professional', label: 'احترافي', icon: 'briefcase' },
  { id: 'egyptian', label: 'مصري', icon: 'smile' },
  { id: 'developer', label: 'مطور', icon: 'code' },
  { id: 'motivational', label: 'محفّز', icon: 'zap' },
];

const MODELS = [
  { id: 'gpt-4o', label: 'GPT-4o', sub: 'الأقوى والأدق' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', sub: 'أسرع وأوفر' },
];

export default function SettingsScreen({ onBack }: Props) {
  const { colors, theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Preferences>('/api/user/preferences')
      .then(setPrefs)
      .catch(() => Alert.alert('خطأ', 'تعذر تحميل الإعدادات'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!prefs) return;
    setSaving(true);
    try {
      await apiPut('/api/user/preferences', prefs);
      Alert.alert('تم', 'تم حفظ الإعدادات');
    } catch { Alert.alert('خطأ', 'فشل الحفظ'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="arrow-right" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>الإعدادات</Text>
        <TouchableOpacity onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color={Colors.primary} /> : (
            <Text style={[styles.saveText, { color: Colors.primary }]}>حفظ</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Profile */}
        {user && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>الحساب</Text>
            <View style={styles.profileRow}>
              <View style={[styles.profileAvatar, { backgroundColor: Colors.primary }]}>
                <Text style={styles.profileInitial}>{user.firstName?.[0] || 'م'}</Text>
              </View>
              <View>
                <Text style={[styles.profileName, { color: colors.text }]}>{user.firstName} {user.lastName}</Text>
                <Text style={[styles.profileEmail, { color: colors.textMuted }]}>{user.email}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Appearance */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>المظهر</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.text }]}>الوضع الداكن</Text>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* AI Model */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>نموذج الذكاء الاصطناعي</Text>
          {MODELS.map(m => (
            <TouchableOpacity
              key={m.id}
              onPress={() => prefs && setPrefs({ ...prefs, model: m.id })}
              style={[
                styles.optionCard,
                {
                  backgroundColor: prefs?.model === m.id ? Colors.primary + '22' : colors.surfaceElevated,
                  borderColor: prefs?.model === m.id ? Colors.primary : colors.border,
                }
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionLabel, { color: colors.text }]}>{m.label}</Text>
                <Text style={[styles.optionSub, { color: colors.textMuted }]}>{m.sub}</Text>
              </View>
              {prefs?.model === m.id && <Feather name="check" size={18} color={Colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Personality */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>شخصية المساعد</Text>
          <View style={styles.personalityGrid}>
            {PERSONALITIES.map(p => (
              <TouchableOpacity
                key={p.id}
                onPress={() => prefs && setPrefs({ ...prefs, personality: p.id })}
                style={[
                  styles.personalityCard,
                  {
                    backgroundColor: prefs?.personality === p.id ? Colors.primary : colors.surfaceElevated,
                    borderColor: prefs?.personality === p.id ? Colors.primary : colors.border,
                    flex: 1,
                  }
                ]}
              >
                <Feather name={p.icon as any} size={20} color={prefs?.personality === p.id ? '#fff' : colors.textMuted} />
                <Text style={[styles.personalityLabel, { color: prefs?.personality === p.id ? '#fff' : colors.text }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Memory */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>الذاكرة</Text>
          <Text style={[styles.label, { color: colors.text, marginBottom: 8 }]}>اسمك (للذاكرة الطويلة)</Text>
          <TextInput
            value={prefs?.userName || ''}
            onChangeText={v => prefs && setPrefs({ ...prefs, userName: v })}
            placeholder="اكتب اسمك..."
            placeholderTextColor={colors.textMuted}
            style={[styles.textInput, { backgroundColor: colors.surfaceElevated, color: colors.text, borderColor: colors.border }]}
            textAlign="right"
          />
        </View>

        {/* Voice */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>الصوت</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.text }]}>تشغيل الصوت تلقائياً</Text>
            <Switch
              value={prefs?.voiceAutoPlay ?? true}
              onValueChange={v => prefs && setPrefs({ ...prefs, voiceAutoPlay: v })}
              trackColor={{ false: colors.border, true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={() => Alert.alert('تسجيل خروج', 'هل أنت متأكد؟', [
            { text: 'إلغاء', style: 'cancel' },
            { text: 'خروج', style: 'destructive', onPress: logout },
          ])}
          style={[styles.logoutBtn, { borderColor: '#ef4444' }]}
        >
          <Feather name="log-out" size={18} color="#ef4444" />
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  saveText: { fontSize: 16, fontWeight: '700' },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  section: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 15, fontWeight: '500' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  profileInitial: { color: '#fff', fontSize: 20, fontWeight: '700' },
  profileName: { fontSize: 16, fontWeight: '700' },
  profileEmail: { fontSize: 13 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12,
    padding: 12, borderWidth: 1, gap: 12,
  },
  optionLabel: { fontSize: 15, fontWeight: '600' },
  optionSub: { fontSize: 12 },
  personalityGrid: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  personalityCard: {
    alignItems: 'center', justifyContent: 'center', padding: 12,
    borderRadius: 12, borderWidth: 1, gap: 6, minWidth: '22%',
  },
  personalityLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  textInput: {
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 15,
  },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1,
  },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '700' },
});
