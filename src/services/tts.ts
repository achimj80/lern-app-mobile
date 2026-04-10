import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { API_BASE } from '../config';
import { getAuthToken } from './storage';

// === State ===

let currentAudio: HTMLAudioElement | null = null;
let currentSound: Audio.Sound | null = null;
let stopRequested = false;

// === Chunking (matches web app) ===

const CHUNK_THRESHOLD = 40;

function splitIntoChunks(sentence: string): string[] {
  if (sentence.length <= CHUNK_THRESHOLD) return [sentence];

  const parts = sentence.split(
    /(?<=,\s)|(?<=;\s)|(?=\s(?:und|oder|aber|weil|dass|wenn|denn|damit|sondern)\s)/i
  );

  const chunks: string[] = [];
  let current = '';
  for (const part of parts) {
    if (current.length + part.length <= CHUNK_THRESHOLD || current.length === 0) {
      current += part;
    } else {
      chunks.push(current.trim());
      current = part;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks.length > 0 ? chunks : [sentence];
}

// === Play single chunk ===

async function playChunk(text: string, rate: number): Promise<void> {
  const token = await getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/tts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text, rate }),
  });
  if (!res.ok) throw new Error('TTS failed');
  const data = await res.json();
  const audioContent = data.audioContent || data.audio;
  if (!audioContent) throw new Error('No audio content');

  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
      }
      const audio = new window.Audio(`data:audio/mp3;base64,${audioContent}`);
      currentAudio = audio;
      audio.onended = () => {
        currentAudio = null;
        resolve();
      };
      audio.onerror = () => {
        currentAudio = null;
        reject(new Error('Audio playback failed'));
      };
      audio.play().catch((e) => {
        currentAudio = null;
        reject(e);
      });
    });
  } else {
    // Native: expo-av
    if (currentSound) {
      await currentSound.unloadAsync().catch(() => {});
      currentSound = null;
    }
    const { sound } = await Audio.Sound.createAsync(
      { uri: `data:audio/mp3;base64,${audioContent}` },
      { shouldPlay: true }
    );
    currentSound = sound;

    return new Promise((resolve) => {
      // Hard timeout — audio should never play longer than 30s
      const hardTimeout = setTimeout(() => {
        currentSound = null;
        resolve();
      }, 30000);

      sound.setOnPlaybackStatusUpdate((status) => {
        if ('didJustFinish' in status && status.didJustFinish) {
          clearTimeout(hardTimeout);
          currentSound = null;
          resolve();
        }
      });
    });
  }
}

// === Public API ===

export async function speakSentence(sentence: string, rate: number = 0.85): Promise<void> {
  stopRequested = false;
  const chunks = splitIntoChunks(sentence);

  for (let i = 0; i < chunks.length; i++) {
    if (stopRequested) return;
    await playChunk(chunks[i], rate);
    // Brief pause between chunks (matches web app)
    if (i < chunks.length - 1 && !stopRequested) {
      await new Promise(resolve => setTimeout(resolve, 600));
    }
  }
}

export function stopSpeaking(): void {
  stopRequested = true;
  if (Platform.OS === 'web') {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
  } else {
    if (currentSound) {
      currentSound.stopAsync().catch(() => {});
      currentSound = null;
    }
  }
}
