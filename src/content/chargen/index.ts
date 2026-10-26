import type { Content } from '../../core/chargen/derive';
import { ARCHETYPES, ENVIRONMENTS, LIVING } from './archetypes';
import { BACKGROUNDS } from './backgrounds';
import { EVENT_TABLES } from './events';
import { HOMELANDS } from './homelands';
import { FAMILIES, PEOPLES } from './peoples';
import { RELIGIONS } from './religions';
import { SKILLS, skillDef } from './skills';

export const CONTENT: Content = {
  homelands: HOMELANDS,
  backgrounds: BACKGROUNDS,
  families: FAMILIES,
  peoples: PEOPLES,
  religions: RELIGIONS,
  archetypes: ARCHETYPES,
  environments: ENVIRONMENTS,
  living: LIVING,
  tables: EVENT_TABLES,
  skill: skillDef,
  skills: SKILLS,
};
