import * as THREE from 'three';
import { collectGeometries, createIconGroup, type Icon3DType } from './meshes';
import { ICON_COLORS, type ThemeName } from './palette';

const SIZE = 192;
const ROTATE_SPEED = 0.55;
const CAMERA_Z: Partial<Record<Icon3DType, number>> = {
  development: 4.35,
  design: 4.1,
  testing: 4.1,
  support: 4.08,
  reliability: 4.02,
  efficiency: 3.98,
  automation: 3.95,
  adaptation: 3.92,
  transparency: 4.02,
  outsourcing: 3.9,
  consulting: 3.9,
  architecture: 4.02,
  platforms: 3.98,
  integrations: 3.88,
  clock: 3.82,
  headphones: 3.9,
  whatsapp: 3.82,
  message: 3.85,
  phone: 3.85,
  mail: 3.85,
  telegram: 3.8,
  launch: 3.98,
  scale: 3.95,
};

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
  view.primary.emissiveIntensity = dark ? (solid ? 0.32 : 0.62) : solid ? 0.2 : 0.36;
  view.primary.metalness = dark ? (solid ? 0.62 : 0.54) : solid ? 0.34 : 0.28;
  view.primary.roughness = dark ? (solid ? 0.24 : 0.2) : solid ? 0.28 : 0.26;

  view.accent.color.set(colors.accent);
  view.accent.emissive.set(colors.accent);
  view.accent.emissiveIntensity = dark ? (solid ? 0.18 : 0.38) : solid ? 0.12 : 0.2;
  view.accent.metalness = dark ? 0.2 : 0.12;
  view.accent.roughness = dark ? 0.14 : 0.22;

  view.fill.color.set(colors.glow);
  view.fill.intensity = dark ? (solid ? 1 : 0.75) : solid ? 0.82 : 0.7;
  view.glow.color.set(colors.glow);
  view.glow.intensity = dark ? (solid ? 0.65 : 1) : solid ? 0.55 : 0.78;
  view.rim.color.set(colors.rim);
  view.rim.intensity = dark ? (solid ? 0.9 : 0.68) : solid ? 0.58 : 0.72;

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
  options: { spin?: boolean; pose?: 'front' | 'orbit' } = {},
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
  const staticPose = options.spin === false;
  const pose = options.pose ?? (staticPose ? 'front' : 'orbit');
  const group = createIconGroup(type, primary, accent, pose);
  const materials: THREE.MeshStandardMaterial[] = [];
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
      materials.push(obj.material);
    }
  });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  const defaultZ = staticPose ? 3.68 : 4.05;
  camera.position.set(0, 0, CAMERA_Z[type] ?? defaultZ);

  const ambient = new THREE.AmbientLight(0xffffff, staticPose ? 0.32 : 0.38);
  const key = new THREE.DirectionalLight(0xffffff, staticPose ? 2.05 : 1.65);
  key.position.set(3.4, 3.2, 4.6);
  const fill = new THREE.DirectionalLight(0x3d9eff, staticPose ? 0.9 : 0.75);
  fill.position.set(-3.2, -1.2, 2.4);
  const bounce = new THREE.DirectionalLight(0x1a3355, staticPose ? 0.42 : 0.32);
  bounce.position.set(0.6, -2.4, 1.6);
  const glow = new THREE.PointLight(0x0ae3ff, 1.05, 6);
  glow.position.set(0.4, 0.6, 2);
  const rim = new THREE.PointLight(0x8b9bff, staticPose ? 0.82 : 0.7, 5);
  rim.position.set(-1.2, 0.8, -1);
  scene.add(group, ambient, key, fill, bounce, glow, rim);

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
