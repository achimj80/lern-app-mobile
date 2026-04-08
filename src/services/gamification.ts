import { DictationSession, DictationType, ProgressEntry, ProblemWord, ScoreRank, OverallStats } from '../types';

const DIKTAT_RANKS: Omit<ScoreRank, 'earned' | 'current'>[] = [
  { id: 'rank_0',   name: 'Spurensucher',      icon: '🔍', description: 'Ich höre den 1. Buchstaben!',    minPercent: 0,   maxPercent: 10 },
  { id: 'rank_10',  name: 'Lauscher',           icon: '👂', description: 'Anfang & Ende hören!',           minPercent: 10,  maxPercent: 30 },
  { id: 'rank_30',  name: 'Silbenkönig',        icon: '👑', description: 'Ich schwinge die Silben!',       minPercent: 30,  maxPercent: 50 },
  { id: 'rank_50',  name: 'Buchstaben-Profi',   icon: '✏️', description: 'Fast alle Buchstaben da!',       minPercent: 50,  maxPercent: 70 },
  { id: 'rank_70',  name: 'Wort-Entdecker',     icon: '🔎', description: 'Alle Buchstaben richtig!',       minPercent: 70,  maxPercent: 90 },
  { id: 'rank_90',  name: 'Satz-Meister',       icon: '🏆', description: 'Perfektes Wort, Satz & Punkt!',  minPercent: 90,  maxPercent: 101 },
];

const MATHE_RANKS: Omit<ScoreRank, 'earned' | 'current'>[] = [
  { id: 'math_0',   name: 'Zahlenfinder',    icon: '🔢', description: 'Ich kenne die Zahlen!',          minPercent: 0,   maxPercent: 10 },
  { id: 'math_10',  name: 'Fingerrechner',   icon: '🖐️', description: 'Ich zähle mit den Fingern!',    minPercent: 10,  maxPercent: 30 },
  { id: 'math_30',  name: 'Zahlenfuchs',     icon: '🦊', description: 'Plus und Minus kann ich!',       minPercent: 30,  maxPercent: 50 },
  { id: 'math_50',  name: 'Rechen-Profi',    icon: '🧮', description: 'Ich rechne schnell und richtig!', minPercent: 50,  maxPercent: 70 },
  { id: 'math_70',  name: 'Mathe-Detektiv',  icon: '🕵️', description: 'Ich knacke jede Aufgabe!',       minPercent: 70,  maxPercent: 90 },
  { id: 'math_90',  name: 'Mathe-Champion',  icon: '🥇', description: 'Alle Aufgaben perfekt!',          minPercent: 90,  maxPercent: 101 },
];

function getRanksForType(type?: DictationType): Omit<ScoreRank, 'earned' | 'current'>[] {
  return type === 'mathe' ? MATHE_RANKS : DIKTAT_RANKS;
}

function getDateString(date: string): string {
  return new Date(date).toISOString().split('T')[0];
}

export function calculateStreak(progress: ProgressEntry[]): number {
  if (progress.length === 0) return 0;

  const practiceDays = new Set(progress.map(p => getDateString(p.date)));
  const sortedDays = [...practiceDays].sort().reverse();

  const today = getDateString(new Date().toISOString());
  const yesterday = getDateString(new Date(Date.now() - 86400000).toISOString());

  if (sortedDays[0] !== today && sortedDays[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 0; i < sortedDays.length - 1; i++) {
    const current = new Date(sortedDays[i]).getTime();
    const next = new Date(sortedDays[i + 1]).getTime();
    if (current - next === 86400000) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function calculateOverallStats(progress: ProgressEntry[], type?: DictationType): OverallStats {
  const filtered = type ? progress.filter(p => (p.type || 'diktat') === type) : progress;
  const totalWords = filtered.reduce((sum, p) => sum + p.totalWords, 0);
  const totalErrors = filtered.reduce((sum, p) => sum + p.errorCount, 0);
  const correctWords = totalWords - totalErrors;
  const overallPercent = totalWords > 0 ? Math.round((correctWords / totalWords) * 100) : 0;

  const ranks = getRanksForType(type);
  const topRankId = ranks[ranks.length - 1].id;

  const allRanks: ScoreRank[] = ranks.map(r => ({
    ...r,
    earned: overallPercent >= r.minPercent,
    current: overallPercent >= r.minPercent && overallPercent < r.maxPercent,
  }));

  if (overallPercent >= 100) {
    allRanks.forEach(r => r.current = r.id === topRankId);
  }

  const currentRank = allRanks.find(r => r.current) || allRanks[0];

  return { totalWords, totalErrors, correctWords, overallPercent, currentRank, allRanks };
}

export function getNextRank(stats: OverallStats): ScoreRank | null {
  const currentIdx = stats.allRanks.findIndex(r => r.current);
  if (currentIdx < stats.allRanks.length - 1) {
    return stats.allRanks[currentIdx + 1];
  }
  return null;
}

export function calculateProblemWords(sessions: DictationSession[]): ProblemWord[] {
  const wordErrors = new Map<string, { count: number; lastWrong: string; types: Set<string>; lastActual: string }>();

  const completed = sessions.filter(s => s.completedAt && s.errors.length > 0);

  for (const session of completed) {
    for (const error of session.errors) {
      if (!error.expected || error.type === 'extra_word') continue;

      const word = error.expected.replace(/[.,!?;:]+$/g, '').toLowerCase();
      if (word.length < 2) continue;

      const existing = wordErrors.get(word);
      if (existing) {
        existing.count++;
        if (new Date(session.completedAt!) > new Date(existing.lastWrong)) {
          existing.lastWrong = session.completedAt!;
          existing.lastActual = error.actual;
        }
        existing.types.add(error.type);
      } else {
        wordErrors.set(word, {
          count: 1,
          lastWrong: session.completedAt!,
          types: new Set([error.type]),
          lastActual: error.actual,
        });
      }
    }
  }

  return [...wordErrors.entries()]
    .filter(([, data]) => data.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([word, data]) => ({
      word,
      wrongCount: data.count,
      lastWrong: data.lastWrong,
      errorTypes: [...data.types] as ProblemWord['errorTypes'],
      lastActual: data.lastActual,
    }));
}

export function getTodayPracticeCount(progress: ProgressEntry[], type?: DictationType): number {
  const today = getDateString(new Date().toISOString());
  const filtered = type ? progress.filter(p => (p.type || 'diktat') === type) : progress;
  return filtered.filter(p => getDateString(p.date) === today).length;
}
