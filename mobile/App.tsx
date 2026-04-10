import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, BackHandler, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreenExpo from 'expo-splash-screen';

import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import ChatScreen from './src/screens/ChatScreen';
import SettingsScreen from './src/screens/SettingsScreen';

SplashScreenExpo.preventAutoHideAsync();

type Screen = 'splash' | 'login' | 'chat' | 'settings';

function AppNavigator() {
  const [screen, setScreen] = useState<Screen>('splash');
  const { user, isLoading } = useAuth();
  const { colors } = useTheme();

  useEffect(() => {
    if (!isLoading) {
      SplashScreenExpo.hideAsync();
    }
  }, [isLoading]);

  // Android back button handling
  useEffect(() => {
    const onBack = () => {
      if (screen === 'settings') {
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
      <SplashScreen onFinish={() => setScreen(user ? 'chat' : 'login')} />
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.primary, fontSize: 28, fontWeight: '800' }}>أ</Text>
      </View>
    );
  }

  if (!user) return <LoginScreen />;

  if (screen === 'settings') {
    return <SettingsScreen onBack={() => setScreen('chat')} />;
  }

  return <ChatScreen onSettings={() => setScreen('settings')} />;
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
