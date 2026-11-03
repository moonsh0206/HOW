import { TANK_COUNTERS } from './counters/tank.js';
import { DAMAGE_COUNTERS } from './counters/damage.js';
import { SUPPORT_COUNTERS } from './counters/support.js';

// Directed HOW-authored reviews. No third-party matchup scores or win rates are mirrored.
export const COUNTER_RELATIONS = Object.freeze([...TANK_COUNTERS, ...DAMAGE_COUNTERS, ...SUPPORT_COUNTERS]);
