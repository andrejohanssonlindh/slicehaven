import * as THREE from 'three';
import { CLOUD_SCALE, CLOUD_SEED } from '../core/world3d/sky';
import { RAYS } from '../core/world3d/vision';

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
  /** Ground mist: x how thick (0..1), y how high it stands above the ground (metres), z the ground level at the focus, w how much `uMistColor` tints it instead of the sky's fog colour (0..1; magic). */
  uMist: { value: new THREE.Vector4(0, 2.2, 0, 0) },
  /** Where the mist is thinnest (the view's focus, xz) and its tint, used when `uMist.w` > 0. */
  uMistAt: { value: new THREE.Vector2(0, 0) },
  uMistColor: { value: new THREE.Vector3(0.7, 0.72, 0.76) },
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
  /** The cone of sight: x the way the hero faces (radians, atan2(z, x)), y half the cone's width, z its soft edge, w the radius of all-round awareness. */
  uSight: { value: new THREE.Vector4(0, 1, 0.3, 3) },
  /** How far behind the hero the cone's point lies, metres (`VisionSpec.back`). */
  uSightBack: { value: 0 },
  /** Shining things in view (torches, fires): xy where, z the radius they light, w how clearly (0: unused). Seen from far beyond plain sight. */
  uLights: { value: Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, 0, 0)) },
  /** How far the eye sees along each ray round the hero, as a share of the range (see `sightTexture`). */
  uSightRays: { value: null as THREE.DataTexture | null },
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

/** The sight rays (`core/world3d/vision.ts`), one texel each round the circle, a half float: the share of the range; wraps round. */
export const SIGHT_RAYS = RAYS;
export const sightTexture = ((): THREE.DataTexture => {
  const t = new THREE.DataTexture(new Uint16Array(SIGHT_RAYS).fill(THREE.DataUtils.toHalfFloat(1)), SIGHT_RAYS, 1, THREE.RedFormat, THREE.HalfFloatType);
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.needsUpdate = true;
  return t;
})();
WORLD.uSightRays.value = sightTexture;

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
  sway?: { from: number; amount: number; /** Hangs from `from` and swings below it (cloth on a line). */ hang?: boolean };
  /** Gets darker and glossier in the rain. */
  wettable?: boolean;
  /** Standing water collects in the flat low patches of this surface once it is wet (the ground). */
  puddles?: boolean;
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
  const key = `lit:${o.sway ? `s${o.sway.from},${o.sway.amount}${o.sway.hang ? 'h' : ''}` : ''}:${o.wettable ? 'w' : ''}${o.puddles ? 'p' : ''}:${shell ? `sh${shell.layer},${shell.offset},${shell.density},${shell.tint}` : ''}:${o.seeThrough ? 'v' : ''}`;
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
  float hgt = ${o.sway.hang ? `max(0.0, ${o.sway.from.toFixed(2)} - transformed.y)` : `max(0.0, transformed.y - ${o.sway.from.toFixed(2)})`};
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
uniform vec4 uMist;
uniform vec2 uMistAt;
uniform vec3 uMistColor;
uniform float uTime;
uniform float uPixWorld;
uniform vec2 uCamPix;
uniform vec4 uVision;
uniform vec4 uSight;
uniform float uSightBack;
uniform vec4 uLights[6];
uniform sampler2D uSightRays;
uniform vec4 uExploredBox;
uniform sampler2D uExplored;
varying vec3 vWPos;
varying vec3 vVPos;
uniform vec4 uSee[${SEE_SLOTS}];
${NOISE_GLSL}`)
      // What is in sight is as it is; what was seen before is remembered in grey; the rest is black.
      .replace('#include <fog_fragment>', `#include <fog_fragment>
