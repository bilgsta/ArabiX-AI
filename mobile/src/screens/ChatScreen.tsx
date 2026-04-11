import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  KeyboardAvoidingView, Platform, SafeAreaView, Alert,
  DrawerLayoutAndroid, StatusBar, ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/colors';
import ChatBubble from '../components/ChatBubble';
import InputBar from '../components/InputBar';
import Sidebar from '../components/Sidebar';
import {
  apiGet, apiPost, streamChat, uploadImage
} from '../api/client';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface Conversation {
  id: number;
  title: string;
  isLocked: boolean;
}

export default function ChatScreen({ onSettings, onVoiceMode }: { onSettings: () => void; onVoiceMode: () => void }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const drawerRef = useRef<DrawerLayoutAndroid>(null);
  const flatListRef = useRef<FlatList>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMsg, setStreamingMsg] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const data = await apiGet<Conversation[]>('/api/conversations');
      setConversations(data);
      if (data.length > 0 && !activeId) {
        setActiveId(data[0].id);
      }
    } catch { }
    finally { setLoadingConvs(false); }
  }, [activeId]);

  const fetchMessages = useCallback(async (id: number) => {
    try {
      const data = await apiGet<{ messages: Message[] }>(`/api/conversations/${id}`);
      setMessages(data.messages || []);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    } catch { }
  }, []);

  useEffect(() => { fetchConversations(); }, []);
  useEffect(() => { if (activeId) fetchMessages(activeId); }, [activeId]);

  const handleNewChat = async () => {
    drawerRef.current?.closeDrawer();
    try {
      const conv = await apiPost<Conversation>('/api/conversations', {});
      setConversations(prev => [conv, ...prev]);
      setActiveId(conv.id);
      setMessages([]);
    } catch { Alert.alert('خطأ', 'فشل إنشاء المحادثة'); }
  };

  const handleSelectConv = (id: number) => {
    drawerRef.current?.closeDrawer();
    setActiveId(id);
    setMessages([]);
  };

  const handleSend = async (text: string, imgUrl?: string) => {
    if (!activeId || isStreaming) return;

    const userMsg: Message = {
      id: Date.now(),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setUploadedImage(null);
    setIsStreaming(true);
    setStreamingMsg('');

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    let full = '';
    await streamChat(
      activeId,
      text,
      imgUrl || uploadedImage,
      null,
      (chunk) => {
        full += chunk;
        setStreamingMsg(full);
        flatListRef.current?.scrollToEnd({ animated: false });
      },
      () => {
        const aiMsg: Message = {
          id: Date.now() + 1,
          role: 'assistant',
          content: full,
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, aiMsg]);
        setStreamingMsg('');
        setIsStreaming(false);

        // Refresh conversation title
        fetchConversations();
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      },
      (err) => {
        Alert.alert('خطأ', `فشل الإرسال: ${err}`);
        setIsStreaming(false);
        setStreamingMsg('');
      }
    );
  };

  const handleImagePick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('إذن مطلوب', 'نحتاج إذن للوصول للصور');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setIsLoading(true);
      try {
        const { url } = await uploadImage(result.assets[0].uri);
        setUploadedImage(url);
        Alert.alert('تم', 'تم رفع الصورة. أرسل رسالتك مع الصورة.');
      } catch { Alert.alert('خطأ', 'فشل رفع الصورة'); }
      finally { setIsLoading(false); }
    }
  };

  const handleMicPress = async () => {
    if (isRecording) {
      setIsRecording(false);
      try {
        await recordingRef.current?.stopAndUnloadAsync();
        const uri = recordingRef.current?.getURI();
        recordingRef.current = null;
        if (uri) {
          Alert.alert('الصوت', 'تم التسجيل. جاري الإرسال...');
          // TODO: send to /api/voice/chat or STT endpoint
        }
      } catch { }
    } else {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('إذن مطلوب', 'نحتاج إذن للمايك');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
    }
  };

  const activeConv = conversations.find(c => c.id === activeId);

  const renderSidebar = () => (
    <Sidebar
      conversations={conversations}
      activeId={activeId}
      onSelect={handleSelectConv}
      onNewChat={handleNewChat}
      onClose={() => drawerRef.current?.closeDrawer()}
      onRefresh={fetchConversations}
      onSettings={onSettings}
    />
  );

  const renderItem = ({ item }: { item: Message }) => (
    <ChatBubble role={item.role} content={item.content} />
  );

  return (
    <DrawerLayoutAndroid
      ref={drawerRef}
      drawerWidth={300}
      drawerPosition="right"
      renderNavigationView={renderSidebar}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <StatusBar
          backgroundColor={colors.header}
          barStyle="light-content"
        />

        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => drawerRef.current?.openDrawer()}
            style={styles.headerBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="menu" size={24} color={colors.text} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {activeConv?.title || 'أبو اليزيد'}
          </Text>

          <TouchableOpacity style={styles.headerBtn} onPress={onVoiceMode} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="mic" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {loadingConvs ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : messages.length === 0 && !isStreaming ? (
            <View style={styles.welcome}>
              <View style={[styles.welcomeLogo, { backgroundColor: Colors.primary + '22' }]}>
                <Text style={styles.welcomeLogoText}>أ</Text>
              </View>
              <Text style={[styles.welcomeTitle, { color: colors.text }]}>
                مرحباً {user?.firstName || ''}!
              </Text>
              <Text style={[styles.welcomeSub, { color: colors.textMuted }]}>
                أنا أبو اليزيد، مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟
              </Text>

              <View style={styles.suggestions}>
                {['ساعدني في كتابة رسالة', 'اشرح لي مفهوماً', 'راجع كودي', 'أعطني أفكاراً'].map(s => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => handleSend(s)}
                    style={[styles.suggestionChip, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                  >
                    <Text style={[styles.suggestionText, { color: colors.textSecondary }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={item => item.id.toString()}
              renderItem={renderItem}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={
                isStreaming ? (
                  <ChatBubble role="assistant" content={streamingMsg} isStreaming />
                ) : null
              }
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            />
          )}

          {uploadedImage && (
            <View style={[styles.imageBadge, { backgroundColor: Colors.primary + '22', borderColor: Colors.primary + '44' }]}>
              <Feather name="image" size={14} color={Colors.primary} />
              <Text style={[styles.imageBadgeText, { color: Colors.primary }]}>صورة مرفقة</Text>
              <TouchableOpacity onPress={() => setUploadedImage(null)}>
                <Feather name="x" size={14} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          <InputBar
            onSend={handleSend}
            onImagePick={handleImagePick}
            onMicPress={handleMicPress}
            isLoading={isStreaming || isLoading}
            isRecording={isRecording}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </DrawerLayoutAndroid>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  headerBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  messagesList: { paddingTop: 12, paddingBottom: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  welcome: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 12,
  },
  welcomeLogo: {
    width: 72, height: 72, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  welcomeLogoText: { fontSize: 34, color: Colors.primary, fontWeight: '800' },
  welcomeTitle: { fontSize: 22, fontWeight: '700' },
  welcomeSub: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 8 },
  suggestionChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
  },
  suggestionText: { fontSize: 13, fontWeight: '500' },
  imageBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, marginBottom: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, alignSelf: 'flex-end',
  },
  imageBadgeText: { fontSize: 13, fontWeight: '600' },
});
