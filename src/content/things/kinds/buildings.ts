import type { ThingDef } from '../../../core/world3d/things';

/**
 * Kinds of building, as data that `buildHouse` reads (`core/world3d/house.ts`, `BuildingPlan`). A new kind of
 * building (a smithy, a temple, a longhouse) is a new entry here: storeys and their heights, the door, and what is
 * inside. Buildings are placed by a map's `houses`, not as props. They are a kind of `structure` to the skill hooks.
 */
const things: ThingDef[] = [
  {
    id: 'building', is: 'structure', abstract: true,
    // What kind of room (`rooms.ts`) each room of a building is, by its role; the `main` room is the map's `room`.
    rooms: { guest: 'guestroom', landing: 'landing', attic: 'attic', upstairs: 'upstairs', stall: 'horsestall', aisle: 'aisle' },
  },
  {
    id: 'cottage',
    is: 'building',
    look: 'A one-room cottage of timber and plaster under thatch.',
    building: {
      storeys: [2.5],
      door: { width: 1.0, height: 1.95, at: { inBay: 2 } },
      sideWindows: 'one',
      braced: true,
      ground: 'open',
    },
  },
  {
    id: 'inn',
    is: 'building',
    look: 'An inn of two storeys and an attic, with a stair along the front.',
    building: {
      size: { width: 12.4, depth: 8.4 },
      storeys: [2.7, 2.5, 1.5],
      door: { width: 1.3, height: 1.95, at: { fromRight: 3.0 } },
      sideWindows: 'perBay',
      ground: 'open',
      upstairs: { shares: [1, 1, 1, 1], roles: ['guest', 'guest', 'guest', 'guest'] },
    },
  },
  {
    id: 'shop',
    is: 'building',
    look: 'A shop below, with a bedroom and the keeper’s own room above.',
    building: {
      size: { width: 9.2, depth: 6.6 },
      storeys: [2.8, 2.2],
      door: { width: 1.1, height: 1.95, at: { fromRight: 2.0 } },
      sideWindows: 'perBay',
      ground: 'open',
      upstairs: { shares: [0.4, 0.6], roles: ['guest', 'upstairs'] },
    },
  },
  {
    id: 'stable',
    is: 'building',
    look: 'A stable with stalls along the back and an aisle in front.',
    building: {
      size: { width: 12.2, depth: 6.4 },
      storeys: [2.7],
      door: { width: 2.0, height: 2.25, at: { spread: 1.2 } },
      sideWindows: 'perBay',
      ground: { stalls: { count: 5, depth: 3.0 } },
    },
  },
];

export default things;
