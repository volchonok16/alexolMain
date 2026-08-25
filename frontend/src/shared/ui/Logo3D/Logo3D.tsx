import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '@/shared/contexts';
import './Logo3D.scss';

interface Logo3DProps {
  className?: string;
}

const OUTER_R = 1.55;
const INNER_R = OUTER_R * 0.625;
const CORE_R = OUTER_R * 0.2;
const RING_DEPTH = 0.52;
const ROTATE_SPEED = 0.55;

const THEME_COLORS = {
  dark: {
    ring: '#0AE3FF',
    core: '#FFFFFF',
    ringEmissive: 0.32,
    coreEmissive: 0.06,
  },
  light: {
    ring: '#06B6D4',
    core: '#1E293B',
    ringEmissive: 0.22,
    coreEmissive: 0.04,
  },
} as const;

const createHexShape = (radius: number, clockwise = false) => {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const index = clockwise ? 6 - i : i;
    const angle = Math.PI / 2 + (index * Math.PI) / 3;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
};

const createGeometries = () => {
  const ringShape = createHexShape(OUTER_R);
  ringShape.holes.push(createHexShape(INNER_R, true));

  const ring = new THREE.ExtrudeGeometry(ringShape, {
    depth: RING_DEPTH,
    bevelEnabled: true,
    bevelThickness: 0.045,
    bevelSize: 0.04,
    bevelSegments: 1,
    curveSegments: 1,
  });
  ring.translate(0, 0, -RING_DEPTH / 2);
  ring.computeVertexNormals();

  const sphere = new THREE.SphereGeometry(CORE_R, 24, 24);
  return { ring, sphere };
};

type ThemeName = 'dark' | 'light';

type LogoMaterials = {
  ring: THREE.MeshStandardMaterial;
  core: THREE.MeshStandardMaterial;
};

const applyTheme = (materials: LogoMaterials, theme: ThemeName) => {
  const colors = THEME_COLORS[theme];
  materials.ring.color.set(colors.ring);
  materials.ring.emissive.set(colors.ring);
  materials.ring.emissiveIntensity = colors.ringEmissive;
  materials.core.color.set(colors.core);
  materials.core.emissive.set(theme === 'dark' ? '#ffffff' : '#000000');
  materials.core.emissiveIntensity = colors.coreEmissive;
};

export const Logo3D = ({ className = '' }: Logo3DProps) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const materialsRef = useRef<LogoMaterials | null>(null);
  const { theme } = useTheme();
  const themeRef = useRef<ThemeName>(theme);
  themeRef.current = theme;

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 0, 5.7);

    const geometries = createGeometries();
    const materials = {
      ring: new THREE.MeshStandardMaterial({
        metalness: 0.58,
        roughness: 0.2,
      }),
      core: new THREE.MeshStandardMaterial({
        metalness: 0.12,
        roughness: 0.16,
      }),
    };
    applyTheme(materials, themeRef.current);

    const logo = new THREE.Group();
    logo.name = 'logo';
    logo.scale.setScalar(0.76);
    logo.rotation.set(0.18, 0.45, 0.04);
    logo.add(new THREE.Mesh(geometries.ring, materials.ring));
    logo.add(new THREE.Mesh(geometries.sphere, materials.core));
    scene.add(logo);

    const ambient = new THREE.AmbientLight(0xffffff, 0.35);
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(4, 3.2, 6);
    const fill = new THREE.DirectionalLight(0x1b91f7, 0.42);
    fill.position.set(-3.2, -1.8, 2.4);
    const highlight = new THREE.PointLight(0xffffff, 1.05, 8);
    highlight.position.set(0.7, 0.9, 2.2);
    const glow = new THREE.PointLight(0x0ae3ff, 0.45, 5);
    glow.position.set(0, 0, 1.5);
    scene.add(ambient, key, fill, highlight, glow);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let inView = true;
    let running = false;
    let frame = 0;
    let last = performance.now();

    const resize = () => {
      const { clientWidth, clientHeight } = wrap;
      if (!clientWidth || !clientHeight) return;
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };

    const tick = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!reducedMotion) {
        logo.rotation.y += delta * ROTATE_SPEED;
      }
      renderer.render(scene, camera);
      if (inView) {
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

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) start();
      },
      { threshold: 0.05 }
    );
    observer.observe(wrap);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(wrap);
    resize();
    start();
    materialsRef.current = materials;

    return () => {
      inView = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      materialsRef.current = null;
      geometries.ring.dispose();
      geometries.sphere.dispose();
      materials.ring.dispose();
      materials.core.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (!materialsRef.current) return;
    applyTheme(materialsRef.current, theme);
  }, [theme]);

  return (
    <div ref={wrapRef} className={`logo3d ${className}`.trim()}>
      <canvas ref={canvasRef} className="logo3d__canvas" />
    </div>
  );
};
