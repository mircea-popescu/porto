import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import { Circle, G, Path, Svg } from 'react-native-svg';

import { gradientDir, gradients } from '@/constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

const R = 70;
const C = 2 * Math.PI * R; // circumferința inelului
const TARGET = 0.75; // inelul se umple până la ¾ (= starea din iconiță)

/**
 * Intro „Porto”: pisica gingerie clipește din ochi deschiși, inelul de progres
 * se umple până la ¾, apoi pisica închide ochii fericit (cu un mic bounce), iar
 * overlay-ul se estompează. Starea finală = exact iconița aplicației.
 *
 * Tehnologie: react-native-svg + Animated (built-in). strokeDashoffset și opacity
 * pe SVG nu suportă native driver, deci toate animațiile rulează cu JS driver.
 */
export function PortoIntro({ onDone }: { onDone: () => void }) {
  const { width } = useWindowDimensions();
  const size = Math.min(width * 0.56, 260);

  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    const done = ({ finished }: { finished: boolean }) => {
      if (finished && !cancelled) onDone();
    };

    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;

      if (reduce) {
        // Fără mișcare: arată direct starea finală, ține-o scurt, apoi estompează.
        progress.setValue(1);
        scale.setValue(1);
        opacity.setValue(1);
        Animated.sequence([
          Animated.delay(800),
          Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: false }),
        ]).start(done);
        return;
      }

      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: false }),
          Animated.spring(scale, { toValue: 1, friction: 7, useNativeDriver: false }),
        ]),
        Animated.timing(progress, {
          toValue: 1,
          duration: 1150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        // Bounce fericit când ochii se închid.
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.07,
            duration: 150,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: false }),
        ]),
        Animated.delay(350),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: false }),
      ]).start(done);
    });

    return () => {
      cancelled = true;
    };
  }, [onDone, opacity, scale, progress]);

  const ringOffset = progress.interpolate({ inputRange: [0, 1], outputRange: [C, C * (1 - TARGET)] });
  const openEyes = progress.interpolate({ inputRange: [0, 0.8, 0.92], outputRange: [1, 1, 0] });
  const closedEyes = progress.interpolate({ inputRange: [0.82, 0.95], outputRange: [0, 1] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity }]}>
      <LinearGradient
        colors={gradients.ember as unknown as [string, string]}
        locations={gradients.emberLocations}
        start={gradientDir.start}
        end={gradientDir.end}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={{ transform: [{ scale }] }}>
        <Svg width={size} height={size} viewBox="0 0 200 200">
          {/* Inel: pistă slabă + arc de progres animat (pornit din vârf). */}
          <Circle cx={100} cy={100} r={R} stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={13} fill="none" />
          <AnimatedCircle
            cx={100}
            cy={100}
            r={R}
            stroke="#FFFFFF"
            strokeWidth={13}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={C}
            strokeDashoffset={ringOffset}
            rotation={-90}
            originX={100}
            originY={100}
          />

          {/* Pisica (scalată să încapă în inel). */}
          <G transform="translate(40,40) scale(0.6)">
            <Path d="M58 70 L46 26 L94 56 Z" fill="#F2933A" />
            <Path d="M142 70 L154 26 L106 56 Z" fill="#F2933A" />
            <Path d="M64 64 L56 40 L84 58 Z" fill="#F7C39B" />
            <Path d="M136 64 L144 40 L116 58 Z" fill="#F7C39B" />
            <Path
              d="M100 48 C64 48 48 76 48 108 C48 146 70 162 100 162 C130 162 152 146 152 108 C152 76 136 48 100 48 Z"
              fill="#F2933A"
            />
            <Path
              d="M100 58 L100 80 M86 60 L82 82 M114 60 L118 82"
              stroke="#C96A1E"
              strokeWidth={5}
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d="M100 104 C78 104 68 126 74 146 C80 158 92 162 100 162 C108 162 120 158 126 146 C132 126 122 104 100 104 Z"
              fill="#FBEFE3"
            />

            {/* Ochi deschiși (amber) — vizibili la început. */}
            <AnimatedG opacity={openEyes}>
              <Path d="M80 78 C73 78 69 84 69 92 C69 100 73 106 80 106 C87 106 91 100 91 92 C91 84 87 78 80 78 Z" fill="#F2D27A" />
              <Path d="M120 78 C113 78 109 84 109 92 C109 100 113 106 120 106 C127 106 131 100 131 92 C131 84 127 78 120 78 Z" fill="#F2D27A" />
              <Path d="M80 84 C76 84 74 88 74 94 C74 100 76 104 80 104 C84 104 86 100 86 94 C86 88 84 84 80 84 Z" fill="#2B2018" />
              <Path d="M120 84 C116 84 114 88 114 94 C114 100 116 104 120 104 C124 104 126 100 126 94 C126 88 124 84 120 84 Z" fill="#2B2018" />
              <Circle cx={77} cy={87} r={2.5} fill="#FFFFFF" />
              <Circle cx={117} cy={87} r={2.5} fill="#FFFFFF" />
            </AnimatedG>

            {/* Ochi închiși (squint fericit) — apar când inelul se completează. */}
            <AnimatedG opacity={closedEyes}>
              <Path
                d="M68 94 Q80 82 92 94 M108 94 Q120 82 132 94"
                stroke="#2B2018"
                strokeWidth={5}
                fill="none"
                strokeLinecap="round"
              />
            </AnimatedG>

            <Path d="M100 116 L91 107 L109 107 Z" fill="#E98BA0" />
            <Path
              d="M100 116 L100 124 M100 124 Q90 132 85 128 M100 124 Q110 132 115 128"
              stroke="#C96A1E"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
            />
          </G>
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
});
