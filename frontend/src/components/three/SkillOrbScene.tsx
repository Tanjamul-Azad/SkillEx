/**
 * SkillOrbScene - Space-themed Three.js background for SkiilEX
 *
 * Wireframe orb (line-art globe + geodesic inner) + orbital rings +
 * dense starfield + bloom post-processing + mouse parallax.
 * Renders as a fixed full-viewport canvas behind all landing page content.
 */

import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, Html } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useState, useMemo } from 'react';

/* -- Ring data & nodes -------------------------------------------- */
const RING_DATA = [
  { radius: 2.10, rotation: [Math.PI / 2.6, 0, 0.4] as const, color: "#00E5C3", speed: 0.038, nodes: ['Python', 'Figma', 'Guitar'] },
  { radius: 2.56, rotation: [Math.PI / 3.5, 0.6, 0] as const, color: "#00c9a7", speed: -0.026, nodes: ['Photography', 'Data Science', 'Video Editing'] },
  { radius: 2.98, rotation: [Math.PI / 1.8, -0.3, 0.8] as const, color: "#009e85", speed: 0.015, nodes: ['Public Speaking', 'Git & GitHub'] },
];

/* -- Wireframe orb: line-art globe + geodesic inner --------------- */
function WireframeOrb() {
  const group = useRef<THREE.Group | null>(null);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    if (!group.current) return;
    elapsed.current += delta;
    const t = elapsed.current;
    group.current.rotation.y = t * 0.06;
    group.current.rotation.x = Math.sin(t * 0.025) * 0.10;
  });

  return (
    <group ref={group}>
      {/* Outer globe grid */}
      <mesh>
        <sphereGeometry args={[1.22, 32, 32]} />
        <meshBasicMaterial
          color="#00E5C3"
          wireframe
          transparent
          opacity={0.22}
          depthWrite={false}
        />
      </mesh>
      {/* Vertex Points for 'dot' aesthetic */}
      <points>
        <sphereGeometry args={[1.22, 32, 32]} />
        <pointsMaterial
          color="#00E5C3"
          size={0.025}
          sizeAttenuation
          transparent
          opacity={0.6}
        />
      </points>
      {/* Inner geodesic - denser, slightly smaller */}
      <mesh rotation={[0.6, 0.4, 0.1]}>
        <icosahedronGeometry args={[0.82, 4]} />
        <meshBasicMaterial
          color="#00E5C3"
          wireframe
          transparent
          opacity={0.14}
          depthWrite={false}
        />
      </mesh>
      {/* Inner vertex points */}
      <points rotation={[0.6, 0.4, 0.1]}>
        <icosahedronGeometry args={[0.82, 4]} />
        <pointsMaterial
          color="#00E5C3"
          size={0.02}
          sizeAttenuation
          transparent
          opacity={0.4}
        />
      </points>
      {/* Tiny bright core point for bloom anchor */}
      <mesh>
        <sphereGeometry args={[0.18, 12, 8]} />
        <meshBasicMaterial color="#00E5C3" transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

/* -- 3-ring orbital system with anchored nodes -------------------- */
function OrbitalRing({ radius, rotation, color, speed, nodes }: typeof RING_DATA[0]) {
  const orbitGroup = useRef<THREE.Group | null>(null);

  const elapsed = useRef(0);
  useFrame((_, delta) => {
    if (!orbitGroup.current) return;
    elapsed.current += delta;
    orbitGroup.current.rotation.z = elapsed.current * speed;
  });

  return (
    <group rotation={rotation}>
      {/* The visible ring track - perfectly smooth and thin */}
      <mesh>
        <torusGeometry args={[radius, 0.008, 16, 128]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} depthWrite={false} />
      </mesh>

      {/* The rotating system carrying the label nodes */}
      <group ref={orbitGroup}>
        {nodes.map((nodeLabel, i) => {
          const angle = (i / nodes.length) * Math.PI * 2;
          // Calculate perfect (x, y) along the local 2D circle of the torus
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <group key={nodeLabel} position={[x, y, 0]}>
              {/* Glowing anchor dot on the ring */}
              <mesh>
                <sphereGeometry args={[0.05, 32, 32]} />
                <meshBasicMaterial color={color} />
              </mesh>
              <SkillLabel label={nodeLabel} />
            </group>
          )
        })}
      </group>
    </group>
  );
}

