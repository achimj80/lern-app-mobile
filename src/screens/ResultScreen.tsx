import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { DictationSession, Dictation } from '../types';
import { getSession, getDictation, getProgress } from '../services/storage';
import { calculateOverallStats } from '../services/gamification';
import { RootStackParamList } from '../navigation';

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Result'>;
  route: RouteProp<RootStackParamList, 'Result'>;
}

function getScoreSpeech(score: number, errorCount: number): string {
  if (score >= 100) return 'Wow, das ist perfekt! Kein einziger Fehler!';
  if (score >= 95) return `${score} Prozent! Das ist fast perfekt! Nur ${errorCount === 1 ? 'ein kleiner Fehler' : `${errorCount} kleine Fehler`}.`;
  if (score >= 80) return `${score} Prozent! Gut gemacht! ${errorCount} ${errorCount === 1 ? 'Fehler' : 'Fehler'} — das kriegen wir hin!`;
  if (score >= 60) return `${score} Prozent. Nicht schlecht, aber da geht noch was! Übung macht den Meister.`;
  return `${score} Prozent. Das wird besser mit Übung! Nicht aufgeben!`;
}

function getScoreEmoji(score: number): string {
  if (score >= 100) return '🌟';
  if (score >= 90) return '🎉';
  if (score >= 80) return '👍';
  if (score >= 60) return '💪';
  return '📚';
}

export default function ResultScreen({ navigation, route }: Props) {
  const { sessionId } = route.params;
  const [session, setSession] = useState<DictationSession | null>(null);
  const [dictation, setDictation] = useState<Dictation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResult();
  }, []);

  const loadResult = async () => {
    const s = await getSession(sessionId);
    if (s) {
      setSession(s);
      const d = await getDictation(s.dictationId);
      setDictation(d || null);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Ergebnis nicht gefunden</Text>
      </View>
    );
  }

  const score = session.score ?? 0;
  const errorCount = session.errors.length;
  const isMath = dictation?.type === 'mathe';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Score */}
      <View style={styles.scoreCard}>
        <Text style={styles.scoreEmoji}>{getScoreEmoji(score)}</Text>
        <Text style={styles.scoreValue}>{score}%</Text>
        <Text style={styles.scoreSpeech}>{getScoreSpeech(score, errorCount)}</Text>
      </View>

      {/* Error Summary */}
      {errorCount > 0 && (
        <View style={styles.errorsCard}>
          <Text style={styles.errorsTitle}>
            {errorCount} {errorCount === 1 ? 'Fehler' : 'Fehler'}
          </Text>
          {session.errors.map((err, i) => (
            <View key={i} style={styles.errorRow}>
              <View style={styles.errorBadge}>
                <Text style={styles.errorExpected}>{err.expected}</Text>
                <Text style={styles.errorArrow}>→</Text>
                <Text style={styles.errorActual}>{err.actual}</Text>
              </View>
              <Text style={styles.errorExplanation}>{err.explanation}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.popToTop()}
      >
        <Text style={styles.primaryButtonText}>Zurück zur Übersicht</Text>
      </TouchableOpacity>

      {dictation && (
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            navigation.replace('Practice', { id: dictation.id });
          }}
        >
          <Text style={styles.secondaryButtonText}>Nochmal üben</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffbeb',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
  },
  scoreCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  scoreEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: '900',
    color: '#78350f',
  },
  scoreSpeech: {
    fontSize: 16,
    color: '#92400e',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  errorsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  errorsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 16,
  },
  errorRow: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  errorExpected: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16a34a',
  },
  errorArrow: {
    fontSize: 14,
    color: '#9ca3af',
  },
  errorActual: {
    fontSize: 16,
    fontWeight: '700',
    color: '#dc2626',
    textDecorationLine: 'line-through',
  },
  errorExplanation: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#fef3c7',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#92400e',
    fontSize: 16,
    fontWeight: '600',
  },
});
