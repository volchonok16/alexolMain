import * as THREE from 'three';
import { collectGeometries, createIconGroup, type Icon3DType } from './meshes';
import { ICON_COLORS, type ThemeName } from './palette';

const SIZE = 192;
const ROTATE_SPEED = 0.55;

type IconView = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  group: THREE.Group;
  type: Icon3DType;
  primary: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
  fill: THREE.DirectionalLight;
  glow: THREE.PointLight;
  rim: THREE.PointLight;
  materials: THREE.MeshStandardMaterial[];
  geometries: THREE.BufferGeometry[];
  visible: boolean;
  reducedMotion: boolean;
  staticPose: boolean;
  dirty: boolean;
};

const views = new Set<IconView>();
let renderer: THREE.WebGLRenderer | null = null;
let frame = 0;
let running = false;
let last = 0;

const applyPalette = (
  view: Pick<IconView, 'type' | 'primary' | 'accent' | 'fill' | 'glow' | 'rim' | 'materials' | 'staticPose'>,
  theme: ThemeName
) => {
  const colors = ICON_COLORS[view.type][theme];
  const dark = theme === 'dark';
  const solid = view.staticPose;

  view.primary.color.set(colors.primary);
  view.primary.emissive.set(colors.primary);
  view.primary.emissiveIntensity = dark ? (solid ? 0.28 : 0.58) : solid ? 0.22 : 0.4;
  view.primary.metalness = dark ? (solid ? 0.62 : 0.52) : 0.26;
  view.primary.roughness = dark ? (solid ? 0.28 : 0.22) : 0.3;

  view.accent.color.set(colors.accent);
  view.accent.emissive.set(colors.accent);
  view.accent.emissiveIntensity = dark ? (solid ? 0.16 : 0.34) : 0.22;
  view.accent.metalness = dark ? 0.18 : 0.1;
  view.accent.roughness = dark ? 0.16 : 0.24;

  view.fill.color.set(colors.glow);
  view.fill.intensity = dark ? (solid ? 0.95 : 0.7) : 0.95;
  view.glow.color.set(colors.glow);
  view.glow.intensity = dark ? (solid ? 0.55 : 0.95) : 1.2;
  view.rim.color.set(colors.rim);
  view.rim.intensity = dark ? (solid ? 0.85 : 0.62) : 0.88;

  for (const material of view.materials) {
    if (material === view.primary || material === view.accent) continue;
    material.color.copy(view.primary.color);
    material.emissive.copy(view.primary.emissive);
    material.emissiveIntensity = view.primary.emissiveIntensity;
    material.metalness = view.primary.metalness;
    material.roughness = view.primary.roughness;
  }
};

const ensureRenderer = () => {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'low-power',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(1);
  }
  renderer.setSize(SIZE, SIZE, false);
  return renderer;
};

const tick = (now: number) => {
  const delta = Math.min((now - last) / 1000, 0.05);
  last = now;
  const gl = ensureRenderer();
  let keepRunning = false;

  for (const view of views) {
    if (!view.visible) continue;
    const spinning = !view.staticPose && !view.reducedMotion;
    if (!spinning && !view.dirty) continue;
    if (spinning) {
      view.group.rotation.y += delta * ROTATE_SPEED;
      keepRunning = true;
    }
    gl.render(view.scene, view.camera);
    view.ctx.clearRect(0, 0, SIZE, SIZE);
    view.ctx.drawImage(gl.domElement, 0, 0, SIZE, SIZE);
    view.dirty = false;
  }

  if (keepRunning) {
    frame = requestAnimationFrame(tick);
  } else {
    running = false;
  }
};

const start = () => {
  if (running) return;
  running = true;
  last = performance.now();
  frame = requestAnimationFrame(tick);
};

export const registerIcon3D = (
  canvas: HTMLCanvasElement,
  type: Icon3DType,
  theme: ThemeName,
  options: { spin?: boolean } = {},
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = SIZE;
  canvas.height = SIZE;

  const primary = new THREE.MeshStandardMaterial({
    metalness: 0.52,
    roughness: 0.22,
  });
  const accent = new THREE.MeshStandardMaterial({
    metalness: 0.18,
    roughness: 0.16,
  });
  const group = createIconGroup(type, primary, accent, options.spin === false ? 'front' : 'orbit');
  const materials: THREE.MeshStandardMaterial[] = [];
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
      materials.push(obj.material);
    }
  });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  const staticPose = options.spin === false;
  camera.position.set(
    0,
    staticPose ? 0.08 : 0,
    staticPose ? (type === 'transparency' ? 3.58 : type === 'development' ? 3.15 : 3.28) : 3.55,
  );

  const ambient = new THREE.AmbientLight(0xffffff, staticPose ? 0.3 : 0.4);
  const key = new THREE.DirectionalLight(0xffffff, staticPose ? 1.9 : 1.5);
  key.position.set(3.6, 2.8, 5.2);
  const fill = new THREE.DirectionalLight(0x3d9eff, staticPose ? 0.85 : 0.7);
  fill.position.set(-3, -1.6, 2.2);
  const glow = new THREE.PointLight(0x0ae3ff, 0.95, 6);
  glow.position.set(0.2, 0.4, 1.8);
  const rim = new THREE.PointLight(0x8b9bff, 0.62, 5);
  rim.position.set(-0.8, 0.6, -1.2);
  scene.add(group, ambient, key, fill, glow, rim);

  const view: IconView = {
    canvas,
    ctx,
    scene,
    camera,
    group,
    type,
    primary,
    accent,
    fill,
    glow,
    rim,
    materials,
    geometries: collectGeometries(group),
    visible: true,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    staticPose,
    dirty: true,
  };
  applyPalette(view, theme);
  views.add(view);
  start();

  const observer = new IntersectionObserver(
    ([entry]) => {
      view.visible = entry.isIntersecting;
      if (view.visible) {
        view.dirty = true;
        start();
      }
    },
    { threshold: 0.05 }
  );
  observer.observe(canvas);

  return {
    setTheme: (next: ThemeName) => {
      applyPalette(view, next);
      view.dirty = true;
      start();
    },
    dispose: () => {
      observer.disconnect();
      views.delete(view);
      view.geometries.forEach((geometry) => geometry.dispose());
      view.materials.forEach((item) => item.dispose());
      if (views.size === 0 && renderer) {
        cancelAnimationFrame(frame);
        running = false;
        renderer.dispose();
        renderer = null;
      }
    },
  };
};
