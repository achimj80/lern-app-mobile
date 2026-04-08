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
import DailyGoal from '../components/DailyGoal';
import LernMassband from '../components/LernMassband';
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
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => navigation.navigate('Parent')} style={styles.parentButton}>
            <Text style={styles.parentButtonText}>Eltern</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Abmelden</Text>
          </TouchableOpacity>
        </View>
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
      <View style={{ marginBottom: 24 }}>
        <DailyGoal diktatCount={diktatCount} matheCount={matheCount} />
      </View>

      {/* Maßbänder */}
      {diktatStats.totalWords > 0 && (
        <View style={{ marginBottom: 16 }}>
          <LernMassband
            ranks={diktatStats.allRanks}
            currentPercent={diktatStats.overallPercent}
            label="Diktat-Maßband"
          />
        </View>
      )}
      {matheStats.totalWords > 0 && (
        <View style={{ marginBottom: 24 }}>
          <LernMassband
            ranks={matheStats.allRanks}
            currentPercent={matheStats.overallPercent}
            label="Mathe-Maßband"
          />
        </View>
      )}

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
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  parentButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
  },
  parentButtonText: {
    color: '#1d4ed8',
    fontSize: 14,
    fontWeight: '600',
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
