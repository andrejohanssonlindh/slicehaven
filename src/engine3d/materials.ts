import * as THREE from 'three';
import { CLOUD_SCALE, CLOUD_SEED } from '../core/world3d/sky';

/**
 * Lit materials for the 3D world: three's Lambert (cheap, per-pixel) with our
 * additions patched in: drifting cloud shadow on the sun, wetness, wind sway,
 * baked AO through vertex colours, and "shells" (a sparse, pixel-locked fringe
 * drawn a pixel or two outside rough surfaces).
 */

/** Uniforms every lit material shares, updated once per frame. */
export const WORLD = {
  uTime: { value: 0 },
  /** x: cloud threshold, y: how much a cloud dims the sun, zw: drift offset (metres). */
  uCloud: { value: new THREE.Vector4(0.7, 0.7, 0, 0) },
  uWet: { value: 0 },
  /** xy: wind direction × strength, z: gustiness. */
  uWind: { value: new THREE.Vector3(0.2, 0, 0.5) },
  /** The camera's offset in whole rendered pixels, so screen-space noise stays put on the world. */
  uCamPix: { value: new THREE.Vector2(0, 0) },
  /** World size of one rendered pixel, metres. */
  uPixWorld: { value: 1 / 21 },
  /** Holes through things in front of people (see `SEE_SLOTS`): xy the centre in view space, z how far from the camera, w 1 if used. */
  uSee: { value: Array.from({ length: 4 }, () => new THREE.Vector4(0, 0, 0, 0)) },
  /** Vision: xy the centre (metres), z where what is seen starts to fade, w where it is gone (w <= 0: off). */
  uVision: { value: new THREE.Vector4(0, 0, 0, 0) },
  /** What has been seen before: a window of the explored map (one texel a metre), `uExploredBox` its corner (xy) and side (z), metres. */
  uExplored: { value: null as THREE.DataTexture | null },
  uExploredBox: { value: new THREE.Vector4(0, 0, 1, 0) },
};

/** Side of the explored-map window, in texels (metres). */
export const EXPLORED_WINDOW = 160;
/** The window's texture: a metre a texel, filtered so the edge of the known world is soft. */
export const exploredTexture = ((): THREE.DataTexture => {
  const t = new THREE.DataTexture(new Uint8Array(EXPLORED_WINDOW * EXPLORED_WINDOW), EXPLORED_WINDOW, EXPLORED_WINDOW, THREE.RedFormat);
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.needsUpdate = true;
  return t;
})();
WORLD.uExplored.value = exploredTexture;

/** How many people can have a see-through oval at once. */
export const SEE_SLOTS = 4;
/** The oval's half sizes in view-space metres (a person is about 1.4 m tall on screen, 0.6 wide), and how much nearer than the person a surface must be to be cut. */
export const SEE_RADIUS = { x: 0.8, y: 1.15, margin: 0.4 };

/** The core's value noise and fbm, bit for bit (see core/noise.ts), plus the cloud field. */
export const NOISE_GLSL = /* glsl */ `
float shHash(int x, int y, int seed) {
  uint h = uint(x) * 374761393u + uint(y) * 668265263u + uint(seed) * 2246822519u;
  h = (h ^ (h >> 13u)) * 1274126177u;
  return float(h ^ (h >> 16u)) / 4294967296.0;
}
float shValue(vec2 p, int seed) {
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 t = f * f * (3.0 - 2.0 * f);
  int xi = int(i.x), yi = int(i.y);
  float a = shHash(xi, yi, seed), b = shHash(xi + 1, yi, seed), c = shHash(xi, yi + 1, seed), d = shHash(xi + 1, yi + 1, seed);
  return a + (b - a) * t.x + (c - a) * t.y + (a - b - c + d) * t.x * t.y;
}
float shFbm(vec2 p, int seed) {
  return (shValue(p, seed) * 0.5 + shValue(p * 2.0, seed + 101) * 0.25 + shValue(p * 4.0, seed + 202) * 0.125) / 0.875;
}
uniform vec4 uCloud;
float cloudDensity(vec2 xz) {
  float n = shFbm((xz - uCloud.zw) / ${CLOUD_SCALE.toFixed(1)}, ${CLOUD_SEED});
  float u = clamp((n - uCloud.x + 0.07) / 0.14, 0.0, 1.0);
  return u * u * (3.0 - 2.0 * u);
}
`;

