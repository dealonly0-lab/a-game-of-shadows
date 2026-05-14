import type { GameOutcome, MatchStats } from '../simulation/types';

export type PlayerProfile = {
  version: 1;
  level: number;
  xp: number;
  embers: number;
  streak: number;
  lastPlayedDay: string;
  matchesPlayed: number;
  wins: number;
  totalKills: number;
  bestKills: number;
  bestSurvivalMs: number;
  title: string;
  contracts: DailyContract[];
};

export type ContractKind = 'matches' | 'kills' | 'hits' | 'survive' | 'wins';

export type DailyContract = {
  id: string;
  day: string;
  kind: ContractKind;
  label: string;
  progress: number;
  target: number;
  xpReward: number;
  emberReward: number;
  completed: boolean;
  claimed: boolean;
};

export type MatchRewards = {
  xp: number;
  embers: number;
  baseXp: number;
  contractXp: number;
  contractEmbers: number;
  leveledUp: boolean;
  previousLevel: number;
  newLevel: number;
  reasons: string[];
  completedContracts: string[];
};

const STORAGE_KEY = 'hollow.profile.v1';

export function createDefaultProfile(): PlayerProfile {
  return {
    version: 1,
    level: 1,
    xp: 0,
    embers: 0,
    streak: 0,
    lastPlayedDay: '',
    matchesPlayed: 0,
    wins: 0,
    totalKills: 0,
    bestKills: 0,
    bestSurvivalMs: 0,
    title: 'New Shadow',
    contracts: generateDailyContracts(dayStamp())
  };
}

export function loadProfile(): PlayerProfile {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeProfile(createDefaultProfile());
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    return normalizeProfile(parsed);
  } catch {
    return normalizeProfile(createDefaultProfile());
  }
}

export function saveProfile(profile: PlayerProfile): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function applyMatchRewards(profile: PlayerProfile, stats: MatchStats, outcome: GameOutcome): { profile: PlayerProfile; rewards: MatchRewards } {
  const next = normalizeProfile(profile);
  const previousLevel = next.level;
  const reasons: string[] = [];
  const completedContracts: string[] = [];

  const survivedSeconds = Math.round(stats.survivedMs / 1000);
  const survivalXp = Math.min(120, Math.floor(survivedSeconds * 1.4));
  const killXp = stats.playerKills * 75;
  const accuracy = stats.playerShots > 0 ? stats.playerHits / stats.playerShots : 0;
  const accuracyXp = stats.playerShots >= 3 ? Math.round(accuracy * 35) : 0;
  const winXp = outcome === 'won' ? 160 : 0;
  const baseXp = 20 + survivalXp + killXp + accuracyXp + winXp;
  let contractXp = 0;
  let contractEmbers = 0;

  reasons.push(`Survival +${survivalXp} XP`);
  if (stats.playerKills > 0) reasons.push(`Kills +${killXp} XP`);
  if (accuracyXp > 0) reasons.push(`Aim +${accuracyXp} XP`);
  if (winXp > 0) reasons.push(`Victory +${winXp} XP`);

  updateDailyStreak(next);
  for (const contract of next.contracts) {
    if (contract.claimed) continue;
    contract.progress = Math.min(contract.target, contract.progress + contractProgressForMatch(contract.kind, stats, outcome));
    contract.completed = contract.progress >= contract.target;
    if (contract.completed) {
      contract.claimed = true;
      contractXp += contract.xpReward;
      contractEmbers += contract.emberReward;
      completedContracts.push(contract.label);
      reasons.push(`Contract: ${contract.label}`);
    }
  }

  const streakBonus = next.streak >= 2 ? Math.min(60, next.streak * 6) : 0;
  if (streakBonus > 0) reasons.push(`Streak +${streakBonus} XP`);

  const xp = baseXp + contractXp + streakBonus;
  const embers = Math.max(5, Math.round(baseXp / 18) + stats.playerKills * 4 + (outcome === 'won' ? 12 : 0)) + contractEmbers;

  next.xp += xp;
  next.embers += embers;
  next.matchesPlayed += 1;
  if (outcome === 'won') next.wins += 1;
  next.totalKills += stats.playerKills;
  next.bestKills = Math.max(next.bestKills, stats.playerKills);
  next.bestSurvivalMs = Math.max(next.bestSurvivalMs, stats.survivedMs);
  next.level = levelFromXp(next.xp);
  next.title = titleForLevel(next.level);

  return {
    profile: next,
    rewards: {
      xp,
      embers,
      baseXp,
      contractXp,
      contractEmbers,
      previousLevel,
      newLevel: next.level,
      leveledUp: next.level > previousLevel,
      reasons,
      completedContracts
    }
  };
}

export function refreshDailyContracts(profile: PlayerProfile): PlayerProfile {
  return normalizeProfile(profile);
}

export function xpForNextLevel(level: number): number {
  return Math.floor(140 * Math.pow(level, 1.45));
}

export function xpProgressInLevel(xp: number, level: number): { current: number; needed: number; percent: number } {
  const previous = level <= 1 ? 0 : xpForNextLevel(level - 1);
  const next = xpForNextLevel(level);
  const current = Math.max(0, xp - previous);
  const needed = Math.max(1, next - previous);
  return {
    current,
    needed,
    percent: Math.max(0, Math.min(100, Math.round((current / needed) * 100)))
  };
}

