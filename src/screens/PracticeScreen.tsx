import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Dictation, DictationSession, SpellingError } from '../types';
import { getDictation, createSession, updateSession, addProgressEntry, getAuthToken } from '../services/storage';
import { speakSentence, stopSpeaking } from '../services/tts';
import { API_BASE } from '../config';
import { RootStackParamList } from '../navigation';
import StepIndicator from '../components/StepIndicator';

type Phase = 'ready' | 'dictating' | 'photo' | 'analyzing' | 'review';

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Practice'>;
  route: RouteProp<RootStackParamList, 'Practice'>;
}

export default function PracticeScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const [dictation, setDictation] = useState<Dictation | null>(null);
  const [phase, setPhase] = useState<Phase>('ready');
  const [currentSentence, setCurrentSentence] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analyzeSeconds, setAnalyzeSeconds] = useState(0);

  const isMath = dictation?.type === 'mathe';
  const sentences = dictation?.sentences || [];

  useEffect(() => {
    loadDictation();
    return () => { stopSpeaking(); };
  }, []);

  const loadDictation = async () => {
    const d = await getDictation(id);
    if (!d) {
      Alert.alert('Fehler', 'Übung nicht gefunden');
      navigation.goBack();
      return;
    }
    setDictation(d);
  };

  // Play a sentence via TTS service (with chunking, like web app)
  const playAudio = useCallback(async (text: string, rate: number = 0.85) => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    try {
      await speakSentence(text, rate);
    } catch (e) {
      if (__DEV__) console.warn('TTS error:', e);
    }
    setIsSpeaking(false);
    setHasPlayedOnce(true);
  }, [isSpeaking]);

  // Timer for analyzing phase
  useEffect(() => {
    if (phase !== 'analyzing') return;
    const interval = setInterval(() => setAnalyzeSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Auto-play when entering dictating phase or moving to next sentence
  useEffect(() => {
    if (phase === 'dictating' && dictation && sentences.length > 0) {
      const timer = setTimeout(() => {
        playAudio(sentences[currentSentence], isMath ? 1.0 : 0.85);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [phase, currentSentence]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStart = async () => {
    if (!dictation) return;
    try {
      const session = await createSession(dictation.id);
      setSessionId(session.id);
      setPhase('dictating');
    } catch (e) {
      if (__DEV__) console.warn('createSession error:', e);
      Alert.alert('Fehler', 'Die Übung konnte nicht gestartet werden. Bitte melde dich neu an.');
    }
  };

  const handleRepeat = () => {
    if (!dictation || currentSentence >= sentences.length) return;
    stopSpeaking();
    setIsSpeaking(false);
    setTimeout(() => {
      playAudio(sentences[currentSentence], isMath ? 1.0 : 0.85);
    }, 100);
  };

  const handlePrevSentence = () => {
    if (currentSentence > 0) {
      stopSpeaking();
      setIsSpeaking(false);
      setHasPlayedOnce(false);
      setCurrentSentence(prev => prev - 1);
    }
  };

  const handleNextSentence = () => {
    if (!dictation) return;
    stopSpeaking();
    setIsSpeaking(false);

    if (currentSentence < sentences.length - 1) {
      setHasPlayedOnce(false);
      setCurrentSentence(prev => prev + 1);
    } else {
      // Last sentence done -> photo phase
      setPhase('photo');
    }
  };

  const handleClose = () => {
    stopSpeaking();
    navigation.goBack();
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Berechtigung', 'Kamera-Zugriff wird benötigt');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets[0].base64) return;
    setImageUri(result.assets[0].uri);
    setImageBase64(result.assets[0].base64);
  };

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets[0].base64) return;
    setImageUri(result.assets[0].uri);
    setImageBase64(result.assets[0].base64);
  };

  const handleAnalyzePhoto = async () => {
    if (!imageBase64 || !dictation) return;
    setPhase('analyzing');
    setAnalyzeSeconds(0);

    const totalWords = dictation.text.split(/\s+/).length;
    const imageDataUri = `data:image/jpeg;base64,${imageBase64}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const token = await getAuthToken();
      const authHeader: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) authHeader['Authorization'] = `Bearer ${token}`;

      // Try combined AI analysis
      const res = await fetch(`${API_BASE}/api/analyze-dictation`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({
          image: imageDataUri,
          expectedText: dictation.text,
          type: dictation.type || 'diktat',
        }),
        signal: controller.signal,
      });

      let recognizedText = '';
      let errors: SpellingError[] = [];

      if (res.ok) {
        const data = await res.json();
        recognizedText = data.recognizedText || '';
        if (Array.isArray(data.errors)) {
          errors = data.errors;
        }
      }

      // Fallback: try analyze-photo endpoint
      if (errors.length === 0 && !recognizedText) {
        const res2 = await fetch(`${API_BASE}/api/analyze-photo`, {
          method: 'POST',
          headers: authHeader,
          body: JSON.stringify({
            image: imageBase64,
            expectedText: dictation.text,
            type: dictation.type || 'diktat',
          }),
        });
        if (res2.ok) {
          const data2 = await res2.json();
          recognizedText = data2.recognizedText || '';
          errors = data2.errors || [];
        }
      }

      const score = Math.max(0, Math.round(((totalWords - errors.length) / totalWords) * 100));

      await updateSession(sessionId, {
        completedAt: new Date().toISOString(),
        recognizedText,
        errors,
        score,
      });

      await addProgressEntry({
        sessionId,
        dictationId: dictation.id,
        dictationTitle: dictation.title,
        type: dictation.type || 'diktat',
        date: new Date().toISOString(),
        errorCount: errors.length,
        totalWords,
        errorTypes: [...new Set(errors.map(e => e.type))] as SpellingError['type'][],
      });

      clearTimeout(timeout);
      navigation.replace('Result', { sessionId });
    } catch (e) {
      clearTimeout(timeout);
      const msg = e instanceof Error && e.name === 'AbortError'
        ? 'Die Analyse hat zu lange gedauert. Bitte versuche es nochmal.'
        : 'Die Analyse hat leider nicht geklappt. Bitte versuche es nochmal.';
      Alert.alert('Fehler', msg);
      setPhase('photo');
    }
  };

  // === LOADING ===
  if (!dictation) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  // === PHASE: READY ===
  if (phase === 'ready') {
    const steps = isMath
      ? [
          { icon: '🎧', text: 'Ich lese dir jede Aufgabe vor.' },
          { icon: '✏️', text: 'Schreibe die ganze Rechnung mit Ergebnis auf.' },
          { icon: '👆', text: 'Dann klickst du „Nächste Aufgabe".' },
          { icon: '📸', text: 'Am Ende machst du ein Foto.' },
        ]
      : [
          { icon: '🎧', text: 'Ich lese dir jeden Satz vor.' },
          { icon: '✏️', text: 'Du schreibst ihn auf dein Blatt.' },
          { icon: '👆', text: 'Dann klickst du „Nächster Satz".' },
          { icon: '📸', text: 'Am Ende machst du ein Foto.' },
        ];

    return (
      <View style={styles.center}>
        <TouchableOpacity style={styles.closeButtonTopRight} onPress={handleClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>

        <StepIndicator currentPhase="ready" />

        <View style={[styles.readyIcon, isMath ? styles.readyIconMath : styles.readyIconDiktat]}>
          <Text style={styles.readyEmoji}>{isMath ? '🔢' : '📝'}</Text>
        </View>
        <Text style={styles.readyTitle}>{dictation.title}</Text>
        <Text style={styles.readyInfo}>
          {sentences.length} {isMath ? 'Aufgaben' : 'Sätze'}
        </Text>

        <View style={styles.howItWorks}>
          <Text style={styles.howTitle}>So geht's:</Text>
          {steps.map((step, i) => (
            <View key={i} style={styles.howStep}>
              <View style={styles.howIconWrap}>
                <Text style={styles.howIcon}>{step.icon}</Text>
              </View>
              <Text style={styles.howText}>{step.text}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.startButton} onPress={handleStart}>
          <Text style={styles.startButtonText}>Los geht's!</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // === PHASE: DICTATING ===
  if (phase === 'dictating') {
    const total = sentences.length;
    const isLast = currentSentence === total - 1;
    const progress = ((currentSentence + 1) / total) * 100;

    return (
      <View style={styles.dictatingContainer}>
        {/* Top */}
        <View style={styles.dictatingTop}>
          <StepIndicator currentPhase="dictating" />

          {/* Close button */}
          <TouchableOpacity style={styles.closeButtonTopRight} onPress={handleClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              {isMath ? 'Aufgabe' : 'Satz'} {currentSentence + 1} von {total}
            </Text>
            <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Center: Speaking animation */}
        <View style={styles.dictatingCenter}>
          {isSpeaking ? (
            <>
              <View style={styles.soundBars}>
                {[1, 2, 3, 4, 5, 4, 3].map((h, i) => (
                  <View
                    key={i}
                    style={[styles.soundBar, { height: h * 14 }]}
                  />
                ))}
              </View>
              <Text style={styles.listeningText}>Hör gut zu ...</Text>
            </>
          ) : hasPlayedOnce ? (
            <>
              <Text style={styles.writeEmoji}>✏️</Text>
              <Text style={styles.writeText}>Jetzt schreiben!</Text>
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color="#f59e0b" />
              <Text style={styles.waitingText}>Gleich geht es los ...</Text>
            </>
          )}
        </View>

        {/* Bottom: Buttons */}
        <View style={styles.dictatingBottom}>
          <TouchableOpacity style={styles.repeatButton} onPress={handleRepeat}>
            <Text style={styles.repeatButtonText}>🔊 Nochmal vorlesen</Text>
          </TouchableOpacity>

          <View style={styles.navRow}>
            {currentSentence > 0 && (
              <TouchableOpacity style={styles.prevButton} onPress={handlePrevSentence}>
                <Text style={styles.prevButtonText}>⬅️</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.nextButton, !hasPlayedOnce && styles.nextButtonDisabled]}
              onPress={handleNextSentence}
              disabled={!hasPlayedOnce}
            >
              <Text style={styles.nextButtonText}>
                {isLast
                  ? '✅ Fertig – zum Foto!'
                  : isMath
                    ? '➡️ Nächste Aufgabe'
                    : '➡️ Nächster Satz'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // === PHASE: PHOTO ===
  if (phase === 'photo') {
    return (
      <ScrollView style={styles.photoScroll} contentContainerStyle={styles.photoContainer}>
        <StepIndicator currentPhase="photo" />

        <TouchableOpacity style={styles.closeButtonTopRight} onPress={handleClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.photoIconWrap}>
          <Text style={styles.photoIcon}>📸</Text>
        </View>
        <Text style={styles.photoTitle}>Geschafft!</Text>
        <Text style={styles.photoSub}>Mach jetzt ein Foto von deiner Arbeit.</Text>

        {/* Preview */}
        {imageUri && (
          <View style={styles.previewWrap}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
            <View style={styles.previewButtons}>
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={() => { setImageUri(null); setImageBase64(null); }}
              >
                <Text style={styles.retakeButtonText}>🔄 Nochmal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.checkButton} onPress={handleAnalyzePhoto}>
                <Text style={styles.checkButtonText}>✨ Prüfen!</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Buttons to take/pick photo */}
        {!imageUri && (
          <View style={styles.photoActions}>
            {/* Tips */}
            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>💡 Tipps für ein gutes Foto:</Text>
              <Text style={styles.tipLine}>☀️ Gutes Licht — kein Schatten auf dem Blatt</Text>
              <Text style={styles.tipLine}>📐 Blatt gerade und ganz im Bild</Text>
              <Text style={styles.tipLine}>📏 Nah genug — Schrift muss gut lesbar sein</Text>
            </View>

            <TouchableOpacity style={styles.cameraButton} onPress={handleTakePhoto}>
              <Text style={styles.cameraButtonText}>📷 Foto aufnehmen</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.galleryButton} onPress={handlePickPhoto}>
              <Text style={styles.galleryButtonText}>📁 Bild auswählen</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  }

  // === PHASE: ANALYZING ===
  if (phase === 'analyzing') {
    return (
      <View style={styles.center}>
        <StepIndicator currentPhase="analyzing" />
        <View style={styles.analyzingSpinner}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.analyzingEmoji}>🔍</Text>
        </View>
        <Text style={styles.analyzingTitle}>Ich prüfe deine Arbeit</Text>
        <Text style={styles.analyzingSub}>
          {analyzeSeconds < 10
            ? 'Das dauert einen kleinen Moment ...'
            : analyzeSeconds < 30
              ? 'Die KI liest deine Handschrift ...'
              : 'Fast fertig, noch einen Moment ...'}
        </Text>
        <Text style={styles.analyzingTimer}>{analyzeSeconds}s</Text>
        {imageUri && (
          <Image
            source={{ uri: imageUri }}
            style={styles.analyzingPreview}
            resizeMode="contain"
          />
        )}
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    padding: 24,
  },

  // === READY ===
  readyIcon: {
    width: 96,
    height: 96,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  readyIconDiktat: {
    backgroundColor: '#fef3c7',
  },
  readyIconMath: {
    backgroundColor: '#dbeafe',
  },
  readyEmoji: {
    fontSize: 48,
  },
  readyTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 4,
  },
  readyInfo: {
    fontSize: 18,
    color: '#9ca3af',
    marginBottom: 24,
  },
  howItWorks: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  howTitle: {
    fontWeight: '700',
    color: '#374151',
    fontSize: 16,
    marginBottom: 12,
  },
  howStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  howIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  howIcon: {
    fontSize: 18,
  },
  howText: {
    fontSize: 16,
    color: '#4b5563',
    flex: 1,
  },
  startButton: {
    width: '100%',
    maxWidth: 340,
    paddingVertical: 22,
    borderRadius: 24,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  startButtonText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },

  // === DICTATING ===
  dictatingContainer: {
    flex: 1,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  dictatingTop: {
    width: '100%',
  },
  closeButtonTopRight: {
    position: 'absolute',
    top: 48,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#9ca3af',
    fontWeight: '700',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f59e0b',
  },
  progressTrack: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 6,
  },

  dictatingCenter: {
    alignItems: 'center',
    gap: 16,
  },
  soundBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 80,
  },
  soundBar: {
    width: 12,
    backgroundColor: '#f59e0b',
    borderRadius: 6,
    opacity: 0.8,
  },
  listeningText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#d97706',
  },
  writeEmoji: {
    fontSize: 64,
  },
  writeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#374151',
  },
  waitingText: {
    fontSize: 20,
    color: '#9ca3af',
    marginTop: 12,
  },

  dictatingBottom: {
    width: '100%',
    gap: 12,
  },
  repeatButton: {
    width: '100%',
    paddingVertical: 20,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    borderWidth: 2,
    borderColor: '#bfdbfe',
    alignItems: 'center',
  },
  repeatButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563eb',
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
  },
  prevButton: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  prevButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6b7280',
  },
  nextButton: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 16,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonDisabled: {
    opacity: 0.4,
  },
  nextButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },

  // === PHOTO ===
  photoScroll: {
    flex: 1,
    backgroundColor: '#fffbeb',
  },
  photoContainer: {
    padding: 24,
    paddingTop: 48,
    alignItems: 'center',
  },
  photoIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  photoIcon: {
    fontSize: 36,
  },
  photoTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 4,
  },
  photoSub: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 24,
  },
  photoActions: {
    width: '100%',
    maxWidth: 340,
    gap: 12,
  },
  tipsCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginBottom: 4,
  },
  tipsTitle: {
    fontWeight: '700',
    color: '#92400e',
    fontSize: 14,
    marginBottom: 8,
  },
  tipLine: {
    fontSize: 14,
    color: '#b45309',
    marginBottom: 4,
  },
  cameraButton: {
    width: '100%',
    paddingVertical: 22,
    borderRadius: 16,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cameraButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  galleryButton: {
    width: '100%',
    paddingVertical: 20,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    borderWidth: 2,
    borderColor: '#bfdbfe',
    alignItems: 'center',
  },
  galleryButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563eb',
  },

  // Preview
  previewWrap: {
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: '#fde68a',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  previewButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  retakeButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  retakeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4b5563',
  },
  checkButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  checkButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },

  // === ANALYZING ===
  analyzingSpinner: {
    width: 96,
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  analyzingEmoji: {
    position: 'absolute',
    fontSize: 36,
  },
  analyzingTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 8,
  },
  analyzingSub: {
    fontSize: 16,
    color: '#9ca3af',
  },
  analyzingTimer: {
    fontSize: 14,
    color: '#d1d5db',
    marginTop: 8,
  },
  analyzingPreview: {
    width: '80%',
    height: 200,
    borderRadius: 16,
    marginTop: 32,
    opacity: 0.5,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
});
