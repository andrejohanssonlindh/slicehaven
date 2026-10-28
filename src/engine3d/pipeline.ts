import * as THREE from 'three';
import { P } from '../art/palette';
import { pixelFactor } from '../core/world3d/tiers';

/**
 * The pixel pipeline: render the 3D scene into a small target (one texel per
 * "art pixel"), then draw it to the screen at a whole-number scale with
 * nearest sampling. On the way it draws outlines from depth (silhouettes and
 * creases, in a darkened local colour, never black) and pulls colours toward
 * the game palette.
 */

const POST_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const POST_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 uRes;
uniform float uNear, uFar, uPix;
uniform float uOutline;
uniform float uPalette;
uniform vec2 uCamPix;
uniform vec3 uPal[PAL_N];
varying vec2 vUv;

float depthAt(vec2 px) {
  return texture2D(tDepth, (px + 0.5) / uRes).r * (uFar - uNear);
}
vec3 posAt(vec2 px) { return vec3(px * uPix, depthAt(px)); }

const float BAYER[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);

void main() {
  vec2 px = floor(vUv * uRes);
  vec3 col = texture2D(tColor, (px + 0.5) / uRes).rgb;
  float d = depthAt(px);
  if (uOutline > 0.0 && d < (uFar - uNear) * 0.999) {
    float dl = depthAt(px + vec2(-1, 0)), dr = depthAt(px + vec2(1, 0));
    float du = depthAt(px + vec2(0, 1)), dd = depthAt(px + vec2(0, -1));
    // Silhouette: a neighbour is well behind this pixel, so this is the near object's edge.
    float gap = max(max(dl, dr), max(du, dd)) - d;
    float sil = step(0.6, gap);
    // Crease: the surface turns sharply (normals rebuilt from depth).
    vec3 p = posAt(px);
    vec3 n = normalize(cross(posAt(px + vec2(1, 0)) - p, posAt(px + vec2(0, 1)) - p));
    vec3 nl = normalize(cross(p - posAt(px + vec2(-1, 0)), posAt(px + vec2(-1, 1)) - posAt(px + vec2(-1, 0))));
    vec3 nd = normalize(cross(posAt(px + vec2(1, -1)) - posAt(px + vec2(0, -1)), p - posAt(px + vec2(0, -1))));
    float crease = (1.0 - sil) * step(gap, 0.3) * step(min(dot(n, nl), dot(n, nd)), 0.6);
    // Darkened local colour, shifted cool: never pure black.
    vec3 dark = col * vec3(0.42, 0.4, 0.5);
    col = mix(col, dark, uOutline * (sil + crease * 0.5));
  }
  if (uPalette > 0.0) {
    // Ordered dither locked to the world, then the nearest palette colour.
    vec2 cell = mod(px + uCamPix, 4.0);
    float th = (BAYER[int(cell.y) * 4 + int(cell.x)] + 0.5) / 16.0 - 0.5;
    vec3 c = clamp(col + th * 0.06, 0.0, 1.0);
    vec3 best = c; float bd = 1e9;
    for (int i = 0; i < PAL_N; i++) {
      vec3 e = (uPal[i] - c) * vec3(0.8, 1.0, 0.6);
      float dd2 = dot(e, e);
      if (dd2 < bd) { bd = dd2; best = uPal[i]; }
    }
    col = mix(col, best, uPalette);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

/** The game palette as linear colours (the post pass works in linear space). */
function paletteLinear(): THREE.Vector3[] {
  const ramps = [P.grass, P.moss, P.floor, P.leaf, P.dirt, P.stone, P.water, P.bark, P.foliage, P.flower,
    ['#1b1424', '#3a2a44', '#5e4a5e', '#e8a23c', '#f4c25a', '#ffe08a', '#fff2b8', '#a8423a', '#e6dbb9', '#cfc29f', '#b0a282', '#87795f']];
  const out: THREE.Vector3[] = [];
  for (const r of ramps) for (const hex of r) {
    const c = new THREE.Color(hex);
    out.push(new THREE.Vector3(c.r, c.g, c.b));
  }
  return out;
}

export interface PipelineSettings {
  /** CSS pixels per rendered pixel. */
  pixelCss: number;
  outline: number;
  palette: number;
}

export class Pipeline {
  readonly renderer: THREE.WebGLRenderer;
  private target: THREE.WebGLRenderTarget;
  private post: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private postScene = new THREE.Scene();
  private postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  /** Rendered size (low-res) and the whole-number upscale. */
  rw = 1;
  rh = 1;
  factor = 1;
  private halfFloat = false;

  constructor(readonly canvas: HTMLCanvasElement, public settings: PipelineSettings) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Linear light in 8 bits bands in the dark; use half floats where the GPU can render to them.
    const ext = this.renderer.extensions;
    this.halfFloat = ext.has('EXT_color_buffer_half_float') || ext.has('EXT_color_buffer_float');
    this.target = this.makeTarget(1, 1);
    const pal = paletteLinear();
    const mat = new THREE.ShaderMaterial({
      vertexShader: POST_VERT,
      fragmentShader: POST_FRAG,
      defines: { PAL_N: pal.length },
      uniforms: {
        tColor: { value: this.target.texture },
        tDepth: { value: this.target.depthTexture },
        uRes: { value: new THREE.Vector2(1, 1) },
        uNear: { value: 0 }, uFar: { value: 1 }, uPix: { value: 1 / 21 },
        uOutline: { value: settings.outline },
        uPalette: { value: settings.palette },
        uCamPix: { value: new THREE.Vector2() },
        uPal: { value: pal },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.post = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    this.post.frustumCulled = false;
    this.postScene.add(this.post);
  }

  private makeTarget(w: number, h: number): THREE.WebGLRenderTarget {
    const t = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
      type: this.halfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType,
    });
    t.depthTexture = new THREE.DepthTexture(w, h, THREE.UnsignedIntType);
    t.depthTexture.minFilter = t.depthTexture.magFilter = THREE.NearestFilter;
    return t;
  }

  /** Fit to the container: low-res target size and canvas size at a whole-number scale. */
  resize(cssW: number, cssH: number, dpr: number): void {
    this.factor = pixelFactor(dpr, this.settings.pixelCss);
    this.rw = Math.max(1, Math.ceil((cssW * dpr) / this.factor));
    this.rh = Math.max(1, Math.ceil((cssH * dpr) / this.factor));
    this.renderer.setSize(this.rw * this.factor, this.rh * this.factor, false);
    this.canvas.style.width = `${(this.rw * this.factor) / dpr}px`;
    this.canvas.style.height = `${(this.rh * this.factor) / dpr}px`;
    this.target.setSize(this.rw, this.rh);
    this.post.material.uniforms.uRes.value.set(this.rw, this.rh);
  }

  render(scene: THREE.Scene, cam: THREE.OrthographicCamera, camPix: THREE.Vector2, pixWorld: number): void {
    const u = this.post.material.uniforms;
    u.uOutline.value = this.settings.outline;
    u.uPalette.value = this.settings.palette;
    u.uNear.value = cam.near;
    u.uFar.value = cam.far;
    u.uPix.value = pixWorld;
    u.uCamPix.value.copy(camPix);
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(scene, cam);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCam);
  }
}
