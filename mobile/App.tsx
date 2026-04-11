import React, { useState, useEffect } from 'react';
import { View, StyleSheet, BackHandler, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreenExpo from 'expo-splash-screen';

import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { Colors } from './src/constants/colors';

import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import ChatScreen from './src/screens/ChatScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import VoiceScreen from './src/screens/VoiceScreen';

SplashScreenExpo.preventAutoHideAsync();

type Screen = 'splash' | 'login' | 'chat' | 'settings' | 'voice';

function AppNavigator() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [splashDone, setSplashDone] = useState(false);
  const { user, isLoading } = useAuth();
  const { colors } = useTheme();

  useEffect(() => {
    if (!isLoading && splashDone) {
      SplashScreenExpo.hideAsync();
      if (screen === 'splash') {
        setScreen(user ? 'chat' : 'login');
      }
    }
  }, [isLoading, splashDone, user]);

  // Android back button handling
  useEffect(() => {
    const onBack = () => {
      if (screen === 'settings' || screen === 'voice') {
        setScreen('chat');
        return true;
      }
      if (screen === 'chat') {
        Alert.alert('خروج', 'هل تريد الخروج من التطبيق؟', [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'خروج', style: 'destructive', onPress: () => BackHandler.exitApp() },
        ]);
        return true;
      }
      return false;
    };
    BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBack);
  }, [screen]);

  if (screen === 'splash') {
    return (
      <SplashScreen
        onFinish={() => {
          setSplashDone(true);
          if (!isLoading) {
            SplashScreenExpo.hideAsync();
            setScreen(user ? 'chat' : 'login');
          }
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!user) return <LoginScreen />;

  if (screen === 'settings') {
    return <SettingsScreen onBack={() => setScreen('chat')} />;
  }

  if (screen === 'voice') {
    return <VoiceScreen onBack={() => setScreen('chat')} />;
  }

  return (
    <ChatScreen
      onSettings={() => setScreen('settings')}
      onVoiceMode={() => setScreen('voice')}
    />
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppNavigator />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