export interface LitOpts {
  map?: THREE.Texture | null;
  color?: THREE.ColorRepresentation;
  /** Vertex AO in the colour attribute. */
  ao?: boolean;
  /** Sway with the wind above this height (local metres); undefined = rigid. */
  sway?: { from: number; amount: number };
  /** Gets darker and glossier in the rain. */
  wettable?: boolean;
  /** Billboard sprite: alpha-tested, double-sided. */
  sprite?: boolean;
  emissiveMap?: THREE.Texture | null;
  emissive?: THREE.ColorRepresentation;
  /** Gets a dithered see-through oval where it stands between the camera and a person. */
  seeThrough?: boolean;
}

export interface ShellOpts {
  /** Which layer, 1 or 2 (seeds the pattern). */
  layer: number;
  /** How far out along the normal, metres. */
  offset: number;
  /** Share of pixels drawn, 0..1. */
  density: number;
  /** Colour multiplier for the fringe. */
  tint: number;
}

function patch(mat: THREE.MeshLambertMaterial, o: LitOpts, shell?: ShellOpts): void {
  const key = `lit:${o.sway ? `s${o.sway.from},${o.sway.amount}` : ''}:${o.wettable ? 'w' : ''}:${shell ? `sh${shell.layer},${shell.offset},${shell.density},${shell.tint}` : ''}:${o.seeThrough ? 'v' : ''}`;
  mat.customProgramCacheKey = () => key;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, WORLD);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
uniform float uTime;
uniform vec3 uWind;
uniform float uPixWorld;
varying vec3 vWPos;
varying vec3 vVPos;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
${shell ? `transformed += normalize(objectNormal) * ${shell.offset.toFixed(3)};` : ''}
${o.sway ? `{
  vec4 wb = vec4(0.0, 0.0, 0.0, 1.0);
  #ifdef USE_INSTANCING
  wb = instanceMatrix * wb;
  #endif
  wb = modelMatrix * wb;
  float hgt = max(0.0, transformed.y - ${o.sway.from.toFixed(2)});
  float ph = uTime * 1.7 + wb.x * 0.31 + wb.z * 0.27 + transformed.x * 0.4;
  float s = (sin(ph) * 0.6 + sin(ph * 2.3 + 1.1) * 0.4 * uWind.z) * ${o.sway.amount.toFixed(3)} * hgt * (0.25 + length(uWind.xy));
  transformed.x += s + uWind.x * hgt * ${(o.sway.amount * 0.5).toFixed(3)};
  transformed.z += s * 0.5 + uWind.y * hgt * ${(o.sway.amount * 0.5).toFixed(3)};
}` : ''}`)
      .replace('#include <project_vertex>', `#include <project_vertex>
{
  vec4 wp = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
  wp = instanceMatrix * wp;
  #endif
  vWPos = (modelMatrix * wp).xyz;
  vVPos = mvPosition.xyz;
}`);
    const lights = THREE.ShaderChunk.lights_fragment_begin.replace(
      'getDirectionalLightInfo( directionalLight, directLight );',
      'getDirectionalLightInfo( directionalLight, directLight );\n\t\tdirectLight.color *= cloudSun;',
    );
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uWet;
uniform vec2 uCamPix;
uniform vec4 uVision;
uniform vec4 uExploredBox;
uniform sampler2D uExplored;
varying vec3 vWPos;
varying vec3 vVPos;
uniform vec4 uSee[${SEE_SLOTS}];
${NOISE_GLSL}`)
      // What is in sight is as it is; what was seen before is remembered in grey; the rest is black.
      .replace('#include <fog_fragment>', `#include <fog_fragment>
if (uVision.w > 0.0) {
  float seen = 1.0 - smoothstep(uVision.z, uVision.w, length(vWPos.xz - uVision.xy));
  vec2 euv = (vWPos.xz - uExploredBox.xy) / uExploredBox.z;
  float known = (euv.x > 0.0 && euv.x < 1.0 && euv.y > 0.0 && euv.y < 1.0) ? texture2D(uExplored, euv).r : 0.0;
  float lum = dot(gl_FragColor.rgb, vec3(0.3, 0.59, 0.11));
  vec3 remembered = vec3(lum * 0.62) * vec3(0.92, 0.95, 1.0) * known;
  gl_FragColor.rgb = mix(remembered, gl_FragColor.rgb, seen);
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
${o.seeThrough ? `for (int i = 0; i < ${SEE_SLOTS}; i++) {
  vec4 s = uSee[i];
  // Only what is nearer the camera than the person, and inside the oval around them.
  if (s.w > 0.0 && -vVPos.z < s.z - ${SEE_RADIUS.margin.toFixed(2)}) {
    vec2 d = (vVPos.xy - s.xy) / vec2(${SEE_RADIUS.x.toFixed(2)}, ${SEE_RADIUS.y.toFixed(2)});
    float e = dot(d, d);
    if (e < 1.0) {
      // Dithered in whole pixels: mostly gone in the middle, thinning to nothing at the rim.
      float a = 0.88 * (1.0 - smoothstep(0.35, 1.0, e));
      float h = fract(52.9829189 * fract(dot(floor(gl_FragCoord.xy), vec2(0.06711056, 0.00583715))));
      if (h < a) discard;
    }
  }
}` : ''}
${o.wettable ? 'diffuseColor.rgb *= 1.0 - uWet * 0.28;' : ''}
${shell ? `{
  // Locked to the world's pixel grid; cells are 1 × 2 pixels, so the fringe reads as strands.
  vec2 cell = floor(gl_FragCoord.xy) + uCamPix;
  float r = shHash(int(cell.x), int(floor(cell.y / 2.0)), ${shell.layer * 31 + 7});
  if (r > ${shell.density.toFixed(3)}) discard;
  diffuseColor.rgb *= ${shell.tint.toFixed(3)};
}` : ''}`)
      .replace('#include <lights_fragment_begin>', `float cloudSun = 1.0 - cloudDensity(vWPos.xz) * uCloud.y;
${lights}`);
  };
}

