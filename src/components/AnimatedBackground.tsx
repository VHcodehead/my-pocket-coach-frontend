import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface AnimatedBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function AnimatedBackground({ children, style }: AnimatedBackgroundProps) {
  const opacity1 = useRef(new Animated.Value(1)).current;
  const opacity2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Cross-fade between two gradients
    Animated.loop(
      Animated.sequence([
        // Fade to gradient 2
        Animated.parallel([
          Animated.timing(opacity1, {
            toValue: 0,
            duration: 8000,
            useNativeDriver: true,
          }),
          Animated.timing(opacity2, {
            toValue: 1,
            duration: 8000,
            useNativeDriver: true,
          }),
        ]),
        // Fade back to gradient 1
        Animated.parallel([
          Animated.timing(opacity1, {
            toValue: 1,
            duration: 8000,
            useNativeDriver: true,
          }),
          Animated.timing(opacity2, {
            toValue: 0,
            duration: 8000,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.container, style]}>
      {/* Gradient 1 - Dark blue with moderate neon cyan accent */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacity1 }]}>
        <LinearGradient
          colors={['#0A1628', '#00D9FF10', '#1B263B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Gradient 2 - Reversed with moderate neon cyan highlight */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacity2 }]}>
        <LinearGradient
          colors={['#1B263B', '#00D9FF14', '#0A1628']}
          start={{ x: 1, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
