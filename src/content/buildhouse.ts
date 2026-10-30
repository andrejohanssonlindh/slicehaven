import { type House3DSpec, type HouseModel, buildHouse as build } from '../core/world3d/house';
import { THINGS } from './things';

/** A house built to its kind of building (the spec's `plan`, default a cottage), asked of the kinds of thing. */
export const buildHouse = (spec: House3DSpec): HouseModel => build(spec, THINGS.building(spec.plan));