/** A lit material with the world's weather patched in. */
export function lit(o: LitOpts = {}): THREE.MeshLambertMaterial {
  const mat = new THREE.MeshLambertMaterial({
    map: o.map ?? null,
    color: o.color ?? 0xffffff,
    vertexColors: !!o.ao,
    alphaTest: o.sprite ? 0.5 : 0,
    side: o.sprite ? THREE.DoubleSide : THREE.FrontSide,
    emissiveMap: o.emissiveMap ?? null,
    emissive: o.emissive ?? 0x000000,
  });
  patch(mat, o);
  return mat;
}

/** The shell version of a lit material: pushed out along the normal, sparse, pixel-locked. */
export function shellOf(base: THREE.MeshLambertMaterial, o: LitOpts, s: ShellOpts): THREE.MeshLambertMaterial {
  const mat = new THREE.MeshLambertMaterial({ map: base.map, color: base.color, vertexColors: base.vertexColors, side: THREE.FrontSide });
  patch(mat, o, s);
  return mat;
}

/** Nearest-filtered, repeating texture from raw RGBA, `ppm` texels per metre when UVs are in metres. */
export function pixTexture(data: Uint8ClampedArray, w: number, h: number, opts: { flip?: boolean; ppm?: number; mips?: boolean } = {}): THREE.DataTexture {
  let bytes = new Uint8Array(data.buffer.slice(0));
  if (opts.flip) {
    const out = new Uint8Array(bytes.length);
    for (let y = 0; y < h; y++) out.set(bytes.subarray(y * w * 4, (y + 1) * w * 4), (h - 1 - y) * w * 4);
    bytes = out;
  }
  const t = new THREE.DataTexture(bytes, w, h, THREE.RGBAFormat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = opts.mips === false ? THREE.NearestFilter : THREE.NearestMipmapNearestFilter;
  t.generateMipmaps = opts.mips !== false;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (opts.ppm) t.repeat.set(opts.ppm / w, opts.ppm / h);
  t.needsUpdate = true;
  return t;
}
