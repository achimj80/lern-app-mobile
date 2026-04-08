import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const DAILY_GOAL = 1;
const RADIUS = 28;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface GoalRingProps {
  count: number;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

function GoalRing({ count, label, icon, color, bgColor }: GoalRingProps) {
  const progress = Math.min(count / DAILY_GOAL, 1);
  const offset = CIRCUMFERENCE * (1 - progress);
  const isComplete = count >= DAILY_GOAL;

  return (
    <View style={styles.ringContainer}>
      <View style={styles.ringWrapper}>
        <Svg width={64} height={64} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle
            cx={32} cy={32} r={RADIUS}
            fill="none"
            stroke={isComplete ? bgColor : '#f3f4f6'}
            strokeWidth={5}
          />
          <Circle
            cx={32} cy={32} r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE}`}
            strokeDashoffset={offset}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={styles.ringCenterText}>
            {isComplete ? '✅' : `${count}/${DAILY_GOAL}`}
          </Text>
        </View>
      </View>
      <View style={styles.ringInfo}>
        <Text style={styles.ringLabel}>{icon} {label}</Text>
        <Text style={styles.ringStatus}>
          {isComplete ? 'Geschafft!' : count === 0 ? 'Noch offen' : 'Fast da!'}
        </Text>
      </View>
    </View>
  );
}

interface Props {
  diktatCount: number;
  matheCount: number;
}

export default function DailyGoal({ diktatCount, matheCount }: Props) {
  const allComplete = diktatCount >= DAILY_GOAL && matheCount >= DAILY_GOAL;

  return (
    <View style={[styles.container, allComplete && styles.containerComplete]}>
      {allComplete ? (
        <View style={styles.completeContent}>
          <Text style={styles.completeTitle}>✅ Tagesziel erreicht!</Text>
          <Text style={styles.completeSub}>Super, du hast heute genug geübt!</Text>
        </View>
      ) : (
        <View style={styles.ringsRow}>
          <GoalRing count={diktatCount} label="Diktat" icon="📖" color="#f59e0b" bgColor="#d1fae5" />
          <GoalRing count={matheCount} label="Mathe" icon="🔢" color="#3b82f6" bgColor="#dbeafe" />
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
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  containerComplete: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  completeContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  completeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#15803d',
  },
  completeSub: {
    fontSize: 14,
    color: '#16a34a',
    marginTop: 4,
  },
  ringsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ringContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ringWrapper: {
    width: 64,
    height: 64,
    position: 'relative',
  },
  ringCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringCenterText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#374151',
  },
  ringInfo: {
    flex: 1,
  },
  ringLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  ringStatus: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
});
