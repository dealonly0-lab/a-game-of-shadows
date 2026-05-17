export type ShadowSkin = {
  id: string;
  name: string;
  rarity: 'starter' | 'rare' | 'epic';
  cost: number;
  color: number;
  accent: number;
  description: string;
  unlock?: ShadowSkinUnlock;
};

export type ShadowSkinUnlock = {
  level?: number;
  wins?: number;
  totalKills?: number;
  bestKills?: number;
  contractsCompleted?: number;
};

export type CosmeticProfile = {
  level: number;
  wins: number;
  totalKills: number;
  bestKills: number;
  contractsCompleted: number;
};

export const SHADOW_SKINS: readonly ShadowSkin[] = [
  {
    id: 'blue-veil',
    name: 'Blue Veil',
    rarity: 'starter',
    cost: 0,
    color: 0x4a8adc,
    accent: 0x90c8ff,
    description: 'Default survivor shadow.'
  },
  {
    id: 'ember-wraith',
    name: 'Ember Wraith',
    rarity: 'rare',
    cost: 650,
    color: 0xd47a35,
    accent: 0xffbd66,
    description: 'Warm ash trail for aggressive hunts.',
    unlock: { level: 3 }
  },
  {
    id: 'grave-violet',
    name: 'Grave Violet',
    rarity: 'rare',
    cost: 950,
    color: 0x8b5ad8,
    accent: 0xc7a8ff,
    description: 'A colder shadow from the old cemetery.',
    unlock: { level: 5, totalKills: 8 }
  },
  {
    id: 'fogbound-mourner',
    name: 'Fogbound Mourner',
    rarity: 'rare',
    cost: 1200,
    color: 0x6a7d8f,
    accent: 0xb8d4df,
    description: 'A pale form earned through longer nights.',
    unlock: { level: 7, contractsCompleted: 6 }
  },
  {
    id: 'hollow-crown',
    name: 'Hollow Crown',
    rarity: 'epic',
    cost: 2400,
    color: 0xa67a2c,
    accent: 0xffd166,
    description: 'A ranked hunter mark for proven winners.',
    unlock: { level: 10, wins: 3 }
  },
  {
    id: 'blood-lantern',
    name: 'Blood Lantern',
    rarity: 'epic',
    cost: 3200,
    color: 0x9e2f2f,
    accent: 0xff6f4f,
    description: 'A violent silhouette for high-pressure fights.',
    unlock: { level: 14, totalKills: 40, bestKills: 4 }
  },
  {
    id: 'dawnless-gold',
    name: 'Dawnless Gold',
    rarity: 'epic',
    cost: 5000,
    color: 0xd4a843,
    accent: 0xffe0a0,
    description: 'Prestige shadow for long-term progression.',
    unlock: { level: 18, wins: 8, bestKills: 5 }
  }
];

export function getShadowSkin(id: string): ShadowSkin {
  return SHADOW_SKINS.find((skin) => skin.id === id) ?? SHADOW_SKINS[0];
}

export function canUnlockSkin(skin: ShadowSkin, profile: CosmeticProfile): boolean {
  return getSkinUnlockReasons(skin, profile).length === 0;
}

export function getSkinUnlockReasons(skin: ShadowSkin, profile: CosmeticProfile): string[] {
  const unlock = skin.unlock;
  if (!unlock) return [];

  const reasons: string[] = [];
  if (unlock.level && profile.level < unlock.level) reasons.push(`LVL ${unlock.level}`);
  if (unlock.wins && profile.wins < unlock.wins) reasons.push(`${unlock.wins} wins`);
  if (unlock.totalKills && profile.totalKills < unlock.totalKills) reasons.push(`${unlock.totalKills} kills`);
  if (unlock.bestKills && profile.bestKills < unlock.bestKills) reasons.push(`${unlock.bestKills} best kills`);
  if (unlock.contractsCompleted && profile.contractsCompleted < unlock.contractsCompleted) {
    reasons.push(`${unlock.contractsCompleted} contracts`);
  }
  return reasons;
}
