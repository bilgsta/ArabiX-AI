import React from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useTheme } from '../contexts/ThemeContext';
import { Colors } from '../constants/colors';

interface Props {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export default function ChatBubble({ role, content, isStreaming }: Props) {
  const { colors, theme } = useTheme();
  const isUser = role === 'user';

  const markdownStyles = StyleSheet.create({
    body: { color: colors.text, fontSize: 15, lineHeight: 22, writingDirection: 'rtl' },
    code_inline: { backgroundColor: colors.surfaceElevated, color: Colors.primaryLight, fontFamily: 'monospace', borderRadius: 4, paddingHorizontal: 4 },
    fence: { backgroundColor: colors.surfaceElevated, borderRadius: 8, padding: 12, marginVertical: 8 },
    code_block: { color: Colors.primaryLight, fontFamily: 'monospace', fontSize: 13 },
    bullet_list_icon: { color: colors.textSecondary },
    ordered_list_icon: { color: colors.textSecondary },
    strong: { color: colors.text, fontWeight: '700' },
    em: { fontStyle: 'italic' },
    heading1: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 8 },
    heading2: { color: colors.text, fontSize: 17, fontWeight: '600', marginBottom: 6 },
    heading3: { color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  });

  if (isUser) {
    return (
      <View style={[styles.row, styles.userRow]}>
        <View style={[styles.userBubble, { backgroundColor: colors.userBubble, borderColor: colors.border }]}>
          <Text style={[styles.userText, { color: colors.text }]}>{content}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, styles.aiRow]}>
      <View style={[styles.avatar, { backgroundColor: Colors.primary }]}>
        <Text style={styles.avatarText}>أ</Text>
      </View>
      <View style={styles.aiContent}>
        {isStreaming && content.length === 0 ? (
          <View style={styles.typingDots}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={[styles.typingText, { color: colors.textMuted }]}>يكتب...</Text>
          </View>
        ) : (
          <Markdown style={markdownStyles}>{content}</Markdown>
        )}
        {isStreaming && content.length > 0 && (
          <View style={[styles.cursor, { backgroundColor: Colors.primary }]} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 16, paddingHorizontal: 16 },
  userRow: { alignItems: 'flex-end' },
  aiRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  userBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    borderWidth: 1,
  },
  userText: { fontSize: 15, lineHeight: 22, textAlign: 'right', writingDirection: 'rtl' },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  aiContent: { flex: 1 },
  typingDots: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  typingText: { fontSize: 14 },
  cursor: { width: 2, height: 18, marginTop: 2, borderRadius: 1, opacity: 0.8 },
});