/* -- Skill label node --------------------------------------------- */
function SkillLabel({ label }: { label: string }) {
  return (
    <Html
      center
      style={{ pointerEvents: 'none', userSelect: 'none' }}
      distanceFactor={8}
    >
      <span style={{
        display: 'inline-block',
        padding: '6px 16px',
        borderRadius: '999px',
        border: '1px solid rgba(255,255,255,0.15)',
        background: 'rgba(5,10,20,0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        fontSize: '12px',
        fontWeight: 600,
        letterSpacing: '0.04em',
        color: 'rgba(255,255,255,0.95)',
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 24px rgba(0,229,195,0.2)',
        transform: 'translateY(-18px)', /* Lift slightly above the anchor dot */
      }}>
        {label}
      </span>
    </Html>
  );
}

/* -- Mouse parallax wrapper --------------------------------------- */
function ParallaxGroup({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group | null>(null);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', fn, { passive: true });
    return () => window.removeEventListener('mousemove', fn);
  }, []);

  const elapsed = useRef(0);
  const { size } = useThree();
  const isLaptop = size.width < 1500;

  useFrame((state, delta) => {
    if (!group.current) return;
    elapsed.current += delta;
    const t = elapsed.current;

    // Mouse parallax disabled for stability
    const targetX = 0;
    const targetY = 0;

    // Smooth lerp for mouse + continuous rotation
    group.current.rotation.y = THREE.MathUtils.lerp(
      group.current.rotation.y, targetX + (t * 0.02), 0.025);
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x, targetY + Math.sin(t * 0.01) * 0.05, 0.025);

    // Responsive scaling & positioning — Restored for high impact
    const scale = isLaptop ? 1.15 : 1.35;
    group.current.scale.setScalar(THREE.MathUtils.lerp(group.current.scale.x, scale, 0.05));

    // Shift right on wider screens, center on smaller ones
    const targetPosX = size.width > 1400 ? 1.6 : size.width > 1024 ? 1.4 : 0;
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, targetPosX, 0.05);

    // Adjust camera Z for consistent perspective
    const targetZ = 7.5;
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetZ, 0.05);
  });

  return <group ref={group}>{children}</group>;
}

/* -- Scene contents ----------------------------------------------- */
function SceneContents() {
  return (
    <>
      {/* Lighting - Add colored ambient for 'nebula' feel */}
      <ambientLight intensity={0.15} color="#0a192f" />
      <pointLight position={[5, 7, 4]} intensity={2.0} color="#ffffff" />
      <pointLight position={[-8, -2, -5]} intensity={3.5} color="#00E5C3" distance={20} />
      <pointLight position={[8, -5, 2]} intensity={2.0} color="#8b5cf6" distance={20} /> {/* Purple rim light */}

      <ParallaxGroup>
        <WireframeOrb />
        {RING_DATA.map((r, i) => (
          <OrbitalRing key={i} {...r} />
        ))}
        {/* Dense starfield tied to parallax group for deep 3D movement */}
        <Stars radius={50} depth={150} count={4200} factor={5} saturation={0.5} fade speed={0.35} />
      </ParallaxGroup>

      {/* Background static stars for infinite depth */}
      <Stars radius={100} depth={50} count={1800} factor={2.5} saturation={0} fade speed={0.1} />

      {/* Bloom: Intense core, glowing lines */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.02}
          luminanceSmoothing={0.4}
          intensity={2.5}
          radius={0.85}
        />
      </EffectComposer>
    </>
  );
}

/* -- Canvas export ------------------------------------------------ */
export default function SkillOrbScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7.5], fov: 60 }}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
      }}
      dpr={[1, 1.5]}
      style={{ background: 'transparent' }}
    >
      <Suspense fallback={null}>
        <SceneContents />
      </Suspense>
    </Canvas>
  );
}
