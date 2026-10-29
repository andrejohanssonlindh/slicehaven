import * as THREE from 'three';
import { type Ground3D, WATER_Y, groundHeight, riverFlow } from '../core/world3d/terrain';
import { TEXELS_PER_M } from '../core/world3d/tiers';
import { NOISE_GLSL, VISION_BODY, VISION_DECLS, VISION_UNIFORMS, WORLD } from './materials';

/**
 * Still water: one plane at the water line. Depth comes from the terrain (a
 * small texture), so it is pale and see-through at the bank and dark in the
 * middle, with foam where it laps the shore. Ripples drift with the wind and
 * are snapped to the art-pixel grid, so they read as pixels, not as smooth CG.
 */

const VERT = /* glsl */ `
varying vec3 vWPos;
#include <fog_pars_vertex>
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWPos = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */ `
uniform sampler2D tDepth;
uniform vec4 uDepthRect;
uniform float uTime;
uniform vec3 uWind;
uniform float uGale;
uniform vec2 uDrift;
uniform vec3 uSun;
uniform vec3 uSky;
uniform vec3 uAmbient;
uniform float uNight;
${VISION_DECLS}
varying vec3 vWPos;
${NOISE_GLSL}
#include <common>
#include <fog_pars_fragment>
void main() {
  vec2 cell = floor(vWPos.xz * ${TEXELS_PER_M.toFixed(1)}) / ${TEXELS_PER_M.toFixed(1)};
  vec4 tx = texture2D(tDepth, (cell - uDepthRect.xy) / uDepthRect.zw);
  float depth = tx.r * 2.0;
  if (depth <= 0.0) discard;
  // A stream runs: its ripples are carried along its way (toward the lake) at a walking pace, the wind's drift only on still water.
  vec2 flow = (tx.gb - 0.5) * 2.0;
  float run = min(1.0, length(flow));
  vec2 drift = uDrift * (1.0 - run) + flow * uTime * 0.9;
  float r1 = shValue(vec2(cell.x * 1.7 - drift.x, cell.y * 4.5 - drift.y), 5);
  float r2 = shValue(vec2(cell.x * 3.1 + uTime * 0.21, cell.y * 7.0 - uTime * 0.13), 6);
  // Wind roughens it: from a stiff breeze the ripples shorten and sharpen, and in a gale the crests break white and the shore foam churns.
  float chop = clamp((uGale - 0.45) / 1.6, 0.0, 1.0);
  float r3 = shValue(vec2(cell.x * 6.0 - drift.x * 2.5, cell.y * 11.0 - drift.y * 2.5), 14);
  float rip = mix(r1 * 0.6 + r2 * 0.4, r1 * 0.35 + r2 * 0.3 + r3 * 0.35, chop);
  vec3 shallow = vec3(0.13, 0.27, 0.3);
  vec3 deep = vec3(0.025, 0.07, 0.16);
  vec3 col = mix(shallow, deep, smoothstep(0.05, 1.3, depth));
  // Sky in the water, broken by ripples.
  col = mix(col, uSky, 0.16 + step(0.64, rip) * 0.12);
  // Light: sun through the clouds plus the ambient.
  float cs = 1.0 - cloudDensity(vWPos.xz) * uCloud.y;
  col *= uAmbient + uSun * cs * 0.55;
  // Glints on ripple crests.
  col += uSun * cs * step(0.8, rip) * 0.15 * (1.0 - uNight * 0.7);
  // Whitecaps on the crests in a gale.
  float cap = step(0.74 - chop * 0.08, rip) * step(0.4, shValue(cell * 5.0 + drift, 15)) * chop;
  col = mix(col, (uAmbient + uSun * cs * 0.5 + 0.25) * vec3(0.85, 0.9, 0.9), cap * 0.75);
  // Foam where it laps the bank.
  float foam = step(depth, 0.09 + 0.05 * sin(uTime * 1.3 + cell.x * 3.0 + cell.y * 2.0) + chop * 0.08) * step(0.45 - chop * 0.1, shValue(cell * 6.0, 9));
  col = mix(col, (uAmbient + uSun * cs * 0.5) * vec3(0.75, 0.8, 0.78), foam * 0.8);
  // Duckweed in the sheltered shallows.
  float weed = step(0.66, shFbm(cell * 0.7, 12)) * step(depth, 0.7);
  col = mix(col, (uAmbient + uSun * cs * 0.6) * vec3(0.22, 0.36, 0.12), weed * step(0.35, shValue(cell * 9.0, 13)));
  float a = mix(0.55, 0.94, smoothstep(0.0, 0.8, depth));
  gl_FragColor = vec4(col, max(a, max(foam, weed) * 0.95));
  #include <fog_fragment>
  ${VISION_BODY}
  #include <colorspace_fragment>
}`;

export interface Water {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  /** A circle that holds all the water (to skip drawing it when it is far from view). */
  bounds: { x: number; z: number; r: number };
  /** Light it to match the sky. Colours linear. */
  light(sun: THREE.Color, sunI: number, sky: THREE.Color, ambient: THREE.Color, night: number): void;
}

export function makeWater(g: Ground3D): Water | null {
  if (!g.lake && !g.rivers?.length) return null;
  // The rectangle that holds the lake and every stream (with a margin for the banks).
  let ax = Infinity, az = Infinity, bx = -Infinity, bz = -Infinity;
  const take = (x: number, z: number, m: number): void => {
    ax = Math.min(ax, x - m);
    az = Math.min(az, z - m);
    bx = Math.max(bx, x + m);
    bz = Math.max(bz, z + m);
  };
  if (g.lake) take(g.lake.x, g.lake.z, g.lake.r * 1.6);
  for (const r of g.rivers ?? []) for (const [x, z] of r.pts) take(x, z, r.width + 3);
  const spanX = bx - ax, spanZ = bz - az;
  const x0 = ax, z0 = az;
  // Per texel (4 a metre): depth below the water line, 0..2 m, in red; the stream's way in green and blue (0.5 is still).
  const nx = Math.ceil(spanX * 4), nz = Math.ceil(spanZ * 4);
  const data = new Uint8Array(nx * nz * 4);
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const x = x0 + ((i + 0.5) / nx) * spanX, z = z0 + ((j + 0.5) / nz) * spanZ;
      const d = WATER_Y - groundHeight(g, x, z);
      const v = Math.max(0, Math.min(255, Math.round((d / 2) * 255)));
      let fx = 0, fz = 0;
      if (g.rivers && d > 0) {
        const f = riverFlow(g, x, z);
        fx = f.x * f.k;
        fz = f.z * f.k;
      }
      data.set([v, Math.round((0.5 + fx * 0.5) * 255), Math.round((0.5 + fz * 0.5) * 255), 255], (j * nx + i) * 4);
    }
  }
  const depth = new THREE.DataTexture(data, nx, nz, THREE.RGBAFormat);
  depth.minFilter = depth.magFilter = THREE.LinearFilter;
  depth.needsUpdate = true;
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      tDepth: { value: depth },
      uDepthRect: { value: new THREE.Vector4(x0, z0, spanX, spanZ) },
      uSun: { value: new THREE.Color(1, 1, 1) },
      uSky: { value: new THREE.Color(0.5, 0.6, 0.8) },
      uAmbient: { value: new THREE.Color(0.4, 0.4, 0.4) },
      uNight: { value: 0 },
    }]),
    transparent: true,
    depthWrite: false,
    fog: true,
  });
  // Share the live world uniforms (time, wind, clouds) by reference.
  mat.uniforms.uTime = WORLD.uTime;
  mat.uniforms.uWind = WORLD.uWind;
  mat.uniforms.uGale = WORLD.uGale;
  mat.uniforms.uDrift = WORLD.uDrift;
  mat.uniforms.uCloud = WORLD.uCloud;
  for (const k of VISION_UNIFORMS) mat.uniforms[k] = WORLD[k];
  mat.uniforms.tDepth.value = depth;
  const geo = new THREE.PlaneGeometry(spanX, spanZ);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x0 + spanX / 2, WATER_Y, z0 + spanZ / 2);
  mesh.renderOrder = 2;
  return {
    mesh,
    bounds: { x: x0 + spanX / 2, z: z0 + spanZ / 2, r: Math.hypot(spanX, spanZ) / 2 },
    light(sun, sunI, sky, ambient, night) {
      mat.uniforms.uSun.value.copy(sun).multiplyScalar(sunI * 0.4);
      mat.uniforms.uSky.value.copy(sky);
      mat.uniforms.uAmbient.value.copy(ambient);
      mat.uniforms.uNight.value = night;
    },
  };
}