${o.wettable ? `if (uWet > 0.05) {
  // Wet things glint: sparse pixel-sized sparkles on upward faces that shimmer and are brightest in the sun, strongest in pools.
  vec3 gn = normalize(cross(dFdx(vWPos), dFdy(vWPos)));
  vec2 gc = floor(vWPos.xz / uPixWorld);
  float gr = shHash(int(gc.x), int(gc.y), 5 + int(floor(uTime * 2.0)));
  float spark = step(0.993 - poolMask * 0.03, gr);
  float day = clamp(uCloud.y / 0.72, 0.0, 1.0);
  gl_FragColor.rgb += vec3(0.85, 0.92, 1.0) * spark * smoothstep(0.7, 0.95, gn.y) * uWet * cloudSun * day * (0.25 + poolMask * 0.5);
}` : ''}
{
  // Mist: thick near the ground and thinning upward, thicker with distance from the focus, so the hero's own spot stays readable.
  float md = length(vWPos.xz - uMistAt);
  float mh = 1.0 - smoothstep(0.0, uMist.y, vWPos.y - uMist.z);
  float mk = uMist.x * mix(0.25, 1.0, mh) * smoothstep(1.5, mix(34.0, 9.0, uMist.x), md);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(fogColor, uMistColor, uMist.w), clamp(mk, 0.0, 0.92));
}
if (uVision.w > 0.0) {
  // In sight: close by, or in the cone ahead; out to the range; and not behind something solid.
  vec2 dv = vWPos.xz - uVision.xy;
  float sd = length(dv);
  float sa = atan(dv.y, dv.x);
  float ray = texture2D(uSightRays, vec2(fract(sa / 6.2831853) + ${(0.5 / SIGHT_RAYS).toFixed(6)}, 0.5)).r * uVision.w;
  // The cone's point is a little behind the hero, so it is already wide where they stand and meets the small circle.
  vec2 dc = dv + vec2(cos(uSight.x), sin(uSight.x)) * uSightBack;
  float turn = abs(mod(atan(dc.y, dc.x) - uSight.x + 3.1415927, 6.2831853) - 3.1415927);
  float cone = 1.0 - smoothstep(uSight.y - uSight.z, uSight.y, turn);
  float close = 1.0 - smoothstep(uSight.w * 0.8, uSight.w, sd);
  float seen = max(cone, close) * (1.0 - smoothstep(uVision.z, uVision.w, sd)) * (1.0 - smoothstep(ray + 0.1, ray + 0.45, sd));
  // The ground a flame in view lights up is seen however far it is (the flame was checked to be in the clear).
  float litk = 0.0;
  for (int i = 0; i < 6; i++) {
    vec4 l = uLights[i];
    if (l.w > 0.0) litk = max(litk, l.w * (1.0 - smoothstep(l.z * 0.5, l.z, length(vWPos.xz - l.xy))));
  }
  seen = max(seen, litk);
  vec2 euv = (vWPos.xz - uExploredBox.xy) / uExploredBox.z;
  float known = (euv.x > 0.0 && euv.x < 1.0 && euv.y > 0.0 && euv.y < 1.0) ? texture2D(uExplored, euv).r : 0.0;
  float lum = dot(gl_FragColor.rgb, vec3(0.3, 0.59, 0.11));
  // What was seen before keeps most of its colour, a little cooler and dimmer: the step to what is in sight is gentle.
  vec3 remembered = mix(vec3(lum), gl_FragColor.rgb, 0.45) * 0.78 * vec3(0.94, 0.97, 1.0) * known;
  gl_FragColor.rgb = mix(remembered, gl_FragColor.rgb, seen);
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float poolMask = 0.0;
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
${o.puddles ? `if (uWet > 0.3) {
  // Pools sit in the flat parts; the noise is sampled per art pixel so the rim is a hard pixel edge, and it grows as the rain goes on.
  vec3 fn = normalize(cross(dFdx(vWPos), dFdy(vWPos)));
  vec2 pp = floor(vWPos.xz / uPixWorld) * uPixWorld;
  float pool = shFbm(pp / 2.6, 913);
  float edge = 0.71 - (uWet - 0.3) * 0.2;
  float inPool = step(edge, pool) * smoothstep(0.93, 0.99, abs(fn.y));
  // Dark water with a pale sky in it, a ring of ripples while it falls.
  float ripple = uWet > 0.55 ? 0.5 + 0.5 * sin(length(pp - floor(pp * 0.9 + 0.5) / 0.9) * 40.0 - uTime * 6.0) : 0.0;
  vec3 water = vec3(0.13, 0.18, 0.25) + vec3(0.07, 0.09, 0.12) * smoothstep(edge, edge + 0.1, pool) + ripple * 0.03;
  diffuseColor.rgb = mix(diffuseColor.rgb, water, inPool * 0.8);
  poolMask = inPool;
}` : ''}
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
