import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, SafeAreaView, Alert, ScrollView, StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { useTheme } from '../contexts/ThemeContext';
import { Colors } from '../constants/colors';
import { BASE_URL, apiGet } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Message { role: 'user' | 'assistant'; text: string; }

interface Props { onBack: () => void; }

export default function VoiceScreen({ onBack }: Props) {
  const { colors } = useTheme();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const recordingRef = useRef<Audio.Recording | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef<ScrollView>(null);

  const statusLabels: Record<string, string> = {
    idle: 'اضغط للتحدث',
    listening: 'جارِ الاستماع...',
    thinking: 'يفكر...',
    speaking: 'يتحدث...',
  };

  useEffect(() => {
    if (status === 'listening') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [status]);

  const startListening = async () => {
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) { Alert.alert('إذن مطلوب', 'نحتاج إذن للمايكروفون'); return; }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recordingRef.current = recording;
    setIsListening(true);
    setStatus('listening');
    setTranscript('');
  };

  const stopListening = async () => {
    setIsListening(false);
    setStatus('thinking');
    try {
      await recordingRef.current?.stopAndUnloadAsync();
      const uri = recordingRef.current?.getURI();
      recordingRef.current = null;

      if (!uri) { setStatus('idle'); return; }

      // Send audio to backend for STT + AI response
      const cookie = await AsyncStorage.getItem('session_cookie');
      const form = new FormData();
      form.append('audio', { uri, name: 'recording.m4a', type: 'audio/m4a' } as any);

      const res = await fetch(`${BASE_URL}/api/voice/chat`, {
        method: 'POST',
        headers: { ...(cookie ? { Cookie: cookie } : {}) },
        body: form,
        credentials: 'include',
      });

      if (!res.ok) {
        // Fallback: if voice/chat doesn't support audio upload, prompt user to type
        Alert.alert('تنبيه', 'استخدم المدخل النصي للتحدث مع المساعد في الوقت الحالي');
        setStatus('idle');
        return;
      }

      const data = await res.json();
      const userText = data.userText || 'رسالة صوتية';
      const aiText = data.reply || data.content || '';

      setMessages(prev => [
        ...prev,
        { role: 'user', text: userText },
        { role: 'assistant', text: aiText },
      ]);
      setTranscript(userText);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

      // Speak the AI response
      setStatus('speaking');
      setIsSpeaking(true);
      Speech.speak(aiText, {
        language: 'ar-SA',
        rate: 0.9,
        onDone: () => { setIsSpeaking(false); setStatus('idle'); },
        onError: () => { setIsSpeaking(false); setStatus('idle'); },
      });
    } catch (err) {
      Alert.alert('خطأ', 'فشل إرسال الصوت');
      setStatus('idle');
    }
  };

  const stopSpeaking = () => {
    Speech.stop();
    setIsSpeaking(false);
    setStatus('idle');
  };

  const handleMicPress = () => {
    if (isSpeaking) { stopSpeaking(); return; }
    if (isListening) { stopListening(); } else { startListening(); }
  };

  const getMicColor = (): [string, string] => {
    if (status === 'listening') return ['#ef4444', '#dc2626'];
    if (status === 'speaking') return [Colors.primaryLight, Colors.primary];
    if (status === 'thinking') return ['#f59e0b', '#d97706'];
    return [Colors.primary, Colors.primaryDark];
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar backgroundColor={colors.background} barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="arrow-right" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>المساعد الصوتي</Text>
        <TouchableOpacity onPress={() => setMessages([])}>
          <Feather name="trash-2" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: Colors.primary + '22' }]}>
              <Feather name="mic" size={32} color={Colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>وضع المحادثة الصوتية</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              اضغط على الزر أسفله وتكلم مع أبو اليزيد بالعربية
            </Text>
          </View>
        ) : (
          messages.map((m, i) => (
            <View
              key={i}
              style={[
                styles.msgBubble,
                m.role === 'user'
                  ? [styles.userBubble, { backgroundColor: colors.userBubble, borderColor: colors.border }]
                  : [styles.aiBubble, { backgroundColor: Colors.primary + '15', borderColor: Colors.primary + '30' }]
              ]}
            >
              <View style={[styles.msgIcon, { backgroundColor: m.role === 'user' ? colors.surfaceElevated : Colors.primary }]}>
                <Feather name={m.role === 'user' ? 'user' : 'cpu'} size={14} color={m.role === 'user' ? colors.textMuted : '#fff'} />
              </View>
              <Text style={[styles.msgText, { color: colors.text }]}>{m.text}</Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Transcript */}
      {transcript.length > 0 && (
        <View style={[styles.transcript, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Text style={[styles.transcriptText, { color: colors.textSecondary }]}>{transcript}</Text>
        </View>
      )}

      {/* Mic Area */}
      <View style={styles.micArea}>
        <Text style={[styles.statusLabel, { color: colors.textMuted }]}>{statusLabels[status]}</Text>

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            onPress={handleMicPress}
            activeOpacity={0.85}
            disabled={status === 'thinking'}
          >
            <LinearGradient colors={getMicColor()} style={styles.micBtn}>
              {status === 'thinking' ? (
                <Feather name="loader" size={36} color="#fff" />
              ) : isSpeaking ? (
                <Feather name="volume-2" size={36} color="#fff" />
              ) : (
                <Feather name={isListening ? 'mic-off' : 'mic'} size={36} color="#fff" />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <Text style={[styles.hint, { color: colors.textMuted }]}>
          {isListening ? 'اضغط مرة أخرى للإرسال' : isSpeaking ? 'اضغط لإيقاف الصوت' : 'اضغط للتحدث'}
        </Text>
      </View>
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
  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 12, paddingBottom: 16 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22, maxWidth: 260 },
  msgBubble: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 16, borderWidth: 1 },
  userBubble: {},
  aiBubble: {},
  msgIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  msgText: { flex: 1, fontSize: 15, lineHeight: 22, writingDirection: 'rtl' },
  transcript: {
    marginHorizontal: 16, marginBottom: 8, padding: 12,
    borderRadius: 12, borderWidth: 1,
  },
  transcriptText: { fontSize: 14, textAlign: 'right', writingDirection: 'rtl' },
  micArea: { alignItems: 'center', paddingVertical: 32, gap: 16 },
  statusLabel: { fontSize: 14, fontWeight: '500' },
  micBtn: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOpacity: 0.5,
    shadowRadius: 20, elevation: 12,
  },
  hint: { fontSize: 12 },
});
