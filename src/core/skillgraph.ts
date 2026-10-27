import type { ChallengeDef } from './challenge';
import type { ObjectDef, SceneApproach, SceneDef } from './scene';
import type { HookDef, Library } from './skillweb';

/**
 * Which skills relate to what: the index behind the Skills page.
 * Pure: give it the library, the scenes and the people, and ask about one skill.
 *
 * What is tracked today:
 * - tags (kinds of effort) per skill;
 * - library hooks (kind of thing, intention, difficulty) that list the skill;
 * - checks written in scenes;
 * - conflict approaches in scenes: skills reasonable to start with, the locked roll,
 *   and what the other side answers or starts with (only what he has);
 * - challenges in scenes (with times of day);
 * - who has the skill (people's sheets).
 */
export interface Person {
  name: string;
  dice: Record<string, { n: number; mod: number }>;
}

export interface Context {
  tags: Record<string, string[]>;
  library: Library;
  scenes: SceneDef[];
  people: Person[];
}

export interface ApproachLink {
  scene: string;
  who: string;
  approach: string;
  /** The conflict's locked roll. */
  locked: boolean;
  aggressive: boolean;
  /** What he can answer with when you start (only skills on his sheet; "attribute" if none fit). */
  answers: string[];
  fallback: boolean;
}

export interface HisLink {
  scene: string;
  who: string;
  approach: string;
  role: 'answer' | 'start';
  /** What you might answer or start with against it. */
  yours: string[];
}

export interface SkillRelations {
  id: string;
  tags: string[];
  hooks: HookDef[];
  checks: { scene: string; thing: string; label: string; difficulty: number }[];
  asYours: ApproachLink[];
  asHis: HisLink[];
  challenges: { scene: string; challenge: ChallengeDef; locked: boolean; time?: string[] }[];
  owners: { name: string; n: number; mod: number }[];
}

const social = (o: ObjectDef) => o.social;

export function relationsOf(id: string, cx: Context): SkillRelations {
  const out: SkillRelations = { id, tags: [], hooks: [], checks: [], asYours: [], asHis: [], challenges: [], owners: [] };
  out.tags = Object.keys(cx.tags).filter((t) => cx.tags[t].includes(id));
  out.hooks = cx.library.hooks.filter((h) => h.skills.includes(id));
  for (const sc of cx.scenes) {
    for (const o of sc.objects) {
      for (const c of o.checks ?? []) if (c.skills.includes(id)) out.checks.push({ scene: sc.title, thing: o.name, label: c.label, difficulty: c.difficulty });
      const soc = social(o);
      if (soc) {
        const has = (k: string) => (soc.dice[k]?.n ?? 0) > 0;
        for (const a of soc.approaches as SceneApproach[]) {
          const mine = a.skills.includes(id) || a.locked === id;
          if (mine) {
            const fits = a.answers.filter(has);
            out.asYours.push({
              scene: sc.title, who: o.name, approach: a.label, locked: a.locked === id, aggressive: !!a.aggressive,
              answers: fits.length ? fits : Object.keys(soc.dice).filter((k) => k.startsWith('attr:')), fallback: !fits.length,
            });
          }
          for (const [role, list] of [['answer', a.answers], ['start', a.moves?.length ? a.moves : a.answers]] as const) {
            if (list.includes(id) && has(id)) out.asHis.push({ scene: sc.title, who: o.name, approach: a.label, role, yours: [...new Set([a.locked, ...a.skills])] });
          }
        }
      }
    }
    for (const ch of sc.challenges ?? []) {
      const entry = ch.skills.find((s) => s.id === id);
      if (entry || ch.locked.includes(id)) out.challenges.push({ scene: sc.title, challenge: ch, locked: ch.locked.includes(id), time: entry?.time });
    }
  }
  for (const p of cx.people) if ((p.dice[id]?.n ?? 0) > 0) out.owners.push({ name: p.name, n: p.dice[id].n, mod: p.dice[id].mod });
  return out;
}

/** Every skill id that has any relation at all. */
export function linkedSkills(ids: string[], cx: Context): Set<string> {
  const set = new Set<string>();
  for (const id of ids) {
    const r = relationsOf(id, cx);
    if (r.tags.length || r.hooks.length || r.checks.length || r.asYours.length || r.asHis.length || r.challenges.length) set.add(id);
  }
  return set;
}

/** For the tag view: who is tagged, and how many hooks/approaches use the tag's skills. */
export const skillsWithTag = (tag: string, cx: Context): string[] => cx.tags[tag] ?? [];
