import { LEADS } from '../../content/leads';
import type { ActTarget } from '../../core/world3d/actions';
import { type Cares, type LeadStatus, giveLead, leadStatus } from '../../core/world3d/leads';
import { placedId } from '../../core/world3d/state';
import type { SpikeWorld } from './index';

/**
 * Leads (plan B11, `core/world3d/leads.ts`): what the hero knows that gives a reason to act (the world's `leads`,
 * saved). Placed things that carry a lead give it to whoever looks at them; the journal lists them.
 */

export class Journal {
  /** Placed things that carry a lead, by thing id. */
  private readonly propLeads = new Map<string, string>();

  constructor(private readonly w: SpikeWorld) {
    for (const p of w.layout.props) if (p.lead) this.propLeads.set(placedId(p), p.lead);
  }

  /** The lead a thing carries, if any. */
  leadOf(thing: string): string | null {
    return this.propLeads.get(thing) ?? null;
  }

  /** Give the hero a lead; its title if it is new to them, else null. */
  giveLead(id: string): string | null {
    return giveLead(this.w.leads, LEADS, id, this.w.worldHours) ? LEADS[id].title : null;
  }

  /**
   * The hero looks at a thing (taps it): if it carries a lead, they get it (if they hadn't). The lead's title, what it
   * says of the thing (its first line, to show as the look), and whether it was new; null for a thing with no lead.
   */
  lookAt(t: ActTarget): { title: string; look: string; added: boolean } | null {
    const id = this.propLeads.get(t.id);
    if (!id || !LEADS[id]) return null;
    const added = this.giveLead(id) !== null;
    return { title: LEADS[id].title, look: LEADS[id].know, added };
  }

  /** The journal: every lead the hero has, newest first, with what they know, where it stands, and who might care. */
  get entries(): { id: string; title: string; lines: string[]; status: LeadStatus; cares: Cares[] }[] {
    return Object.entries(this.w.leads)
      .filter(([id]) => LEADS[id])
      .sort((a, b) => b[1].at - a[1].at)
      // (Who might care: those whose answer has not been heard yet.)
      .map(([id, r]) => ({ id, title: LEADS[id].title, lines: [...r.lines], status: leadStatus(LEADS[id], r, this.w.flags), cares: LEADS[id].answers.filter((_, i) => !r.heard.includes(i)).map((a) => a.who) }));
  }
}
