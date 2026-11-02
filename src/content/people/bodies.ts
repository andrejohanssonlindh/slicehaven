import { CLOTH, HAIR, SKIN } from '../../art/folk';
import { Rng } from '../../core/rng';
import type { Resolved } from '../../core/persons';
import type { BodyPlan, BodySpec, Garment, HairStyle, Held } from '../../core/world3d/body';
import { bodyOf } from '../chargen/bodies';
import { PEOPLES } from '../chargen/peoples';
import { FAMILY_KIND } from './facets';

/**
 * The bodies of the five peoples in 3D (`core/world3d/body.ts`): each people's proportions, and how a person's look and
 * people give their height, girth and colours. Heights and weights are the creator's typical figures per people and sex
 * (`content/chargen/bodies.ts`, shared with the character creator); the proportions are our own.
 */

/** Proportions by people family (the kind under which every people sits). */
export const BODY_PLANS: Record<string, BodyPlan> = {
  human: { head: 0.13, headW: 1, legs: 0.5, shoulders: 0.25, hips: 0.19, limb: 0.055, arm: 1, hands: 1, eyes: 1 },
  /** Long-limbed and fine-boned, with pointed ears. */
  elf: { head: 0.125, headW: 0.92, legs: 0.53, shoulders: 0.22, hips: 0.17, limb: 0.046, arm: 1.04, hands: 0.95, eyes: 1.1, pointedEars: true },
  /** Short legs, a big head, broad shoulders and big hands. */
  dwarf: { head: 0.17, headW: 1.12, legs: 0.42, shoulders: 0.32, hips: 0.25, limb: 0.075, arm: 0.95, hands: 1.3, eyes: 0.9, beardedWomen: true },
  /** Heavy-set, a jaw standing forward, claws and red-glowing eyes. */
  tirak: { head: 0.135, headW: 1.08, legs: 0.48, shoulders: 0.3, hips: 0.21, limb: 0.068, arm: 1.08, hands: 1.2, eyes: 1, jaw: 0.35, claws: true, eyeColour: '#d0302a' },
  /** Small, with a big head and big eyes. */
  missla: { head: 0.19, headW: 1.05, legs: 0.42, shoulders: 0.24, hips: 0.2, limb: 0.058, arm: 0.95, hands: 0.9, eyes: 1.7 },
};

const FAMILIES = Object.keys(BODY_PLANS);
/** Our family kind → the creator's family. */
const CREATOR_FAMILY = Object.fromEntries(Object.entries(FAMILY_KIND).map(([c, k]) => [k, c])) as Record<string, 'manniska' | 'alv' | 'dvarg' | 'tirak' | 'missla'>;

/** A typical [cm, kg] for a woman and a man of a whole family: the mean of its peoples. */
function familyBody(family: string): { f: [number, number]; m: [number, number] } {
  const fam = CREATOR_FAMILY[family];
  const all = PEOPLES.filter((p) => p.family === fam && (fam !== 'tirak' || p.id.endsWith('-tiraker'))).map((p) => bodyOf(p.id, fam)).filter((b) => !!b);
  const mean = (k: 'f' | 'm', i: 0 | 1): number => all.reduce((n, b) => n + b[k][i], 0) / all.length;
  return { f: [mean('f', 0), mean('f', 1)], m: [mean('m', 0), mean('m', 1)] };
}

/** How the build widens or narrows a body against its people's typical girth. */
const BUILD_GIRTH: Record<string, number> = { lean: 0.9, avg: 1, stout: 1.13, child: 0.96 };

const one = <T extends string>(list: readonly T[], v: string | undefined, fallback: T): T => (v && (list as readonly string[]).includes(v) ? (v as T) : fallback);
const ramp = (table: Record<string, readonly string[]>, name: string | undefined, fallback: string): readonly string[] => table[name ?? fallback] ?? table[fallback];

/** A person's body: their family's plan, their people's size for their sex (a little different for each seed), their look's colours. */
export function bodySpecOf(r: Resolved, seed: number): BodySpec {
  const look = r.look;
  const family = FAMILIES.find((f) => r.chain.includes(f)) ?? 'human';
  const plan = BODY_PLANS[family];
  const sex = look.sex === 'f' ? 'f' : 'm';
  // The people's own figures if the creator gives them; a sized people (the tirak) by its size; else the family's mean.
  const people = r.facets.people ?? family;
  const fam = CREATOR_FAMILY[family];
  const sized = look.size ? `${people}-${look.size}` : people;
  const typical = bodyOf(sized, fam) ?? bodyOf(people, fam) ?? familyBody(family);
  const [cm, kg] = typical[sex];
  const rng = Rng.fromSeed(`body:${seed}`);
  const height = (cm / 100) * (1 + (rng.next() - 0.5) * 0.08);
  // Girth from the weight: the body mass index against a human's typical 22, as a width.
  const girth = Math.sqrt(kg / (cm / 100) ** 2 / 22) * (BUILD_GIRTH[look.build ?? 'avg'] ?? 1);

  const skin = ramp(SKIN, look.skin, 'fair'), hair = ramp(HAIR, look.hair, 'brown');
  const cloth = (name: string | undefined): string | undefined => (name && name !== 'none' && CLOTH[name] ? CLOTH[name][2] : undefined);
  const held = (v: string | undefined): Held | undefined => (v && v !== 'none' ? one(['hoe', 'staff', 'spear', 'hammer', 'basket', 'bucket', 'stick'] as const, v, 'stick') : undefined);
  return {
    height,
    girth,
    sex,
    plan,
    colours: {
      skin: skin[3],
      skinDark: skin[2],
      hair: hair[2],
      eyes: plan.eyeColour ?? '#1a1418',
      top: cloth(look.top) ?? CLOTH.linen[2],
      legs: cloth(look.legs) ?? CLOTH.brown[2],
      boots: CLOTH[look.boots ?? 'leather']?.[1] ?? CLOTH.leather[1],
      head: cloth(look.head),
      apron: cloth(look.apron),
      vest: cloth(look.vest),
      cloak: cloth(look.cloak),
      belt: CLOTH.leather[1],
      wood: '#6a4a2e',
      iron: CLOTH.steel[2],
      straw: CLOTH.straw[2],
    },
    style: one<HairStyle>(['short', 'long', 'bald', 'bun', 'kerchief', 'hat', 'helm', 'hood'], look.style, 'short'),
    ...(look.beard === 'full' || look.beard === 'stubble' ? { beard: look.beard } : {}),
    garment: one<Garment>(['shirt', 'tunic', 'dress', 'robe'], look.garment, 'shirt'),
    sleeves: one(['long', 'rolled', 'short'] as const, look.sleeves, 'long'),
    ...(look.belt ? { belt: true } : {}),
    ...(held(look.right) ? { right: held(look.right) } : {}),
    ...(held(look.left) ? { left: held(look.left) } : {}),
  };
}