function levelFromXp(xp: number): number {
  let level = 1;
  while (xp >= xpForNextLevel(level)) level += 1;
  return level;
}

function titleForLevel(level: number): string {
  if (level >= 20) return 'Dawnless';
  if (level >= 15) return 'Lantern Reaper';
  if (level >= 10) return 'Village Wraith';
  if (level >= 6) return 'Shadow Hunter';
  if (level >= 3) return 'Candle Stalker';
  return 'New Shadow';
}

function normalizeProfile(profile: Partial<PlayerProfile>): PlayerProfile {
  const fallback = createDefaultProfile();
  const today = dayStamp();
  const contracts = Array.isArray(profile.contracts) && profile.contracts.some((contract) => contract.day === today)
    ? profile.contracts.filter((contract) => contract.day === today).map(normalizeContract)
    : generateDailyContracts(today);

  return {
    version: 1,
    level: positiveNumber(profile.level, fallback.level),
    xp: positiveNumber(profile.xp, fallback.xp),
    embers: positiveNumber(profile.embers, fallback.embers),
    streak: positiveNumber(profile.streak, fallback.streak),
    lastPlayedDay: typeof profile.lastPlayedDay === 'string' ? profile.lastPlayedDay : fallback.lastPlayedDay,
    matchesPlayed: positiveNumber(profile.matchesPlayed, fallback.matchesPlayed),
    wins: positiveNumber(profile.wins, fallback.wins),
    totalKills: positiveNumber(profile.totalKills, fallback.totalKills),
    bestKills: positiveNumber(profile.bestKills, fallback.bestKills),
    bestSurvivalMs: positiveNumber(profile.bestSurvivalMs, fallback.bestSurvivalMs),
    title: typeof profile.title === 'string' ? profile.title : fallback.title,
    contracts
  };
}

function normalizeContract(contract: Partial<DailyContract>): DailyContract {
  const fallback = generateDailyContracts(dayStamp())[0];
  const target = positiveNumber(contract.target, fallback.target);
  const progress = Math.min(target, positiveNumber(contract.progress, 0));
  return {
    id: typeof contract.id === 'string' ? contract.id : fallback.id,
    day: typeof contract.day === 'string' ? contract.day : dayStamp(),
    kind: isContractKind(contract.kind) ? contract.kind : fallback.kind,
    label: typeof contract.label === 'string' ? contract.label : fallback.label,
    progress,
    target,
    xpReward: positiveNumber(contract.xpReward, fallback.xpReward),
    emberReward: positiveNumber(contract.emberReward, fallback.emberReward),
    completed: Boolean(contract.completed || progress >= target),
    claimed: Boolean(contract.claimed)
  };
}

function generateDailyContracts(day: string): DailyContract[] {
  const pool: Omit<DailyContract, 'id' | 'day' | 'progress' | 'completed' | 'claimed'>[] = [
    { kind: 'matches', label: 'Enter 2 Hunts', target: 2, xpReward: 90, emberReward: 8 },
    { kind: 'kills', label: 'Banish 2 Shadows', target: 2, xpReward: 120, emberReward: 12 },
    { kind: 'hits', label: 'Land 4 Beams', target: 4, xpReward: 110, emberReward: 10 },
    { kind: 'survive', label: 'Survive 90 Seconds', target: 90, xpReward: 130, emberReward: 12 },
    { kind: 'wins', label: 'Claim the Village', target: 1, xpReward: 180, emberReward: 18 },
    { kind: 'kills', label: 'Banish 4 Shadows', target: 4, xpReward: 170, emberReward: 16 }
  ];
  let seed = hashDay(day);
  const contracts: DailyContract[] = [];
  while (contracts.length < 3) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const candidate = pool[seed % pool.length];
    if (contracts.some((contract) => contract.label === candidate.label)) continue;
    contracts.push({
      ...candidate,
      id: `${day}-${candidate.kind}-${contracts.length}`,
      day,
      progress: 0,
      completed: false,
      claimed: false
    });
  }
  return contracts;
}

function contractProgressForMatch(kind: ContractKind, stats: MatchStats, outcome: GameOutcome): number {
  if (kind === 'matches') return 1;
  if (kind === 'kills') return stats.playerKills;
  if (kind === 'hits') return stats.playerHits;
  if (kind === 'survive') return Math.round(stats.survivedMs / 1000);
  if (kind === 'wins') return outcome === 'won' ? 1 : 0;
  return 0;
}

function updateDailyStreak(profile: PlayerProfile): void {
  const today = dayStamp();
  if (profile.lastPlayedDay === today) return;
  profile.streak = profile.lastPlayedDay === previousDayStamp(today) ? profile.streak + 1 : 1;
  profile.lastPlayedDay = today;
}

function dayStamp(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function previousDayStamp(day: string): string {
  const date = new Date(`${day}T12:00:00`);
  date.setDate(date.getDate() - 1);
  return dayStamp(date);
}

function hashDay(day: string): number {
  let hash = 2166136261;
  for (let i = 0; i < day.length; i++) {
    hash ^= day.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function positiveNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function isContractKind(value: unknown): value is ContractKind {
  return value === 'matches' || value === 'kills' || value === 'hits' || value === 'survive' || value === 'wins';
}
