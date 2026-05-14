export type ShadowSkin = {
  id: string;
  name: string;
  rarity: 'starter' | 'rare' | 'epic';
  cost: number;
  color: number;
  accent: number;
  description: string;
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
    cost: 180,
    color: 0xd47a35,
    accent: 0xffbd66,
    description: 'Warm ash trail for aggressive hunts.'
  },
  {
    id: 'grave-violet',
    name: 'Grave Violet',
    rarity: 'rare',
    cost: 260,
    color: 0x8b5ad8,
    accent: 0xc7a8ff,
    description: 'A colder shadow from the old cemetery.'
  },
  {
    id: 'dawnless-gold',
    name: 'Dawnless Gold',
    rarity: 'epic',
    cost: 420,
    color: 0xd4a843,
    accent: 0xffe0a0,
    description: 'Prestige shadow for long-term progression.'
  }
];

export function getShadowSkin(id: string): ShadowSkin {
  return SHADOW_SKINS.find((skin) => skin.id === id) ?? SHADOW_SKINS[0];
}
