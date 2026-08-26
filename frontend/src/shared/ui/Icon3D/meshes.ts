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
  | 'efficiency'
  | 'development'
  | 'outsourcing'
  | 'design'
  | 'support'
  | 'consulting'
  | 'functionality'
  | 'architecture'
  | 'platforms'
  | 'integrations'
  | 'clock'
  | 'scale'
  | 'headphones'
  | 'mail'
  | 'phone'
  | 'whatsapp'
  | 'message'
  | 'telegram'
  | 'estimation'
  | 'contract'
  | 'requirements'
  | 'testing'
  | 'launch';

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

const roundedRect = (w: number, h: number, r: number) => {
  const shape = new THREE.Shape();
  const hw = w / 2;
  const hh = h / 2;
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  return shape;
};

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
      add(group, new THREE.SphereGeometry(0.5, 32, 24), accent);

      const iris = add(group, new THREE.SphereGeometry(0.26, 24, 18), primary, 0, 0, 0.36);
      iris.scale.set(1, 1, 0.48);
      add(group, new THREE.TorusGeometry(0.2, 0.05, 12, 28), accent, 0, 0, 0.46);
      add(group, new THREE.SphereGeometry(0.11, 16, 14), primary, 0, 0, 0.5);
      add(group, new THREE.SphereGeometry(0.055, 12, 10), accent, 0.08, 0.1, 0.58);

      const socket = add(group, new THREE.TorusGeometry(0.46, 0.1, 12, 36), primary, 0, 0, 0.16);
      socket.scale.set(1.28, 0.78, 1);

      const ring = add(group, new THREE.TorusGeometry(0.84, 0.05, 10, 40), primary);
      ring.rotation.x = 0.82;
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
    case 'development': {
      const chunky = {
        depth: 0.56,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.08,
        bevelSegments: 3,
        curveSegments: 3,
      } as const;

      const left = new THREE.Shape();
      left.moveTo(0.22, 0.66);
      left.lineTo(-0.44, 0);
      left.lineTo(0.22, -0.66);
      left.lineTo(-0.02, -0.66);
      left.lineTo(-0.68, 0);
      left.lineTo(-0.02, 0.66);
      left.closePath();

      const right = new THREE.Shape();
      right.moveTo(-0.22, 0.66);
      right.lineTo(0.44, 0);
      right.lineTo(-0.22, -0.66);
      right.lineTo(0.02, -0.66);
      right.lineTo(0.68, 0);
      right.lineTo(0.02, 0.66);
      right.closePath();

      add(group, new THREE.ExtrudeGeometry(left, chunky), primary, -0.36, 0, 0.1);
      add(group, new THREE.BoxGeometry(0.16, 0.76, 0.38), accent, 0, 0, -0.02).rotation.z = -0.42;
      add(group, new THREE.ExtrudeGeometry(right, chunky), primary, 0.36, 0, -0.1);
      break;
    }
    case 'outsourcing': {
      add(group, new THREE.SphereGeometry(0.26, 24, 18), accent, -0.26, 0.5, 0.16);
      add(group, new THREE.CapsuleGeometry(0.22, 0.44, 8, 18), primary, -0.26, -0.04, 0.16);
      add(group, new THREE.SphereGeometry(0.22, 22, 16), accent, 0.3, 0.4, -0.18);
      add(group, new THREE.CapsuleGeometry(0.19, 0.36, 8, 18), primary, 0.3, -0.1, -0.18);
      const ring = add(group, new THREE.TorusGeometry(0.74, 0.055, 12, 40), accent);
      ring.rotation.set(Math.PI / 2.35, 0.18, 0);
      ring.position.set(0.02, -0.06, 0);
      break;
    }
    case 'design': {
      const pal = new THREE.Shape();
      pal.moveTo(0.72, 0.12);
      pal.quadraticCurveTo(0.7, 0.58, 0.12, 0.62);
      pal.quadraticCurveTo(-0.52, 0.52, -0.68, 0.08);
      pal.quadraticCurveTo(-0.78, -0.38, -0.18, -0.52);
      pal.quadraticCurveTo(0.58, -0.5, 0.76, -0.08);
      pal.quadraticCurveTo(0.8, 0.02, 0.72, 0.12);
      pal.closePath();
      const thumb = new THREE.Path();
      thumb.absellipse(-0.36, -0.24, 0.18, 0.18, 0, Math.PI * 2, true);
      pal.holes.push(thumb);
      add(group, new THREE.ExtrudeGeometry(pal, { ...crisp, depth: 0.18 }), primary);

      add(group, new THREE.SphereGeometry(0.13, 14, 12), accent, 0.3, 0.24, 0.18);
      add(group, new THREE.SphereGeometry(0.12, 14, 12), accent, 0, 0.34, 0.18);
      add(group, new THREE.SphereGeometry(0.11, 14, 12), accent, -0.28, 0.2, 0.18);
      add(group, new THREE.SphereGeometry(0.12, 14, 12), accent, 0.36, -0.1, 0.18);
      break;
    }
    case 'support': {
      const wrench = new THREE.Shape();
      wrench.moveTo(-0.14, -0.92);
      wrench.lineTo(0.14, -0.92);
      wrench.lineTo(0.14, 0.18);
      wrench.lineTo(0.42, 0.4);
      wrench.lineTo(0.48, 0.78);
      wrench.lineTo(0.18, 0.98);
      wrench.lineTo(0.12, 0.62);
      wrench.lineTo(-0.12, 0.62);
      wrench.lineTo(-0.18, 0.98);
      wrench.lineTo(-0.48, 0.78);
      wrench.lineTo(-0.42, 0.4);
      wrench.lineTo(-0.14, 0.18);
      wrench.closePath();
      const mesh = add(group, new THREE.ExtrudeGeometry(wrench, crisp), primary);
      mesh.rotation.z = -0.55;
      add(group, new THREE.CylinderGeometry(0.16, 0.16, 0.2, 12), accent, 0.08, -0.22, 0.12).rotation.z = -0.55;
      break;
    }
    case 'consulting': {
      add(group, new THREE.BoxGeometry(0.5, 1.32, 0.5), primary, -0.28, 0, 0);
      add(group, new THREE.BoxGeometry(0.36, 0.88, 0.36), accent, 0.3, -0.22, 0.08);
      add(group, new THREE.BoxGeometry(0.22, 0.56, 0.22), primary, 0.06, -0.38, 0.3);
      add(group, new THREE.BoxGeometry(0.12, 0.1, 0.04), accent, -0.28, 0.38, 0.27);
      add(group, new THREE.BoxGeometry(0.12, 0.1, 0.04), accent, -0.28, 0.12, 0.27);
      add(group, new THREE.BoxGeometry(0.12, 0.1, 0.04), accent, -0.28, -0.14, 0.27);
      break;
    }
    case 'functionality': {
      add(group, new THREE.BoxGeometry(0.88, 0.18, 0.68), primary, 0, 0.42, 0);
      add(group, new THREE.BoxGeometry(0.88, 0.18, 0.68), accent, 0, 0, 0.06);
      add(group, new THREE.BoxGeometry(0.88, 0.18, 0.68), primary, 0, -0.42, 0.12);
      break;
    }
    case 'architecture': {
      add(group, new THREE.BoxGeometry(0.34, 0.28, 0.34), primary, 0, 0.58, 0);
      add(group, new THREE.BoxGeometry(0.28, 0.22, 0.28), accent, -0.38, 0.18, 0.08);
      add(group, new THREE.BoxGeometry(0.28, 0.22, 0.28), accent, 0.38, 0.18, 0.08);
      add(group, new THREE.BoxGeometry(0.22, 0.18, 0.22), primary, -0.62, -0.2, 0.16);
      add(group, new THREE.BoxGeometry(0.22, 0.18, 0.22), primary, 0, -0.2, 0.16);
      add(group, new THREE.BoxGeometry(0.22, 0.18, 0.22), primary, 0.62, -0.2, 0.16);
      add(group, new THREE.CylinderGeometry(0.04, 0.04, 0.42, 8), accent, -0.19, 0.38, 0.04).rotation.z = 0.55;
      add(group, new THREE.CylinderGeometry(0.04, 0.04, 0.42, 8), accent, 0.19, 0.38, 0.04).rotation.z = -0.55;
      break;
    }
    case 'platforms': {
      add(group, new THREE.BoxGeometry(1.18, 0.72, 0.12), primary);
      add(group, new THREE.BoxGeometry(1.02, 0.56, 0.04), accent, 0, 0, 0.08);
      add(group, new THREE.BoxGeometry(0.42, 0.08, 0.18), primary, 0, -0.48, 0);
      add(group, new THREE.BoxGeometry(0.62, 0.06, 0.22), accent, 0, -0.56, 0);
      break;
    }
    case 'integrations': {
      const linkA = add(group, new THREE.TorusGeometry(0.3, 0.12, 12, 24), primary, -0.22, 0.08, -0.04);
      linkA.rotation.x = 0.45;
      linkA.rotation.z = -0.35;
      const linkB = add(group, new THREE.TorusGeometry(0.3, 0.12, 12, 24), accent, 0.22, -0.04, 0.1);
      linkB.rotation.x = 0.45;
      linkB.rotation.z = Math.PI / 2 - 0.35;
      add(group, new THREE.SphereGeometry(0.14, 12, 10), primary, -0.54, 0.24, 0);
      add(group, new THREE.SphereGeometry(0.14, 12, 10), accent, 0.54, -0.18, 0.1);
      add(group, new THREE.CylinderGeometry(0.08, 0.08, 0.22, 10), primary, 0, 0.02, 0.02).rotation.z = Math.PI / 2;
      break;
    }
    case 'clock': {
      const body = add(group, new THREE.CylinderGeometry(0.38, 0.38, 0.1, 32), primary);
      body.rotation.x = Math.PI / 2;
      add(group, new THREE.TorusGeometry(0.4, 0.05, 12, 32), primary, 0, 0, 0.02);
      const dial = add(group, new THREE.CylinderGeometry(0.32, 0.32, 0.04, 32), accent, 0, 0, 0.06);
      dial.rotation.x = Math.PI / 2;
      for (let i = 0; i < 12; i += 1) {
        const angle = (i / 12) * Math.PI * 2;
        const major = i % 3 === 0;
        add(
          group,
          new THREE.BoxGeometry(major ? 0.05 : 0.035, major ? 0.09 : 0.06, 0.04),
          major ? primary : accent,
          Math.sin(angle) * 0.34,
          Math.cos(angle) * 0.34,
          0.1,
        );
      }
      const hour = add(group, new THREE.BoxGeometry(0.05, 0.16, 0.05), primary, -0.02, 0.04, 0.12);
      hour.rotation.z = 0.55;
      const minute = add(group, new THREE.BoxGeometry(0.04, 0.22, 0.05), accent, 0.08, 0.03, 0.14);
      minute.rotation.z = -0.35;
      add(group, new THREE.CylinderGeometry(0.05, 0.05, 0.05, 12), primary, 0, 0, 0.16);
      break;
    }
    case 'scale': {
      add(group, new THREE.BoxGeometry(0.22, 0.36, 0.22), primary, -0.46, -0.28, 0);
      add(group, new THREE.BoxGeometry(0.22, 0.62, 0.22), accent, -0.14, -0.15, 0);
      add(group, new THREE.BoxGeometry(0.22, 0.88, 0.22), primary, 0.18, -0.02, 0);
      add(group, new THREE.BoxGeometry(0.22, 1.12, 0.22), accent, 0.5, 0.1, 0);
      add(group, new THREE.BoxGeometry(0.82, 0.08, 0.22), primary, 0.02, -0.52, 0);
      break;
    }
    case 'headphones': {
      const band = add(group, new THREE.TorusGeometry(0.5, 0.08, 12, 28, Math.PI), primary);
      band.rotation.z = Math.PI;
      add(group, new THREE.CylinderGeometry(0.22, 0.22, 0.16, 16), accent, -0.52, -0.04, 0.04);
      add(group, new THREE.CylinderGeometry(0.22, 0.22, 0.16, 16), accent, 0.52, -0.04, 0.04);
      const cupL = add(group, new THREE.TorusGeometry(0.22, 0.06, 10, 20), primary, -0.52, -0.04, 0.1);
      cupL.rotation.y = Math.PI / 2;
      const cupR = add(group, new THREE.TorusGeometry(0.22, 0.06, 10, 20), primary, 0.52, -0.04, 0.1);
      cupR.rotation.y = Math.PI / 2;
      add(group, new THREE.CylinderGeometry(0.04, 0.04, 0.28, 8), accent, 0.44, -0.26, 0.06).rotation.z = 0.55;
      add(group, new THREE.SphereGeometry(0.08, 10, 8), primary, 0.54, -0.38, 0.08);
      break;
    }
    case 'mail': {
      add(group, new THREE.BoxGeometry(0.88, 0.62, 0.26), primary);
      const flap = new THREE.Shape();
      flap.moveTo(-0.44, 0.31);
      flap.lineTo(0, -0.04);
      flap.lineTo(0.44, 0.31);
      flap.closePath();
      add(group, new THREE.ExtrudeGeometry(flap, crisp), accent, 0, 0.04, 0.16);
      const frontFold = new THREE.Shape();
      frontFold.moveTo(-0.44, -0.31);
      frontFold.lineTo(0, 0.03);
      frontFold.lineTo(0.44, -0.31);
      add(group, new THREE.ExtrudeGeometry(frontFold, thin), primary, 0, 0, 0.15);
      add(group, new THREE.BoxGeometry(0.07, 0.62, 0.26), accent, -0.405, 0, 0.02);
      add(group, new THREE.BoxGeometry(0.07, 0.62, 0.26), accent, 0.405, 0, 0.02);
      break;
    }
    case 'phone': {
      add(group, new THREE.BoxGeometry(0.42, 0.82, 0.16), primary);
      add(group, new THREE.BoxGeometry(0.36, 0.64, 0.04), accent, 0, 0.02, 0.09);
      add(group, new THREE.CylinderGeometry(0.048, 0.048, 0.04, 12), accent, 0, -0.33, 0.09);
      add(group, new THREE.BoxGeometry(0.14, 0.025, 0.04), accent, 0, 0.36, 0.09);
      add(group, new THREE.BoxGeometry(0.025, 0.12, 0.05), accent, 0.23, 0.13, 0.02);
      add(group, new THREE.BoxGeometry(0.025, 0.07, 0.05), accent, 0.23, -0.07, 0.02);
      break;
    }
    case 'whatsapp': {
      const outer = add(group, new THREE.CylinderGeometry(0.58, 0.58, 0.12, 36), accent, 0, 0.02, 0.04);
      outer.rotation.x = Math.PI / 2;
      const inner = add(group, new THREE.CylinderGeometry(0.48, 0.48, 0.14, 36), primary, 0, 0.02, 0.12);
      inner.rotation.x = Math.PI / 2;
      const receiver = add(group, new THREE.TorusGeometry(0.15, 0.038, 12, 24, Math.PI * 0.92), accent, 0.02, 0.02, 0.22);
      receiver.rotation.z = Math.PI * 0.54;
      add(group, new THREE.SphereGeometry(0.046, 10, 8), accent, -0.12, 0.14, 0.22);
      add(group, new THREE.SphereGeometry(0.046, 10, 8), accent, 0.14, -0.1, 0.22);
      break;
    }
    case 'message': {
      const bubble = new THREE.Shape();
      const w = 0.86;
      const h = 0.68;
      const r = 0.16;
      bubble.moveTo(-w / 2 + r, -h / 2);
      bubble.lineTo(w / 2 - r, -h / 2);
      bubble.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
      bubble.lineTo(w / 2, h / 2 - r);
      bubble.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
      bubble.lineTo(-w / 2 + r, h / 2);
      bubble.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
      bubble.lineTo(-w / 2, -h / 2 + r);
      bubble.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
      bubble.closePath();
      add(group, new THREE.ExtrudeGeometry(bubble, crisp), primary);
      const tail = new THREE.Shape();
      tail.moveTo(0, 0);
      tail.lineTo(-0.18, -0.24);
      tail.lineTo(0.1, -0.05);
      tail.closePath();
      add(group, new THREE.ExtrudeGeometry(tail, crisp), primary, -0.34, -0.38, 0.02);
      add(group, new THREE.SphereGeometry(0.07, 10, 8), accent, -0.18, 0.04, 0.18);
      add(group, new THREE.SphereGeometry(0.07, 10, 8), accent, 0, 0.04, 0.18);
      add(group, new THREE.SphereGeometry(0.07, 10, 8), accent, 0.18, 0.04, 0.18);
      break;
    }
    case 'telegram': {
      const tile = roundedRect(1.36, 1.36, 0.3);
      const chunky = {
        ...crisp,
        depth: 0.36,
        bevelThickness: 0.085,
        bevelSize: 0.065,
        bevelSegments: 3,
      } as const;
      add(group, new THREE.ExtrudeGeometry(tile, chunky), primary);
      const plane = new THREE.Shape();
      plane.moveTo(-0.38, 0.26);
      plane.lineTo(0.48, -0.06);
      plane.lineTo(-0.04, 0.04);
      plane.lineTo(-0.2, 0.44);
      plane.closePath();
      add(
        group,
        new THREE.ExtrudeGeometry(plane, {
          depth: 0.14,
          bevelEnabled: true,
          bevelThickness: 0.03,
          bevelSize: 0.025,
          bevelSegments: 2,
          curveSegments: 12,
        }),
        accent,
        0,
        0,
        0.44,
      );
      break;
    }
    case 'estimation': {
      add(group, new THREE.BoxGeometry(0.68, 0.88, 0.18), primary);
      add(group, new THREE.BoxGeometry(0.48, 0.06, 0.06), accent, 0, 0.2, 0.1);
      add(group, new THREE.BoxGeometry(0.48, 0.06, 0.06), accent, 0, 0, 0.1);
      add(group, new THREE.BoxGeometry(0.48, 0.06, 0.06), accent, 0, -0.2, 0.1);
      const glass = add(group, new THREE.TorusGeometry(0.24, 0.08, 12, 24), accent, 0.26, 0.26, 0.14);
      glass.rotation.x = Math.PI / 2;
      add(group, new THREE.CylinderGeometry(0.05, 0.05, 0.32, 8), primary, 0.42, 0.06, 0.14).rotation.z = -0.65;
      break;
    }
    case 'contract': {
      add(group, new THREE.BoxGeometry(0.72, 0.95, 0.18), primary);
      add(group, new THREE.BoxGeometry(0.42, 0.04, 0.06), accent, 0, -0.12, 0.1);
      const check = new THREE.Shape();
      check.moveTo(-0.14, 0.04);
      check.lineTo(-0.04, -0.08);
      check.lineTo(0.2, 0.2);
      add(group, new THREE.ExtrudeGeometry(check, crisp), accent, 0, 0.08, 0.14);
      add(group, new THREE.CylinderGeometry(0.06, 0.06, 0.34, 8), primary, 0.3, -0.3, 0.14).rotation.z = -0.42;
      add(group, new THREE.ConeGeometry(0.07, 0.14, 8), accent, 0.44, -0.44, 0.14).rotation.z = -0.42;
      break;
    }
    case 'requirements': {
      add(group, new THREE.BoxGeometry(0.72, 0.95, 0.18), primary);
      add(group, new THREE.BoxGeometry(0.28, 0.12, 0.14), accent, 0, 0.52, 0.04);
      [-0.2, 0, 0.2].forEach((y, i) => {
        add(group, new THREE.BoxGeometry(0.12, 0.12, 0.06), accent, -0.2, y, 0.1);
        add(group, new THREE.BoxGeometry(0.36, 0.05, 0.06), primary, 0.1, y, 0.1);
        if (i < 2) {
          add(group, new THREE.BoxGeometry(0.06, 0.06, 0.07), accent, -0.2, y, 0.13);
        }
      });
      break;
    }
    case 'testing': {
      const body = add(group, new THREE.SphereGeometry(0.42, 20, 16), primary);
      body.scale.set(1.1, 0.82, 0.9);
      add(group, new THREE.SphereGeometry(0.12, 12, 10), accent, 0.38, 0.32, 0.18);
      add(group, new THREE.SphereGeometry(0.1, 10, 8), accent, -0.36, 0.3, 0.16);
      const wingL = add(group, new THREE.BoxGeometry(0.52, 0.08, 0.28), accent, -0.52, 0, 0);
      wingL.rotation.z = 0.35;
      const wingR = add(group, new THREE.BoxGeometry(0.52, 0.08, 0.28), accent, 0.52, 0, 0);
      wingR.rotation.z = -0.35;
      add(group, new THREE.CylinderGeometry(0.04, 0.04, 0.38, 8), primary, -0.18, -0.42, 0.08).rotation.z = 0.25;
      add(group, new THREE.CylinderGeometry(0.04, 0.04, 0.38, 8), primary, 0.18, -0.42, 0.08).rotation.z = -0.25;
      add(group, new THREE.CylinderGeometry(0.04, 0.04, 0.28, 8), primary, 0, -0.48, 0.08);
      break;
    }
    case 'launch': {
      add(group, new THREE.CylinderGeometry(0.22, 0.28, 0.82, 12), primary);
      add(group, new THREE.ConeGeometry(0.28, 0.42, 12), accent, 0, 0.58, 0);
      add(group, new THREE.BoxGeometry(0.12, 0.28, 0.32), primary, -0.28, -0.18, 0).rotation.z = 0.45;
      add(group, new THREE.BoxGeometry(0.12, 0.28, 0.32), primary, 0.28, -0.18, 0).rotation.z = -0.45;
      add(group, new THREE.SphereGeometry(0.1, 10, 8), accent, 0, -0.02, 0.18);
      break;
    }
  }

  const upright = new Set<Icon3DType>(['clock', 'mail', 'phone', 'telegram', 'whatsapp']);

  if (pose === 'front' && upright.has(type)) {
    group.rotation.set(0.12, 0.06, 0);
  } else if (pose === 'front') {
    group.rotation.set(
      type === 'transparency' ? 0.08 : type === 'development' ? 0.28 : 0.22,
      type === 'transparency'
        ? 0.06
        : type === 'development'
          ? 0.42
          : type === 'outsourcing'
            ? 0.58
            : type === 'consulting' || type === 'design'
              ? 0.55
              : 0.48,
      0.06,
    );
  } else {
    group.rotation.set(0.38, 0.85, 0.1);
  }
  group.scale.setScalar(
    ({
      web: 0.84,
      ai: 0.82,
      cloud: 0.88,
      enterprise: 0.9,
      backend: 0.9,
      ecommerce: 0.86,
      frontend: 0.84,
      mobile: 0.9,
      automation: 0.82,
      simplification: 0.92,
      transparency: 0.84,
      reliability: 0.78,
      adaptation: 0.84,
      efficiency: 0.78,
      development: 0.84,
      outsourcing: 0.82,
      design: 0.84,
      support: 0.84,
      consulting: 0.82,
      functionality: 0.82,
      architecture: 0.8,
      platforms: 0.78,
      integrations: 0.92,
      clock: 0.82,
      scale: 0.76,
      headphones: 0.88,
      mail: 0.82,
      phone: 0.82,
      whatsapp: 0.92,
      message: 0.84,
      telegram: 0.92,
      estimation: 0.84,
      contract: 0.84,
      requirements: 0.84,
      testing: 0.84,
      launch: 0.84,
    } as Record<Icon3DType, number>)[type],
  );

  if (type === 'transparency') {
    group.position.y = -0.02;
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
