import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';

const { width, height } = Dimensions.get('window');

interface Props {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
      ]),
      Animated.delay(200),
      Animated.timing(subtitleAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(fadeAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start(() => onFinish());
  }, []);

  return (
    <LinearGradient
      colors={['#0a140a', '#0f1a0f', '#0d1f12', '#0a1a0a']}
      style={styles.container}
    >
      {/* Decorative circles */}
      <View style={[styles.circle, styles.circle1]} />
      <View style={[styles.circle, styles.circle2]} />
      <View style={[styles.circle, styles.circle3]} />

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        {/* Logo */}
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight]}
          style={styles.logoContainer}
        >
          <Text style={styles.logoText}>أ</Text>
        </LinearGradient>

        <Text style={styles.appName}>أبو اليزيد</Text>
        <Text style={styles.appNameEn}>Abu Al-Yazid AI</Text>

        <Animated.Text style={[styles.subtitle, { opacity: subtitleAnim }]}>
          مساعدك الذكي بالعربية
        </Animated.Text>

        <Animated.View style={[styles.dotsRow, { opacity: subtitleAnim }]}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[styles.dot, { backgroundColor: Colors.primary, opacity: 0.5 + i * 0.2 }]} />
          ))}
        </Animated.View>
      </Animated.View>

      <Animated.Text style={[styles.brand, { opacity: subtitleAnim }]}>
        ArabiX AI
      </Animated.Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: Colors.primary,
    opacity: 0.05,
  },
  circle1: { width: width * 0.8, height: width * 0.8, top: -width * 0.2, right: -width * 0.2 },
  circle2: { width: width * 0.6, height: width * 0.6, bottom: height * 0.1, left: -width * 0.2 },
  circle3: { width: 200, height: 200, top: height * 0.3, left: -50, opacity: 0.08 },
  content: { alignItems: 'center', gap: 12 },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: Colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  logoText: { fontSize: 44, color: '#fff', fontWeight: '800' },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: '#f0fdf4',
    letterSpacing: 1,
  },
  appNameEn: {
    fontSize: 14,
    color: Colors.primaryLight,
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  subtitle: {
    fontSize: 16,
    color: '#86efac',
    marginTop: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  brand: {
    position: 'absolute',
    bottom: 48,
    fontSize: 13,
    color: Colors.primaryMuted,
    letterSpacing: 3,
    opacity: 0.6,
    textTransform: 'uppercase',
  },
});
