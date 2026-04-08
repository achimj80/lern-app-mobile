import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
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
  const [showKids, setShowKids] = useState(false);

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
  const todayCount = getTodayPracticeCount(progress);
  const todayDiktat = getTodayPracticeCount(progress, 'diktat');
  const todayMathe = getTodayPracticeCount(progress, 'mathe');
  const diktatStats = calculateOverallStats(progress, 'diktat');
  const matheStats = calculateOverallStats(progress, 'mathe');
  const hasStartedDiktat = diktatStats.totalWords > 0;
  const hasStartedMathe = matheStats.totalWords > 0;
  const hasStarted = hasStartedDiktat || hasStartedMathe;

  // === MAIN SCREEN (choose mode) ===
  if (!showKids) {
    return (
      <View style={styles.mainContainer}>
        <View style={styles.mainContent}>
          {/* User avatar */}
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{user.icon}</Text>
          </View>
          <Text style={styles.mainGreeting}>
            {getGreeting()}, {user.name}!
          </Text>
          <Text style={styles.mainSub}>Was möchtest du machen?</Text>

          {/* Big practice button */}
          <TouchableOpacity
            style={styles.bigButton}
            onPress={() => setShowKids(true)}
            activeOpacity={0.9}
          >
            <Text style={styles.bigButtonEmoji}>📝</Text>
            <Text style={styles.bigButtonText}>Übung starten</Text>
          </TouchableOpacity>

          {/* Parent area button */}
          <TouchableOpacity
            style={styles.parentButton}
            onPress={() => navigation.navigate('Parent')}
            activeOpacity={0.8}
          >
            <Text style={styles.parentButtonEmoji}>⚙️</Text>
            <Text style={styles.parentButtonText}>Elternbereich</Text>
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity onPress={handleLogout} style={styles.logoutLink}>
            <Text style={styles.logoutText}>Abmelden</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // === KID MODE ===
  const renderDictation = ({ item }: { item: Dictation }) => {
    const isMath = item.type === 'mathe';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('Practice', { id: item.id })}
        activeOpacity={0.8}
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
          <View style={styles.cardChevronWrap}>
            <Text style={styles.cardChevron}>›</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => setShowKids(false)} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.topBarRight}>
          {loaded && hasStarted && (
            <View style={styles.percentBadge}>
              {hasStartedDiktat && (
                <Text style={styles.percentDiktat}>📖{diktatStats.overallPercent}%</Text>
              )}
              {hasStartedDiktat && hasStartedMathe && (
                <Text style={styles.percentDivider}>|</Text>
              )}
              {hasStartedMathe && (
                <Text style={styles.percentMathe}>🔢{matheStats.overallPercent}%</Text>
              )}
            </View>
          )}
          <TouchableOpacity onPress={handleLogout} style={styles.backButton}>
            <Text style={styles.logoutIcon}>↗</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Greeting */}
      <View style={styles.greetingSection}>
        <Text style={styles.greetingTitle}>
          {getGreeting()}, {user.name}! 👋
        </Text>
        <Text style={styles.greetingSub}>
          {todayCount > 0
            ? `Heute schon ${todayCount} ${todayCount === 1 ? 'Übung' : 'Übungen'} gemacht!`
            : 'Bereit zum Üben?'}
        </Text>
      </View>

      {/* Daily Goal */}
      {loaded && (
        <View style={{ marginBottom: 16 }}>
          <DailyGoal diktatCount={todayDiktat} matheCount={todayMathe} />
        </View>
      )}

      {/* Maßbänder */}
      {loaded && (
        <View style={{ marginBottom: 12 }}>
          <LernMassband
            percent={diktatStats.overallPercent}
            allRanks={diktatStats.allRanks}
            currentRank={diktatStats.currentRank}
            label="Diktat"
          />
        </View>
      )}
      {loaded && (
        <View style={{ marginBottom: 12 }}>
          <LernMassband
            percent={matheStats.overallPercent}
            allRanks={matheStats.allRanks}
            currentRank={matheStats.currentRank}
            label="Mathe"
          />
        </View>
      )}

      {/* Streak */}
      {loaded && hasStarted && streak > 0 && (
        <Text style={styles.streakText}>🔥 {streak} {streak === 1 ? 'Tag' : 'Tage'} in Folge</Text>
      )}

      {/* Section title */}
      <Text style={styles.sectionTitle}>Übungen</Text>

      {dictations.length === 0 && loaded && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyTitle}>Noch keine Übungen da.</Text>
          <Text style={styles.emptySub}>Bitte einen Erwachsenen, ein Diktat anzulegen.</Text>
        </View>
      )}
    </View>
  );

  if (!loaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.kidContainer}
      data={dictations}
      renderItem={renderDictation}
      keyExtractor={item => item.id}
      ListHeaderComponent={ListHeader}
      contentContainerStyle={styles.kidContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  // === Main Screen ===
  mainContainer: {
    flex: 1,
    backgroundColor: '#fffbeb',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  mainContent: {
    alignItems: 'center',
    maxWidth: 360,
    alignSelf: 'center',
    width: '100%',
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarText: {
    fontSize: 48,
  },
  mainGreeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 4,
  },
  mainSub: {
    fontSize: 18,
    color: '#9ca3af',
    marginBottom: 32,
  },
  bigButton: {
    width: '100%',
    paddingVertical: 28,
    borderRadius: 24,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 16,
  },
  bigButtonEmoji: {
    fontSize: 36,
  },
  bigButtonText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  parentButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    marginBottom: 12,
  },
  parentButtonEmoji: {
    fontSize: 20,
  },
  parentButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6b7280',
  },
  logoutLink: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },

  // === Kid Mode ===
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
  },
  kidContainer: {
    flex: 1,
    backgroundColor: '#fffbeb',
  },
  kidContent: {
    padding: 16,
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  backButtonText: {
    fontSize: 24,
    color: '#9ca3af',
    fontWeight: '600',
    marginTop: -2,
  },
  logoutIcon: {
    fontSize: 18,
    color: '#9ca3af',
  },
  percentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  percentDiktat: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d97706',
  },
  percentDivider: {
    fontSize: 12,
    color: '#d1d5db',
  },
  percentMathe: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  greetingSection: {
    marginBottom: 20,
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#374151',
  },
  greetingSub: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 2,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ea580c',
    textAlign: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: '600',
  },
  emptySub: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 4,
  },

  // === Dictation cards ===
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  cardSub: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 2,
  },
  cardChevronWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fffbeb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardChevron: {
    fontSize: 22,
    color: '#f59e0b',
    fontWeight: '600',
  },
});
