import type { Attr } from '../../core/chargen/grants';

/**
 * What each attribute does, in a line, for the creator (the director: "we need to specify what attributes do").
 * Our own summaries of the rules, not the book's words. Shown under each attribute's name.
 */
export const ATTR_ABOUT: Record<Attr, string> = {
  Förflyttning: 'Moving fast and nimbly: running, sneaking, balance. The fallback when you lack a skill for something physical.',
  Intryck: 'How you come across: charm, authority, being noticed. The fallback for talking when you lack the skill.',
  Kroppsbyggnad: 'Size and strength: base damage and base armour, how much you carry, which weapons you can use in one hand or two.',
  Livskraft: 'Health and stamina: how much you take before you fall, and how you shrug off sickness, poison and bleeding.',
  Reaktion: 'Quick reflexes: who acts first, and how fast you answer when a fight starts.',
  Självkontroll: 'Holding steady: fear, pain, temptation and keeping your head under pressure.',
  Vaksamhet: 'Noticing: how far and how well you see and hear, and spotting what is hidden.',
  Visdom: 'Learning and insight. Never rolled: it decides how many knowledge skills you start with, or lack, and what new ones cost.',
};
