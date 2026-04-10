import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, ActivityIndicator, Image
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/colors';
import { apiPost, apiDelete } from '../api/client';

interface Conversation {
  id: number;
  title: string;
  isLocked: boolean;
}

interface Props {
  conversations: Conversation[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onNewChat: () => void;
  onClose: () => void;
  onRefresh: () => void;
  onSettings: () => void;
}

export default function Sidebar({ conversations, activeId, onSelect, onNewChat, onClose, onRefresh, onSettings }: Props) {
  const { colors } = useTheme();
  const { user, logout } = useAuth();
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);

  const filtered = conversations.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.title.includes(search)
  );

  const handleDelete = (id: number, title: string) => {
    Alert.alert('حذف المحادثة', `هل تريد حذف "${title}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive', onPress: async () => {
          setDeleting(id);
          try {
            await apiDelete(`/api/conversations/${id}`);
            onRefresh();
          } catch { Alert.alert('خطأ', 'فشل الحذف'); }
          finally { setDeleting(null); }
        }
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.sidebar }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.appName, { color: Colors.primary }]}>أبو اليزيد</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="x" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={onNewChat}
          style={[styles.newChatBtn, { backgroundColor: Colors.primary }]}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={18} color="#fff" />
          <Text style={styles.newChatText}>محادثة جديدة</Text>
        </TouchableOpacity>

        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="بحث..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            textAlign="right"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x-circle" size={15} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Conversation list */}
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>
            {search ? 'لا نتائج' : 'لا توجد محادثات'}
          </Text>
        ) : (
          filtered.map(chat => (
            <TouchableOpacity
              key={chat.id}
              onPress={() => onSelect(chat.id)}
              onLongPress={() => handleDelete(chat.id, chat.title)}
              style={[
                styles.chatItem,
                {
                  backgroundColor: chat.id === activeId ? Colors.primary + '22' : 'transparent',
                  borderColor: chat.id === activeId ? Colors.primary + '44' : 'transparent',
                }
              ]}
              activeOpacity={0.7}
            >
              <Feather
                name={chat.isLocked ? 'lock' : 'message-square'}
                size={15}
                color={chat.id === activeId ? Colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.chatTitle,
                  { color: chat.id === activeId ? Colors.primary : colors.textSecondary }
                ]}
                numberOfLines={1}
              >
                {chat.title || 'محادثة جديدة'}
              </Text>
              {deleting === chat.id && <ActivityIndicator size="small" color={Colors.primary} />}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        {user && (
          <View style={styles.userRow}>
            {user.profileImageUrl ? (
              <Image source={{ uri: user.profileImageUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: Colors.primary }]}>
                <Text style={styles.avatarLetter}>{user.firstName?.[0] || 'م'}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                {user.firstName} {user.lastName}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textMuted }]} numberOfLines={1}>
                {user.email}
              </Text>
            </View>
          </View>
        )}
        <View style={styles.footerBtns}>
          <TouchableOpacity onPress={onSettings} style={[styles.footerBtn, { backgroundColor: colors.surfaceElevated }]}>
            <Feather name="settings" size={16} color={colors.textSecondary} />
            <Text style={[styles.footerBtnText, { color: colors.textSecondary }]}>الإعدادات</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={[styles.footerBtn, { backgroundColor: colors.surfaceElevated }]}>
            <Feather name="log-out" size={16} color={colors.textSecondary} />
            <Text style={[styles.footerBtnText, { color: colors.textSecondary }]}>تسجيل خروج</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1, gap: 12 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  appName: { fontSize: 20, fontWeight: '800' },
  closeBtn: { padding: 4 },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
  },
  newChatText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    gap: 8,
    height: 38,
  },
  searchInput: { flex: 1, fontSize: 14 },
  list: { flex: 1, paddingHorizontal: 8, paddingVertical: 8 },
  empty: { textAlign: 'center', marginTop: 32, fontSize: 14 },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 2,
  },
  chatTitle: { flex: 1, fontSize: 14 },
  footer: { padding: 16, borderTopWidth: 1, gap: 12 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  avatarPlaceholder: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontWeight: '700', fontSize: 16 },
  userName: { fontWeight: '600', fontSize: 14 },
  userEmail: { fontSize: 12 },
  footerBtns: { flexDirection: 'row', gap: 8 },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  footerBtnText: { fontSize: 13, fontWeight: '600' },
});
