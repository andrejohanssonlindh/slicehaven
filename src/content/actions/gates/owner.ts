import type { GateDef } from '../../../core/world3d/actions';

/**
 * Is it yours, or are you allowed? { "gate": "owner" }. A permission: when it fails it never blocks, it marks the act a
 * transgression that whoever sees it may answer (plan B3c). **A stub until owners exist: everything is allowed.**
 */
const owner: GateDef = {
  id: 'owner',
  about: 'The thing is yours or you have leave (a stub: always allowed until owners come, plan B3c).',
  kind: 'permission',
  check: () => null,
};

export default owner;
