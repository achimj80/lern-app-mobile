export type DictationType = 'diktat' | 'mathe';

export interface Dictation {
  id: string;
  title: string;
  grade: number;
  type: DictationType;
  focusAreas: string[];
  text: string;
  sentences: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DictationSession {
  id: string;
  dictationId: string;
  startedAt: string;
  completedAt?: string;
  photoUrl?: string;
  recognizedText?: string;
  correctedText?: string;
  errors: SpellingError[];
  score?: number;
}

export interface SpellingError {
  expected: string;
  actual: string;
  type: ErrorType;
  position: number;
  explanation: string;
}

export type ErrorType =
  | 'capitalization'
  | 'missing_letter'
  | 'extra_letter'
  | 'wrong_letter'
  | 'missing_word'
  | 'extra_word'
  | 'spacing'
  | 'punctuation'
  | 'doubling'
  | 'ie_ei'
  | 'dehnungs_h'
  | 'other';

export interface FeedbackMessage {
  type: 'praise' | 'encouragement' | 'tip';
  message: string;
}

export interface ProgressEntry {
  sessionId: string;
  dictationId: string;
  dictationTitle: string;
  type?: DictationType;
  date: string;
  errorCount: number;
  totalWords: number;
  errorTypes: ErrorType[];
}

export interface ProblemWord {
  word: string;
  wrongCount: number;
  lastWrong: string;
  errorTypes: ErrorType[];
  lastActual: string;
}

export interface ScoreRank {
  id: string;
  name: string;
  icon: string;
  description: string;
  minPercent: number;
  maxPercent: number;
  earned: boolean;
  current: boolean;
}

export interface OverallStats {
  totalWords: number;
  totalErrors: number;
  correctWords: number;
  overallPercent: number;
  currentRank: ScoreRank;
  allRanks: ScoreRank[];
}
