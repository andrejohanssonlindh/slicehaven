import type * as THREE from 'three';
import type { Pix } from '../../art/pix';
import { TEXELS_PER_M } from '../../core/world3d/tiers';
import { pixTexture } from '../materials';

/** A painted picture as a texture: flipped for the GPU, and `ppm` texels a metre (the world's density unless said). */
export const tex = (p: Pix, flip = true, ppm: number | undefined = TEXELS_PER_M): THREE.DataTexture => pixTexture(p.data, p.w, p.h, { flip, ppm });
