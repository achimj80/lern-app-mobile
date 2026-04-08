import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type PracticePhase = 'ready' | 'dictating' | 'photo' | 'analyzing' | 'review';

const STEPS: { phase: PracticePhase; icon: string; label: string }[] = [
  { phase: 'ready', icon: '👋', label: 'Start' },
  { phase: 'dictating', icon: '🎧', label: 'Hören' },
  { phase: 'photo', icon: '📸', label: 'Foto' },
  { phase: 'analyzing', icon: '🔍', label: 'Prüfen' },
  { phase: 'review', icon: '✅', label: 'Ergebnis' },
];

const PHASE_ORDER: PracticePhase[] = ['ready', 'dictating', 'photo', 'analyzing', 'review'];

interface Props {
  currentPhase: PracticePhase;
}

export default function StepIndicator({ currentPhase }: Props) {
  const currentIdx = PHASE_ORDER.indexOf(currentPhase);

  return (
    <View style={styles.container}>
      {STEPS.map((step, i) => {
        const isDone = i < currentIdx;
        const isCurrent = i === currentIdx;

        return (
          <View key={step.phase} style={styles.stepRow}>
            <View style={styles.stepCol}>
              <View
                style={[
                  styles.circle,
                  isCurrent && styles.circleCurrent,
                  isDone && styles.circleDone,
                  !isCurrent && !isDone && styles.circleInactive,
                ]}
              >
                <Text style={[
                  styles.circleText,
                  (isCurrent || isDone) && styles.circleTextActive,
                ]}>
                  {isDone ? '✓' : step.icon}
                </Text>
              </View>
              <Text
                style={[
                  styles.label,
                  isCurrent && styles.labelCurrent,
                  isDone && styles.labelDone,
                  !isCurrent && !isDone && styles.labelInactive,
                ]}
              >
                {step.label}
              </Text>
            </View>
            {i < STEPS.length - 1 && (
              <View
                style={[
                  styles.connector,
                  i < currentIdx ? styles.connectorDone : styles.connectorInactive,
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepCol: {
    alignItems: 'center',
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleCurrent: {
    backgroundColor: '#f59e0b',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    transform: [{ scale: 1.1 }],
  },
  circleDone: {
    backgroundColor: '#4ade80',
  },
  circleInactive: {
    backgroundColor: '#f3f4f6',
  },
  circleText: {
    fontSize: 14,
    color: '#d1d5db',
  },
  circleTextActive: {
    color: '#fff',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  labelCurrent: {
    color: '#d97706',
  },
  labelDone: {
    color: '#4ade80',
  },
  labelInactive: {
    color: '#d1d5db',
  },
  connector: {
    width: 16,
    height: 2,
    borderRadius: 1,
    marginTop: 17,
    marginHorizontal: 2,
  },
  connectorDone: {
    backgroundColor: '#86efac',
  },
  connectorInactive: {
    backgroundColor: '#e5e7eb',
  },
});
