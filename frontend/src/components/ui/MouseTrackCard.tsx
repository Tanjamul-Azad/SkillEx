/**
 * MouseTrackCard
 *
 * Premium 3D perspective-tilt card driven by mouse position.
 * Uses CSS transforms + a dynamic specular glare layer.
 * This is far beyond standard vibe-coded UIs — inspired by Apple's card style.
 *
 * Props:
 *   intensity  — max tilt angle in degrees (default 7)
 *   glare      — show specular-light glare overlay (default true)
 *   glareMax   — max glare opacity (default 0.14)
 *   scale      — scale on hover (default 1.02)
 *   perspective — CSS perspective value in px (default 900)
 */

import React, { useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface MouseTrackCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  glare?: boolean;
  glareMax?: number;
  scale?: number;
  perspective?: number;
  disabled?: boolean;
}

export function MouseTrackCard({
  children,
  className,
  intensity = 7,
  glare = true,
  glareMax = 0.14,
  scale = 1.018,
  perspective = 900,
  disabled = false,
}: MouseTrackCardProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      const el = wrapRef.current;
      if (!el) return;

      // Cancel any pending raf frame
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;

        const tiltX = ((y - cy) / cy) * intensity;
        const tiltY = -((x - cx) / cx) * intensity;

        el.style.transform = `perspective(${perspective}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(${scale}) translateZ(0)`;

        if (glare && glareRef.current) {
          const glareX = (x / rect.width) * 100;
          const glareY = (y / rect.height) * 100;
          glareRef.current.style.background = `radial-gradient(
            ellipse at ${glareX}% ${glareY}%,
            rgba(255, 255, 255, ${glareMax}) 0%,
            rgba(255, 255, 255, 0.03) 40%,
            transparent 70%
          )`;
          glareRef.current.style.opacity = '1';
        }
      });
    },
    [disabled, intensity, perspective, scale, glare, glareMax]
  );

  const onMouseLeave = useCallback(() => {
    if (disabled) return;
    const el = wrapRef.current;
    if (!el) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    // Smooth return to flat
    el.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale(1) translateZ(0)`;

    if (glare && glareRef.current) {
      glareRef.current.style.opacity = '0';
    }
  }, [disabled, perspective, glare]);

  return (
    <div
      ref={wrapRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={cn('relative', className)}
      style={{
        transition: 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
      }}
    >
      {children}

      {/* Specular glare overlay */}
      {glare && (
        <div
          ref={glareRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0"
          style={{
            transition: 'opacity 0.3s ease, background 0.1s ease',
            zIndex: 10,
            mixBlendMode: 'overlay',
          }}
        />
      )}
    </div>
  );
}
