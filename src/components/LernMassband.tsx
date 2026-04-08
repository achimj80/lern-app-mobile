import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScoreRank } from '../types';

interface Props {
  ranks: ScoreRank[];
  currentPercent: number;
  label?: string;
}

export default function LernMassband({ ranks, currentPercent, label }: Props) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.track}>
        {ranks.map((rank, i) => {
          const width = ((rank.maxPercent - rank.minPercent) / 100) * 100;
          const isEarned = rank.earned;
          const isCurrent = rank.current;

          return (
            <View
              key={rank.id}
              style={[
                styles.segment,
                { width: `${Math.min(width, 100)}%` as unknown as number },
                isEarned && styles.segmentEarned,
                isCurrent && styles.segmentCurrent,
                i === 0 && styles.segmentFirst,
                i === ranks.length - 1 && styles.segmentLast,
              ]}
            >
              <Text style={styles.segmentIcon}>{rank.icon}</Text>
            </View>
          );
        })}
      </View>

      {/* Current rank info */}
      {ranks.map(rank =>
        rank.current ? (
          <View key={rank.id} style={styles.currentInfo}>
            <Text style={styles.currentIcon}>{rank.icon}</Text>
            <View>
              <Text style={styles.currentName}>{rank.name}</Text>
              <Text style={styles.currentDesc}>{rank.description}</Text>
            </View>
            <Text style={styles.currentPercent}>{currentPercent}%</Text>
          </View>
        ) : null
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
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#78350f',
    marginBottom: 12,
  },
  track: {
    flexDirection: 'row',
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  segment: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
  },
  segmentFirst: {
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  segmentLast: {
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    borderRightWidth: 0,
  },
  segmentEarned: {
    backgroundColor: '#fde68a',
  },
  segmentCurrent: {
    backgroundColor: '#f59e0b',
  },
  segmentIcon: {
    fontSize: 18,
  },
  currentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  currentIcon: {
    fontSize: 32,
  },
  currentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  currentDesc: {
    fontSize: 13,
    color: '#9ca3af',
  },
  currentPercent: {
    marginLeft: 'auto',
    fontSize: 20,
    fontWeight: '800',
    color: '#f59e0b',
  },
});
