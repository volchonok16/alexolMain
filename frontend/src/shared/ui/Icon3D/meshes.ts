import * as THREE from 'three';

export type Icon3DType =
  | 'web'
  | 'cloud'
  | 'enterprise'
  | 'backend'
  | 'ecommerce'
  | 'ai'
  | 'frontend'
  | 'mobile'
  | 'automation'
  | 'simplification'
  | 'transparency'
  | 'reliability'
  | 'adaptation'
  | 'efficiency';

const extrude = {
  depth: 0.28,
  bevelEnabled: true,
  bevelThickness: 0.04,
  bevelSize: 0.03,
  bevelSegments: 1,
  curveSegments: 8,
} as const;

const add = (group: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
};

const crisp = {
  depth: 0.34,
  bevelEnabled: true,
  bevelThickness: 0.055,
  bevelSize: 0.045,
  bevelSegments: 2,
  curveSegments: 20,
} as const;

const thin = {
  ...crisp,
  depth: 0.16,
  bevelThickness: 0.03,
  bevelSize: 0.025,
} as const;

export const createIconGroup = (
  type: Icon3DType,
  primary: THREE.MeshStandardMaterial,
  accent: THREE.MeshStandardMaterial,
  pose: 'orbit' | 'front' = 'orbit',
): THREE.Group => {
  const group = new THREE.Group();

  switch (type) {
    case 'web': {
      const wire = primary.clone();
      wire.wireframe = true;
      wire.metalness = 0.3;
      wire.roughness = 0.32;
      add(group, new THREE.IcosahedronGeometry(0.92, 1), wire);
      add(group, new THREE.SphereGeometry(0.42, 20, 16), accent);
      break;
    }
    case 'cloud': {
      add(group, new THREE.SphereGeometry(0.42, 18, 14), primary, -0.42, -0.08, 0);
      add(group, new THREE.SphereGeometry(0.58, 20, 16), accent, 0.02, 0.12, 0);
      add(group, new THREE.SphereGeometry(0.38, 16, 14), primary, 0.48, -0.06, 0.04);
      break;
    }
    case 'enterprise': {
      add(group, new THREE.BoxGeometry(0.52, 1.35, 0.52), primary, -0.22, 0, 0);
      add(group, new THREE.BoxGeometry(0.38, 0.92, 0.38), accent, 0.32, -0.21, 0.06);
      add(group, new THREE.BoxGeometry(0.22, 0.58, 0.22), primary, 0.08, -0.38, 0.28);
      break;
    }
    case 'backend': {
      const cyl = () => new THREE.CylinderGeometry(0.58, 0.58, 0.26, 24);
      add(group, cyl(), primary, 0, 0.38, 0);
      add(group, cyl(), accent, 0, 0, 0);
      add(group, cyl(), primary, 0, -0.38, 0);
      break;
    }
    case 'ecommerce': {
      add(group, new THREE.BoxGeometry(0.95, 0.12, 0.62), primary, 0, -0.08, 0);
      add(group, new THREE.BoxGeometry(0.12, 0.48, 0.62), primary, -0.42, 0.16, 0);
      add(group, new THREE.BoxGeometry(0.12, 0.48, 0.62), primary, 0.42, 0.16, 0);
      add(group, new THREE.BoxGeometry(0.95, 0.12, 0.12), accent, 0, 0.34, 0.25);
      add(group, new THREE.CylinderGeometry(0.14, 0.14, 0.12, 16), accent, -0.28, -0.32, 0.18).rotation.x =
        Math.PI / 2;
      add(group, new THREE.CylinderGeometry(0.14, 0.14, 0.12, 16), accent, 0.28, -0.32, 0.18).rotation.x =
        Math.PI / 2;
      break;
    }
    case 'ai': {
      add(group, new THREE.IcosahedronGeometry(0.72, 0), primary);
      add(group, new THREE.TorusGeometry(0.95, 0.06, 10, 28), accent).rotation.x = Math.PI / 2.4;
      break;
    }
    case 'frontend': {
      const left = new THREE.Shape();
      left.moveTo(0.3, 0.78);
      left.lineTo(-0.52, 0);
      left.lineTo(0.3, -0.78);
      left.lineTo(0.12, -0.78);
      left.lineTo(-0.7, 0);
      left.lineTo(0.12, 0.78);
      left.closePath();

      const right = new THREE.Shape();
      right.moveTo(-0.3, 0.78);
      right.lineTo(0.52, 0);
      right.lineTo(-0.3, -0.78);
      right.lineTo(-0.12, -0.78);
      right.lineTo(0.7, 0);
      right.lineTo(-0.12, 0.78);
      right.closePath();

      add(group, new THREE.ExtrudeGeometry(left, extrude), primary, -0.18, 0, -0.14);
      add(group, new THREE.ExtrudeGeometry(right, extrude), primary, 0.18, 0, -0.14);
      add(group, new THREE.BoxGeometry(0.12, 1.02, 0.28), accent).rotation.z = -0.35;
      break;
    }
    case 'mobile': {
      add(group, new THREE.BoxGeometry(0.62, 1.18, 0.16), primary);
      add(group, new THREE.BoxGeometry(0.46, 0.78, 0.04), accent, 0, 0.06, 0.1);
      add(group, new THREE.SphereGeometry(0.07, 12, 12), accent, 0, -0.48, 0.1);
      break;
    }
    case 'automation': {
      add(group, new THREE.BoxGeometry(0.28, 1.05, 0.28), primary, -0.48, 0.02, 0);
      add(group, new THREE.BoxGeometry(0.28, 0.74, 0.28), accent, -0.12, -0.135, 0);
      add(group, new THREE.BoxGeometry(0.28, 0.48, 0.28), primary, 0.24, -0.265, 0);
      const arrow = new THREE.Shape();
      arrow.moveTo(0.08, 0.42);
      arrow.lineTo(0.72, -0.28);
      arrow.lineTo(0.52, -0.28);
      arrow.lineTo(0.78, -0.62);
      arrow.lineTo(0.98, -0.18);
      arrow.lineTo(0.78, -0.18);
      arrow.lineTo(0.22, 0.42);
      arrow.closePath();
      add(group, new THREE.ExtrudeGeometry(arrow, thin), accent, 0.02, 0.12, 0.18);
      break;
    }
    case 'simplification': {
      add(group, new THREE.SphereGeometry(0.22, 20, 16), accent, -0.32, 0.46, 0);
      add(group, new THREE.CapsuleGeometry(0.2, 0.38, 6, 14), primary, -0.32, -0.08, 0);
      add(group, new THREE.SphereGeometry(0.18, 18, 14), accent, 0.34, 0.32, 0.16);
      add(group, new THREE.CapsuleGeometry(0.16, 0.3, 6, 14), primary, 0.34, -0.16, 0.16);
      const ring = add(group, new THREE.TorusGeometry(0.78, 0.045, 10, 32), accent);
      ring.rotation.x = Math.PI / 2.2;
      ring.position.y = -0.02;
      break;
    }
    case 'transparency': {
      const lid = new THREE.Shape();
      lid.moveTo(-0.76, 0);
      lid.quadraticCurveTo(0, 0.5, 0.76, 0);
      lid.quadraticCurveTo(0, -0.5, -0.76, 0);
      lid.closePath();
      add(group, new THREE.ExtrudeGeometry(lid, thin), primary);
      add(group, new THREE.SphereGeometry(0.32, 22, 18), accent, 0, 0, 0.14);
      add(group, new THREE.SphereGeometry(0.14, 16, 14), primary, 0.03, 0.03, 0.38);
      add(group, new THREE.SphereGeometry(0.05, 10, 8), accent, 0.06, 0.07, 0.46);
      break;
    }
    case 'reliability': {
      const shield = new THREE.Shape();
      shield.moveTo(0, 0.88);
      shield.quadraticCurveTo(0.22, 0.78, 0.62, 0.62);
      shield.lineTo(0.62, 0.08);
      shield.quadraticCurveTo(0.58, -0.42, 0, -0.92);
      shield.quadraticCurveTo(-0.58, -0.42, -0.62, 0.08);
      shield.lineTo(-0.62, 0.62);
      shield.quadraticCurveTo(-0.22, 0.78, 0, 0.88);
      shield.closePath();
      add(group, new THREE.ExtrudeGeometry(shield, crisp), primary);
      const check = new THREE.Shape();
      check.moveTo(-0.3, 0.04);
      check.lineTo(-0.1, -0.24);
      check.lineTo(0.36, 0.32);
      check.lineTo(0.24, 0.42);
      check.lineTo(-0.1, -0.02);
      check.lineTo(-0.2, 0.14);
      check.closePath();
      add(group, new THREE.ExtrudeGeometry(check, thin), accent, 0, 0.02, 0.2);
      break;
    }
    case 'adaptation': {
      const bolt = new THREE.Shape();
      bolt.moveTo(0.22, 0.92);
      bolt.lineTo(-0.28, 0.08);
      bolt.lineTo(0.08, 0.08);
      bolt.lineTo(-0.22, -0.92);
      bolt.lineTo(0.3, -0.02);
      bolt.lineTo(-0.06, -0.02);
      bolt.closePath();
      add(group, new THREE.ExtrudeGeometry(bolt, crisp), primary);
      add(group, new THREE.SphereGeometry(0.09, 12, 10), accent, 0.34, 0.62, 0.12);
      add(group, new THREE.SphereGeometry(0.06, 10, 8), accent, -0.38, -0.52, 0.1);
      break;
    }
    case 'efficiency': {
      add(group, new THREE.BoxGeometry(0.26, 0.42, 0.26), primary, -0.5, -0.28, 0);
      add(group, new THREE.BoxGeometry(0.26, 0.68, 0.26), accent, -0.16, -0.15, 0);
      add(group, new THREE.BoxGeometry(0.26, 0.94, 0.26), primary, 0.18, -0.02, 0);
      add(group, new THREE.BoxGeometry(0.26, 1.18, 0.26), accent, 0.52, 0.1, 0);
      const arrow = new THREE.Shape();
      arrow.moveTo(-0.12, -0.18);
      arrow.lineTo(0.42, 0.48);
      arrow.lineTo(0.22, 0.48);
      arrow.lineTo(0.58, 0.78);
      arrow.lineTo(0.62, 0.32);
      arrow.lineTo(0.42, 0.32);
      arrow.lineTo(-0.02, -0.22);
      arrow.closePath();
      add(group, new THREE.ExtrudeGeometry(arrow, thin), accent, -0.02, 0.18, 0.2);
      break;
    }
  }

  group.rotation.set(
    pose === 'front' ? 0.2 : 0.38,
    pose === 'front' ? (type === 'transparency' ? 0.24 : 0.46) : 0.85,
    pose === 'front' ? 0.04 : 0.1,
  );
  group.scale.setScalar(
    {
      web: 0.84,
      ai: 0.82,
      cloud: 0.88,
      enterprise: 0.9,
      backend: 0.9,
      ecommerce: 0.86,
      frontend: 0.84,
      mobile: 0.9,
      automation: 0.9,
      simplification: 0.92,
      transparency: 0.86,
      reliability: 0.9,
      adaptation: 0.92,
      efficiency: 0.88,
    }[type],
  );

  if (type === 'transparency') {
    group.position.y = -0.03;
  }

  return group;
};

export const collectGeometries = (group: THREE.Group) => {
  const geometries: THREE.BufferGeometry[] = [];
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) geometries.push(obj.geometry);
  });
  return geometries;
};
