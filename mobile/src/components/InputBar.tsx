import React, { useState, useRef } from 'react';
import {
  View, TextInput, TouchableOpacity, StyleSheet,
  Platform, KeyboardAvoidingView, ActivityIndicator, Text
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Colors } from '../constants/colors';

interface Props {
  onSend: (text: string, imageUrl?: string) => void;
  onImagePick: () => void;
  onMicPress: () => void;
  isLoading: boolean;
  isRecording?: boolean;
}

export default function InputBar({ onSend, onImagePick, onMicPress, isLoading, isRecording }: Props) {
  const [text, setText] = useState('');
  const { colors } = useTheme();

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
      <View style={[styles.container, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
        <TouchableOpacity onPress={onImagePick} style={styles.iconBtn} activeOpacity={0.7}>
          <Feather name="image" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onMicPress}
          style={[styles.iconBtn, isRecording && styles.recordingBtn]}
          activeOpacity={0.7}
        >
          <Feather name="mic" size={20} color={isRecording ? Colors.primary : colors.textMuted} />
        </TouchableOpacity>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="اكتب رسالتك..."
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text }]}
          multiline
          maxLength={4000}
          textAlign="right"
          textAlignVertical="center"
          returnKeyType="default"
          onSubmitEditing={Platform.OS === 'ios' ? handleSend : undefined}
        />

        {isLoading ? (
          <ActivityIndicator size="small" color={Colors.primary} style={styles.sendBtn} />
        ) : (
          <TouchableOpacity
            onPress={handleSend}
            style={[styles.sendBtn, { backgroundColor: text.trim() ? Colors.primary : colors.surfaceElevated }]}
            disabled={!text.trim()}
            activeOpacity={0.8}
          >
            <Feather name="send" size={18} color={text.trim() ? '#fff' : colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 20,
  },
  recordingBtn: {
    backgroundColor: Colors.primaryMuted + '33',
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 120,
    paddingHorizontal: 6,
    paddingVertical: 4,
    writingDirection: 'rtl',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
