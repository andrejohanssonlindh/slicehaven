import * as THREE from 'three';
import { AtlasPacker, type AtlasRect } from '../core/world3d/atlas';

/**
 * Small images (people, furniture, props) packed into shared atlases, so a
 * handful of textures serve hundreds of sprites and memory stays low. The
 * packing is the pure `AtlasPacker`; this copies the pixels and owns the GPU
 * textures. Nearest filtering, no mips, clamped, one transparent texel of
 * padding around every image.
 */

export interface AtlasImage {
  data: Uint8ClampedArray;
  w: number;
  h: number;
}

export interface AtlasSlot {
  texture: THREE.DataTexture;
  rect: AtlasRect;
  /** Texture coordinates of the image: u0..u1 across, v0 (bottom) to v1 (top). */
  uv: { u0: number; v0: number; u1: number; v1: number };
}

export class AtlasManager {
  private packer: AtlasPacker;
  private pixels: Uint8Array[] = [];
  private textures: THREE.DataTexture[] = [];
  private slots = new Map<string, AtlasSlot>();

  constructor(readonly size = 1024) {
    this.packer = new AtlasPacker(size, 1);
  }

  get count(): number {
    return this.textures.length;
  }

  /** Bytes of texture memory the atlases hold. */
  get bytes(): number {
    return this.textures.length * this.size * this.size * 4;
  }

  /** The slot for `key`, copying `img` into an atlas the first time. */
  add(key: string, img: AtlasImage): AtlasSlot {
    const have = this.slots.get(key);
    if (have) return have;
    const rect = this.packer.place(key, img.w, img.h);
    while (this.textures.length <= rect.atlas) {
      const buf = new Uint8Array(this.size * this.size * 4);
      const t = new THREE.DataTexture(buf, this.size, this.size, THREE.RGBAFormat);
      t.colorSpace = THREE.SRGBColorSpace;
      t.magFilter = t.minFilter = THREE.NearestFilter;
      t.generateMipmaps = false;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      this.pixels.push(buf);
      this.textures.push(t);
    }
    // Rows go in bottom-up, which is what the packer's UVs assume.
    const buf = this.pixels[rect.atlas];
    for (let y = 0; y < img.h; y++) {
      const dest = ((this.size - 1 - (rect.y + y)) * this.size + rect.x) * 4;
      buf.set(img.data.subarray(y * img.w * 4, (y + 1) * img.w * 4), dest);
    }
    this.textures[rect.atlas].needsUpdate = true;
    const slot: AtlasSlot = { texture: this.textures[rect.atlas], rect, uv: this.packer.uv(rect) };
    this.slots.set(key, slot);
    return slot;
  }
}

let shared: AtlasManager | null = null;
let sharedSize = 1024;

/** Choose the atlas size before the first sprite is made (512 on weak phones). */
export function setAtlasSize(size: number): void {
  if (!shared) sharedSize = size;
}

/** The sprite atlases of the page. */
export function spriteAtlas(): AtlasManager {
  return (shared ??= new AtlasManager(sharedSize));
}
