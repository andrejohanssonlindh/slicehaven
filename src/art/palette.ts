/**
 * Master palette. Ramps go dark -> light. Light comes from the top-left.
 * Keep all art on these colours so everything belongs together.
 */
export const OUTLINE = '#1b1424';
export const SHADOW = '#0e0a1488';

export const P = {
  grass: ['#1f3a24', '#2d5230', '#3f6d36', '#5a8c3e', '#82ad4c', '#b5cf68'],
  moss: ['#1c3326', '#284a31', '#36623a', '#4b7d40'],
  floor: ['#2a2a1e', '#3b3a26', '#544b2e', '#6e5c36', '#8a7042'],
  leaf: ['#5a2e1a', '#7e4422', '#a35f2a', '#c98a3a'],
  dirt: ['#2e1f17', '#47301f', '#64462c', '#86613c', '#a8824f', '#c9a66b'],
  stone: ['#1f1e2a', '#33333f', '#4b4c5b', '#686b7b', '#8e93a1', '#bcc2cc'],
  water: ['#132a4a', '#1c3f66', '#25598a', '#3277ab', '#4c9bc8', '#86c6e0', '#d4f1f6'],
  bark: ['#24160f', '#3b2416', '#56351e', '#76502c'],
  foliage: ['#13261c', '#1c3a25', '#28512d', '#386d34', '#4f8a3a', '#72a947', '#a3c95a'],
  pine: ['#0f2020', '#16302b', '#1f4436', '#2c5a40', '#3d7448'],
  sideEarth: ['#1a110d', '#2b1d15', '#3f2b1d', '#573c26'],
  danger: ['#4a1014', '#8a1e22', '#c43a2e', '#ef6a48'],
  flower: ['#f2d75c', '#e889b0', '#f4f0e2', '#9fb6f0'],
} as const;
