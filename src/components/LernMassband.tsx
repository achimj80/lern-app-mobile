import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Circle as SvgCircle } from 'react-native-svg';
import { ScoreRank } from '../types';

interface Props {
  percent: number;
  allRanks: ScoreRank[];
  currentRank: ScoreRank;
  label?: string;
}

export default function LernMassband({ percent, allRanks, currentRank, label }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{label ? `${label}-Maßband` : 'Dein Lern-Maßband'}</Text>

      {/* Current rank highlight */}
      <View style={styles.currentRow}>
        <View style={styles.currentIconWrap}>
          <Text style={styles.currentIcon}>{currentRank.icon}</Text>
        </View>
        <View style={styles.currentInfo}>
          <Text style={styles.currentName}>{currentRank.name}</Text>
          <Text style={styles.currentDesc}>{currentRank.description}</Text>
        </View>
        <Text style={styles.currentPercent}>{percent}%</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.trackOuter}>
        <View style={[styles.trackFill, { width: `${Math.min(percent, 100)}%` }]} />
        {/* Tick marks */}
        {allRanks.slice(1).map(rank => (
          <View
            key={rank.id}
            style={[styles.tick, { left: `${rank.minPercent}%` }]}
          />
        ))}
        {/* Position marker */}
        <View style={[styles.marker, { left: `${Math.min(percent, 100)}%` }]}>
          <View style={styles.markerOuter}>
            <View style={styles.markerInner} />
          </View>
        </View>
      </View>

      {/* Rank labels */}
      <View style={styles.ranksRow}>
        {allRanks.map(rank => {
          const width = rank.maxPercent > 100 ? 100 - rank.minPercent : rank.maxPercent - rank.minPercent;
          const isCurrent = rank.current;
          return (
            <View
              key={rank.id}
              style={[styles.rankItem, { width: `${width}%`, left: `${rank.minPercent}%` }]}
            >
              <Text style={[
                styles.rankIcon,
                !isCurrent && !rank.earned && { opacity: 0.3 },
                !isCurrent && rank.earned && { opacity: 0.7 },
              ]}>
                {rank.icon}
              </Text>
              <Text style={[
                styles.rankName,
                isCurrent && { color: '#d97706' },
                !isCurrent && rank.earned && { color: '#6b7280' },
                !isCurrent && !rank.earned && { color: '#d1d5db' },
              ]} numberOfLines={1}>
                {rank.name}
              </Text>
            </View>
          );
        })}
      </View>
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
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  currentIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentIcon: {
    fontSize: 24,
  },
  currentInfo: {
    flex: 1,
  },
  currentName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  currentDesc: {
    fontSize: 13,
    color: '#9ca3af',
  },
  currentPercent: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f59e0b',
  },
  trackOuter: {
    height: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    overflow: 'visible',
    position: 'relative',
  },
  trackFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: '#f59e0b',
  },
  tick: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: 12,
    backgroundColor: '#d1d5db',
  },
  marker: {
    position: 'absolute',
    top: -4,
    marginLeft: -10,
  },
  markerOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f59e0b',
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  markerInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  ranksRow: {
    position: 'relative',
    height: 48,
    marginTop: 12,
  },
  rankItem: {
    position: 'absolute',
    alignItems: 'center',
  },
  rankIcon: {
    fontSize: 16,
  },
  rankName: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
});
