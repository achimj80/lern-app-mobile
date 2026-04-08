import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface GoalRingProps {
  count: number;
  goal: number;
  emoji: string;
  label: string;
  color: string;
}

function GoalRing({ count, goal, emoji, label, color }: GoalRingProps) {
  const done = count >= goal;
  const progress = Math.min(count / goal, 1);
  const size = 64;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <View style={styles.ringContainer}>
      <View style={styles.ringWrapper}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={done ? '#22c55e' : color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <Text style={styles.ringEmoji}>{done ? '✅' : emoji}</Text>
      </View>
      <Text style={styles.ringLabel}>{label}</Text>
    </View>
  );
}

interface Props {
  diktatCount: number;
  matheCount: number;
}

export default function DailyGoal({ diktatCount, matheCount }: Props) {
  const bothDone = diktatCount >= 1 && matheCount >= 1;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tagesziel</Text>
      <View style={styles.ringsRow}>
        <GoalRing count={diktatCount} goal={1} emoji="📖" label="Diktat" color="#f59e0b" />
        <GoalRing count={matheCount} goal={1} emoji="🔢" label="Mathe" color="#3b82f6" />
      </View>
      {bothDone && (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>🎉 Tagesziel geschafft!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#78350f',
    marginBottom: 12,
  },
  ringsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  ringContainer: {
    alignItems: 'center',
    gap: 6,
  },
  ringWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringEmoji: {
    position: 'absolute',
    fontSize: 22,
  },
  ringLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  successBanner: {
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    alignItems: 'center',
  },
  successText: {
    color: '#16a34a',
    fontWeight: '700',
    fontSize: 14,
  },
});
