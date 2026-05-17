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

export type BeamSkin = {
  id: string;
  name: string;
  rarity: 'starter' | 'rare' | 'epic';
  cost: number;
  trail: number;
  glow: number;
  core: number;
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

export const BEAM_SKINS: readonly BeamSkin[] = [
  {
    id: 'pale-lantern',
    name: 'Pale Lantern',
    rarity: 'starter',
    cost: 0,
    trail: 0x90ccff,
    glow: 0xb8deff,
    core: 0xffffff,
    description: 'Default cold beam.'
  },
  {
    id: 'ember-spark',
    name: 'Ember Spark',
    rarity: 'rare',
    cost: 700,
    trail: 0xff9a3d,
    glow: 0xffc266,
    core: 0xfff0c2,
    description: 'Bonfire colored shot trail.',
    unlock: { level: 4, totalKills: 6 }
  },
  {
    id: 'grave-mist',
    name: 'Grave Mist',
    rarity: 'rare',
    cost: 1100,
    trail: 0xb497ff,
    glow: 0xd4c1ff,
    core: 0xf4eeff,
    description: 'Violet cemetery beam.',
    unlock: { level: 7, contractsCompleted: 5 }
  },
  {
    id: 'moon-cut',
    name: 'Moon Cut',
    rarity: 'epic',
    cost: 2600,
    trail: 0x9ff7ff,
    glow: 0xd0fbff,
    core: 0xffffff,
    description: 'Bright moonlight shot for winners.',
    unlock: { level: 11, wins: 3, bestKills: 3 }
  },
  {
    id: 'blood-vow',
    name: 'Blood Vow',
    rarity: 'epic',
    cost: 3800,
    trail: 0xff3f4a,
    glow: 0xff7a66,
    core: 0xfff1e8,
    description: 'Aggressive red beam trail.',
    unlock: { level: 16, totalKills: 50, bestKills: 5 }
  }
];

export function getShadowSkin(id: string): ShadowSkin {
  return SHADOW_SKINS.find((skin) => skin.id === id) ?? SHADOW_SKINS[0];
}

export function getBeamSkin(id: string): BeamSkin {
  return BEAM_SKINS.find((skin) => skin.id === id) ?? BEAM_SKINS[0];
}

export function canUnlockSkin(skin: ShadowSkin, profile: CosmeticProfile): boolean {
  return getSkinUnlockReasons(skin, profile).length === 0;
}

export function getSkinUnlockReasons(skin: ShadowSkin, profile: CosmeticProfile): string[] {
  return getUnlockReasons(skin.unlock, profile);
}

export function canUnlockBeam(skin: BeamSkin, profile: CosmeticProfile): boolean {
  return getBeamUnlockReasons(skin, profile).length === 0;
}

export function getBeamUnlockReasons(skin: BeamSkin, profile: CosmeticProfile): string[] {
  return getUnlockReasons(skin.unlock, profile);
}

function getUnlockReasons(unlock: ShadowSkinUnlock | undefined, profile: CosmeticProfile): string[] {
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
