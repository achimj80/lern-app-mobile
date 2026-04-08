import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Dictation, DictationSession, ProgressEntry } from '../types';
import { getAllDictations, getAllSessions, getProgress, UserProfile, logout } from '../services/storage';
import { calculateStreak, getTodayPracticeCount, calculateOverallStats } from '../services/gamification';
import { RootStackParamList } from '../navigation';

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
  user: UserProfile;
  onLogout: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'Guten Morgen';
  if (hour < 14) return 'Hallo';
  if (hour < 18) return 'Guten Nachmittag';
  return 'Guten Abend';
}

export default function HomeScreen({ navigation, user, onLogout }: Props) {
  const [dictations, setDictations] = useState<Dictation[]>([]);
  const [sessions, setSessions] = useState<DictationSession[]>([]);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [d, s, p] = await Promise.all([
      getAllDictations(),
      getAllSessions(),
      getProgress(),
    ]);
    setDictations(d);
    setSessions(s);
    setProgress(p);
    setLoaded(true);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleLogout = async () => {
    await logout();
    onLogout();
  };

  const streak = calculateStreak(progress);
  const diktatCount = getTodayPracticeCount(progress, 'diktat');
  const matheCount = getTodayPracticeCount(progress, 'mathe');
  const diktatStats = calculateOverallStats(progress, 'diktat');
  const matheStats = calculateOverallStats(progress, 'mathe');

  const diktatList = dictations.filter(d => d.type !== 'mathe');
  const matheList = dictations.filter(d => d.type === 'mathe');

  if (!loaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  const renderDictation = ({ item }: { item: Dictation }) => {
    const isMath = item.type === 'mathe';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('Practice', { id: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardRow}>
          <View style={[styles.cardIcon, isMath ? styles.cardIconMath : styles.cardIconDiktat]}>
            <Text style={styles.cardIconText}>{isMath ? '🔢' : '📖'}</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.cardSub}>
              {item.sentences.length} {isMath ? 'Aufgaben' : 'Sätze'}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>{user.name} {user.icon}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Abmelden</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>🔥</Text>
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>Tage</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>📖</Text>
          <Text style={styles.statValue}>{diktatStats.overallPercent}%</Text>
          <Text style={styles.statLabel}>Diktat</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>🔢</Text>
          <Text style={styles.statValue}>{matheStats.overallPercent}%</Text>
          <Text style={styles.statLabel}>Mathe</Text>
        </View>
      </View>

      {/* Daily Goal */}
      <View style={styles.dailyGoal}>
        <Text style={styles.sectionTitle}>Tagesziel</Text>
        <View style={styles.goalRow}>
          <View style={styles.goalItem}>
            <Text style={styles.goalEmoji}>{diktatCount >= 1 ? '✅' : '⭕'}</Text>
            <Text style={styles.goalText}>Diktat</Text>
          </View>
          <View style={styles.goalItem}>
            <Text style={styles.goalEmoji}>{matheCount >= 1 ? '✅' : '⭕'}</Text>
            <Text style={styles.goalText}>Mathe</Text>
          </View>
        </View>
      </View>

      {/* Diktat Section */}
      {diktatList.length > 0 && (
        <Text style={styles.sectionTitle}>Diktate</Text>
      )}
    </View>
  );

  const allItems = [...diktatList, ...(matheList.length > 0 ? [{ id: '__mathe_header__' } as Dictation] : []), ...matheList];

  return (
    <FlatList
      style={styles.container}
      data={dictations}
      renderItem={renderDictation}
      keyExtractor={item => item.id}
      ListHeaderComponent={ListHeader}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffbeb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    marginTop: 8,
  },
  greeting: {
    fontSize: 16,
    color: '#92400e',
  },
  userName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#78350f',
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
  },
  logoutText: {
    color: '#92400e',
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  dailyGoal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  goalItem: {
    alignItems: 'center',
    gap: 4,
  },
  goalEmoji: {
    fontSize: 32,
  },
  goalText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#78350f',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardIconDiktat: {
    backgroundColor: '#fef3c7',
  },
  cardIconMath: {
    backgroundColor: '#dbeafe',
  },
  cardIconText: {
    fontSize: 22,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
  },
  cardSub: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: '#f59e0b',
    fontWeight: '600',
  },
});
