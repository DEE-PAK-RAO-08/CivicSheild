import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ══════════════════════════════════════════
   Animated Particle Shield — 3D Background
   Renders a revolving shield of glowing particles
   that react to system status changes
   ══════════════════════════════════════════ */

function ShieldParticles({ count = 2000, status = 'ACTIVE' }) {
  const mesh = useRef();
  const light = useRef();

  const [positions, colors, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Spherical distribution — shield shape
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.5 + Math.random() * 1.5;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      // Default cyan-green palette
      col[i * 3] = 0;
      col[i * 3 + 1] = 0.8 + Math.random() * 0.2;
      col[i * 3 + 2] = 0.9 + Math.random() * 0.1;

      sz[i] = Math.random() * 3 + 1;
    }
    return [pos, col, sz];
  }, [count]);

  useFrame((state) => {
    if (!mesh.current) return;
    const time = state.clock.elapsedTime;

    // Slow rotation
    mesh.current.rotation.y = time * 0.08;
    mesh.current.rotation.x = Math.sin(time * 0.05) * 0.1;

    // Pulse scale
    const pulse = 1 + Math.sin(time * 0.5) * 0.02;
    mesh.current.scale.set(pulse, pulse, pulse);

    // Update colors based on status
    const colAttr = mesh.current.geometry.attributes.color;
    const arr = colAttr.array;

    for (let i = 0; i < count; i++) {
      const flicker = 0.7 + Math.sin(time * 2 + i) * 0.3;
      if (status === 'FROZEN') {
        arr[i * 3] = flicker;
        arr[i * 3 + 1] = 0.1;
        arr[i * 3 + 2] = 0.2;
      } else if (status === 'PAUSED') {
        arr[i * 3] = flicker;
        arr[i * 3 + 1] = 0.8 * flicker;
        arr[i * 3 + 2] = 0.1;
      } else if (status === 'BUDGET_EXHAUSTED') {
        arr[i * 3] = flicker * 0.8;
        arr[i * 3 + 1] = 0.5 * flicker;
        arr[i * 3 + 2] = 0;
      } else {
        arr[i * 3] = 0;
        arr[i * 3 + 1] = 0.6 + 0.4 * flicker;
        arr[i * 3 + 2] = 0.8 + 0.2 * flicker;
      }
    }
    colAttr.needsUpdate = true;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function HexGrid() {
  const mesh = useRef();

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.z = state.clock.elapsedTime * 0.02;
    }
  });

  const points = useMemo(() => {
    const pts = [];
    const size = 0.5;
    for (let x = -5; x <= 5; x++) {
      for (let y = -5; y <= 5; y++) {
        const offset = y % 2 === 0 ? 0 : size * 0.866;
        pts.push(new THREE.Vector3(x * size * 1.732 + offset, y * size * 1.5, -2));
      }
    }
    return pts;
  }, []);

  const positions = useMemo(() => {
    const arr = new Float32Array(points.length * 3);
    points.forEach((p, i) => {
      arr[i * 3] = p.x;
      arr[i * 3 + 1] = p.y;
      arr[i * 3 + 2] = p.z;
    });
    return arr;
  }, [points]);

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.015}
        color="#0a2a4a"
        transparent
        opacity={0.5}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function ShieldCanvas({ status = 'ACTIVE' }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 60 }}
      style={{ background: 'transparent' }}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={0.2} />
      <pointLight position={[5, 5, 5]} intensity={0.5} color="#00e5ff" />
      <ShieldParticles status={status} count={2500} />
      <HexGrid />
    </Canvas>
  );
}
