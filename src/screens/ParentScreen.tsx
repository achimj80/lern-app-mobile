import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Dictation, ProgressEntry, DictationSession } from '../types';
import {
  getAllDictations,
  getAllSessions,
  getProgress,
  UserProfile,
  invalidateDictationsCache,
  getAuthToken,
} from '../services/storage';
import { calculateOverallStats, calculateStreak } from '../services/gamification';
import LernMassband from '../components/LernMassband';
import { API_BASE } from '../config';
import { RootStackParamList } from '../navigation';

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Parent'>;
  user: UserProfile;
}

export default function ParentScreen({ navigation, user }: Props) {
  const [dictations, setDictations] = useState<Dictation[]>([]);
  const [sessions, setSessions] = useState<DictationSession[]>([]);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Diktat creator
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [grade, setGrade] = useState(2);
  const [showCreator, setShowCreator] = useState(false);

  // Math generator
  const [showMathGen, setShowMathGen] = useState(false);
  const [mathOp, setMathOp] = useState('mixed');
  const [mathCount, setMathCount] = useState(5);
  const [mathDifficulty, setMathDifficulty] = useState(2);
  const [isGeneratingMath, setIsGeneratingMath] = useState(false);

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
    invalidateDictationsCache();
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleSaveDictation = async () => {
    if (!title.trim() || !text.trim()) return;
    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(`${API_BASE}/api/db`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          table: 'dictations',
          data: {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2),
            title: title.trim(),
            grade,
            type: 'diktat',
            focusAreas: [],
            text: text.trim(),
            sentences: text.trim().split(/(?<=[.!?])\s+/).filter(Boolean),
            userId: user.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      });
      setTitle('');
      setText('');
      setShowCreator(false);
      invalidateDictationsCache();
      await loadData();
    } catch {
      Alert.alert('Fehler', 'Speichern fehlgeschlagen');
    }
  };

  const handleGenerateMath = async () => {
    setIsGeneratingMath(true);
    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/generate-math`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ grade, count: mathCount, operation: mathOp, difficulty: mathDifficulty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const opLabels: Record<string, string> = { addition: 'Plus', subtraction: 'Minus', multiplication: 'Mal', mixed: 'Gemischt' };
      await fetch(`${API_BASE}/api/db`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          table: 'dictations',
          data: {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2),
            title: `Mathe ${opLabels[mathOp]} (Klasse ${grade})`,
            grade,
            type: 'mathe',
            focusAreas: [mathOp],
            text: data.text,
            sentences: data.sentences,
            userId: user.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      });
      setShowMathGen(false);
      invalidateDictationsCache();
      await loadData();
    } catch {
      Alert.alert('Fehler', 'Generierung fehlgeschlagen');
    } finally {
      setIsGeneratingMath(false);
    }
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Löschen', `"${title}" wirklich löschen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          const token = await getAuthToken();
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;

          await fetch(`${API_BASE}/api/db`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ table: 'dictations', id, data: { archived: true } }),
          });
          invalidateDictationsCache();
          await loadData();
        },
      },
    ]);
  };

  const diktatStats = calculateOverallStats(progress, 'diktat');
  const matheStats = calculateOverallStats(progress, 'mathe');
  const streak = calculateStreak(progress);

  if (!loaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />}
    >
      {/* Stats Overview */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>🔥 {streak}</Text>
          <Text style={styles.statLabel}>Tage Streak</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>📖 {diktatStats.overallPercent}%</Text>
          <Text style={styles.statLabel}>Diktat</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>🔢 {matheStats.overallPercent}%</Text>
          <Text style={styles.statLabel}>Mathe</Text>
        </View>
      </View>

      {/* Maßbänder */}
      <View style={{ marginBottom: 12 }}>
        <LernMassband
          percent={diktatStats.overallPercent}
          allRanks={diktatStats.allRanks}
          currentRank={diktatStats.currentRank}
          label="Diktat"
        />
      </View>
      <View style={{ marginBottom: 24 }}>
        <LernMassband
          percent={matheStats.overallPercent}
          allRanks={matheStats.allRanks}
          currentRank={matheStats.currentRank}
          label="Mathe"
        />
      </View>

      {/* Create Buttons */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => { setShowCreator(!showCreator); setShowMathGen(false); }}
      >
        <Text style={styles.createButtonText}>{showCreator ? '✕ Abbrechen' : '📖 Diktat erstellen'}</Text>
      </TouchableOpacity>

      {showCreator && (
        <View style={styles.creatorCard}>
          <TextInput style={styles.input} placeholder="Titel" value={title} onChangeText={setTitle} placeholderTextColor="#9ca3af" />
          <TextInput
            style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]}
            placeholder="Diktattext eingeben..."
            value={text}
            onChangeText={setText}
            multiline
            placeholderTextColor="#9ca3af"
          />
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveDictation} disabled={!title.trim() || !text.trim()}>
            <Text style={styles.saveButtonText}>Speichern</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[styles.createButton, styles.createButtonMath]}
        onPress={() => { setShowMathGen(!showMathGen); setShowCreator(false); }}
      >
        <Text style={styles.createButtonText}>{showMathGen ? '✕ Abbrechen' : '🔢 Mathe-Aufgaben erstellen'}</Text>
      </TouchableOpacity>

      {showMathGen && (
        <View style={styles.creatorCard}>
          <Text style={styles.creatorLabel}>Rechenart</Text>
          <View style={styles.opRow}>
            {['addition', 'subtraction', 'multiplication', 'mixed'].map(op => (
              <TouchableOpacity
                key={op}
                style={[styles.opButton, mathOp === op && styles.opButtonActive]}
                onPress={() => setMathOp(op)}
              >
                <Text style={[styles.opButtonText, mathOp === op && styles.opButtonTextActive]}>
                  {op === 'addition' ? '+' : op === 'subtraction' ? '−' : op === 'multiplication' ? '×' : 'Mix'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.creatorLabel}>Schwierigkeit</Text>
          <View style={styles.opRow}>
            {[1, 2, 3].map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.opButton, mathDifficulty === d && styles.opButtonActive]}
                onPress={() => setMathDifficulty(d)}
              >
                <Text style={[styles.opButtonText, mathDifficulty === d && styles.opButtonTextActive]}>
                  {d === 1 ? 'Leicht' : d === 2 ? 'Mittel' : 'Schwer'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleGenerateMath} disabled={isGeneratingMath}>
            {isGeneratingMath ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Generieren</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Dictation List */}
      <Text style={styles.sectionTitle}>Gespeicherte Übungen</Text>
      {dictations.map(d => (
        <View key={d.id} style={styles.dictCard}>
          <Text style={styles.dictTitle}>{d.title}</Text>
          <Text style={styles.dictSub}>
            {d.type === 'mathe' ? '🔢' : '📖'} Klasse {d.grade} • {d.sentences.length} {d.type === 'mathe' ? 'Aufgaben' : 'Sätze'}
          </Text>
          <Text style={styles.dictPreview} numberOfLines={2}>{d.text}</Text>
          <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(d.id, d.title)}>
            <Text style={styles.deleteButtonText}>🗑️ Löschen</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  createButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  createButtonMath: {
    backgroundColor: '#3b82f6',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  creatorCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  creatorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    color: '#1f2937',
  },
  opRow: {
    flexDirection: 'row',
    gap: 8,
  },
  opButton: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  opButtonActive: {
    backgroundColor: '#3b82f6',
  },
  opButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  opButtonTextActive: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 12,
  },
  dictCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dictTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
  },
  dictSub: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
  },
  dictPreview: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
    lineHeight: 18,
  },
  deleteButton: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#dc2626',
    fontWeight: '600',
  },
});
