import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { Dictation, DictationSession } from '../types';
import { getDictation, createSession, updateSession, addProgressEntry } from '../services/storage';
import { API_BASE } from '../config';
import { RootStackParamList } from '../navigation';

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Practice'>;
  route: RouteProp<RootStackParamList, 'Practice'>;
}

export default function PracticeScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const [dictation, setDictation] = useState<Dictation | null>(null);
  const [session, setSession] = useState<DictationSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState('');
  const [answers, setAnswers] = useState<string[]>([]);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'practice' | 'submitting'>('loading');
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const isMath = dictation?.type === 'mathe';
  const sentences = dictation?.sentences || [];
  const currentSentence = sentences[currentIndex] || '';

  useEffect(() => {
    loadDictation();
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const loadDictation = async () => {
    const d = await getDictation(id);
    if (!d) {
      Alert.alert('Fehler', 'Übung nicht gefunden');
      navigation.goBack();
      return;
    }
    setDictation(d);
    const s = await createSession(d.id);
    setSession(s);
    setPhase('ready');
  };

  const playAudio = async (text: string, rate: number = 0.85) => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      const res = await fetch(`${API_BASE}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, rate }),
      });
      if (!res.ok) throw new Error('TTS failed');
      const { audio } = await res.json();
      const { sound } = await Audio.Sound.createAsync(
        { uri: `data:audio/mp3;base64,${audio}` },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if ('didJustFinish' in status && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch {
      setIsPlaying(false);
    }
  };

  const handleStart = () => {
    setPhase('practice');
    playAudio(currentSentence, isMath ? 1.0 : 0.85);
  };

  const handleNext = () => {
    const newAnswers = [...answers, input.trim()];
    setAnswers(newAnswers);
    setInput('');

    if (currentIndex < sentences.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      playAudio(sentences[nextIdx], isMath ? 1.0 : 0.85);
    } else {
      submitSession(newAnswers);
    }
  };

  const submitSession = async (finalAnswers: string[]) => {
    if (!session || !dictation) return;
    setPhase('submitting');

    try {
      const recognizedText = finalAnswers.join('\n');
      const res = await fetch(`${API_BASE}/api/analyze-dictation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedText: dictation.text,
          recognizedText,
          type: dictation.type || 'diktat',
        }),
      });
      const analysis = await res.json();

      const score = analysis.score ?? 0;
      const errors = analysis.errors ?? [];

      await updateSession(session.id, {
        completedAt: new Date().toISOString(),
        recognizedText,
        correctedText: analysis.correctedText,
        errors,
        score,
      });

      await addProgressEntry({
        sessionId: session.id,
        dictationId: dictation.id,
        dictationTitle: dictation.title,
        type: dictation.type || 'diktat',
        date: new Date().toISOString(),
        errorCount: errors.length,
        totalWords: dictation.text.split(/\s+/).length,
        errorTypes: errors.map((e: { type: string }) => e.type),
      });

      navigation.replace('Result', { sessionId: session.id });
    } catch {
      Alert.alert('Fehler', 'Auswertung fehlgeschlagen');
      setPhase('practice');
    }
  };

  if (phase === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  if (phase === 'ready') {
    return (
      <View style={styles.center}>
        <Text style={styles.readyEmoji}>{isMath ? '🔢' : '📖'}</Text>
        <Text style={styles.readyTitle}>{dictation?.title}</Text>
        <Text style={styles.readyInfo}>
          {sentences.length} {isMath ? 'Aufgaben' : 'Sätze'}
        </Text>
        <Text style={styles.readyHint}>
          {isMath
            ? 'Du hörst die Aufgabe und tippst die Lösung ein.'
            : 'Du hörst den Satz und schreibst ihn auf.'}
        </Text>
        <TouchableOpacity style={styles.startButton} onPress={handleStart}>
          <Text style={styles.startButtonText}>Los geht's!</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Zurück</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (phase === 'submitting') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.submittingText}>Wird ausgewertet...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.practiceContent}>
      {/* Progress */}
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>
          {isMath ? 'Aufgabe' : 'Satz'} {currentIndex + 1} von {sentences.length}
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${((currentIndex + 1) / sentences.length) * 100}%` }]}
          />
        </View>
      </View>

      {/* Replay Button */}
      <TouchableOpacity
        style={[styles.replayButton, isPlaying && styles.replayButtonPlaying]}
        onPress={() => playAudio(currentSentence, isMath ? 1.0 : 0.85)}
        disabled={isPlaying}
      >
        <Text style={styles.replayEmoji}>{isPlaying ? '🔊' : '🔈'}</Text>
        <Text style={styles.replayText}>
          {isPlaying ? 'Wird vorgelesen...' : 'Nochmal anhören'}
        </Text>
      </TouchableOpacity>

      {/* Input */}
      <TextInput
        style={styles.textInput}
        placeholder={isMath ? 'Deine Lösung...' : 'Schreibe den Satz...'}
        placeholderTextColor="#9ca3af"
        value={input}
        onChangeText={setInput}
        multiline={!isMath}
        autoCorrect={false}
        autoCapitalize={isMath ? 'none' : 'sentences'}
        keyboardType={isMath ? 'default' : 'default'}
      />

      {/* Next / Finish */}
      <TouchableOpacity
        style={[styles.nextButton, !input.trim() && styles.nextButtonDisabled]}
        onPress={handleNext}
        disabled={!input.trim()}
      >
        <Text style={styles.nextButtonText}>
          {currentIndex < sentences.length - 1
            ? (isMath ? 'Nächste Aufgabe' : 'Nächster Satz')
            : 'Fertig!'}
        </Text>
      </TouchableOpacity>
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
    padding: 24,
  },
  practiceContent: {
    padding: 20,
    paddingTop: 16,
  },
  readyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  readyTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#78350f',
    textAlign: 'center',
  },
  readyInfo: {
    fontSize: 16,
    color: '#92400e',
    marginTop: 8,
  },
  readyHint: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  startButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 16,
    paddingHorizontal: 48,
    paddingVertical: 16,
    marginTop: 32,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  backButton: {
    marginTop: 16,
    padding: 12,
  },
  backButtonText: {
    color: '#92400e',
    fontSize: 16,
  },
  submittingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#92400e',
  },
  progressRow: {
    marginBottom: 24,
  },
  progressText: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 4,
  },
  replayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  replayButtonPlaying: {
    backgroundColor: '#fef3c7',
  },
  replayEmoji: {
    fontSize: 28,
  },
  replayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    fontSize: 18,
    borderWidth: 2,
    borderColor: '#fde68a',
    color: '#1f2937',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  nextButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.4,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
