import React, { useEffect, useImperativeHandle, useRef } from 'react';
import { TeamId } from '../game/types';

export interface WaterSplashCanvasHandle {
  spawnSplash: (
    team: TeamId,
    normX: number,
    normY: number,
    isCorrect: boolean,
    isSuperCombo?: boolean
  ) => void;
}

interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
}

interface PooledBeam {
  active: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  life: number;
  maxLife: number;
}

const MAX_PARTICLES = 180;
const MAX_BEAMS = 16;

/**
 * Isolated 60Hz Canvas2D Water Splash & Hand-Motion Energy Beam renderer using a pre-allocated ring buffer
 * (Zero-GC inside requestAnimationFrame, per game_title_and_hud.md).
 */
export const WaterSplashCanvas = React.forwardRef<WaterSplashCanvasHandle, {}>(
  (_props, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const poolRef = useRef<PooledParticle[]>([]);
    const beamsRef = useRef<PooledBeam[]>([]);
    const cursorIdxRef = useRef(0);
    const beamIdxRef = useRef(0);

    // Pre-allocate fixed particle & beam pools once
    if (poolRef.current.length === 0) {
      for (let i = 0; i < MAX_PARTICLES; i++) {
        poolRef.current.push({
          active: false,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          radius: 4,
          alpha: 0,
          color: '#38bdf8',
          life: 0,
          maxLife: 0.6,
        });
      }
      for (let i = 0; i < MAX_BEAMS; i++) {
        beamsRef.current.push({
          active: false,
          startX: 0,
          startY: 0,
          endX: 0,
          endY: 0,
          color: '#7dd3fc',
          life: 0,
          maxLife: 0.35,
        });
      }
    }

    useImperativeHandle(ref, () => ({
      spawnSplash: (team, normX, normY, isCorrect, isSuperCombo = false) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Convert team-local normalized [0..100] coordinates to full viewport canvas coordinates
        const teamOffset = team === 'blue' ? 0 : 0.5;
        const targetX = (teamOffset + (normX / 100) * 0.5) * canvas.width;
        const targetY = (normY / 100) * canvas.height;

        // Spawn hand-motion energy beam from bottom player zone up to the bubble (matches reference kids' hand beams!)
        const beam = beamsRef.current[beamIdxRef.current];
        beamIdxRef.current = (beamIdxRef.current + 1) % MAX_BEAMS;
        beam.active = true;
        beam.startX = targetX + (Math.random() - 0.5) * 80;
        beam.startY = canvas.height * 0.88;
        beam.endX = targetX;
        beam.endY = targetY;
        beam.color =
          team === 'blue'
            ? isCorrect
              ? '#7dd3fc'
              : '#fda4af'
            : isCorrect
            ? '#fde047'
            : '#fda4af';
        beam.life = 0;
        beam.maxLife = isSuperCombo ? 0.5 : 0.32;

        // Spawn 24..36 water droplets from the pre-allocated ring buffer
        const count = isSuperCombo ? 38 : isCorrect ? 26 : 14;
        const palette =
          !isCorrect
            ? ['#fca5a5', '#f87171', '#ffffff']
            : team === 'blue'
            ? ['#e0f2fe', '#7dd3fc', '#38bdf8', '#0284c7', '#ffffff']
            : ['#fef9c3', '#fde047', '#facc15', '#f59e0b', '#ffffff'];

        for (let i = 0; i < count; i++) {
          const p = poolRef.current[cursorIdxRef.current];
          cursorIdxRef.current = (cursorIdxRef.current + 1) % MAX_PARTICLES;

          const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
          const speed = (isSuperCombo ? 260 : 180) * (0.45 + Math.random() * 0.75);

          p.active = true;
          p.x = targetX;
          p.y = targetY;
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed - 60;
          p.radius = (isSuperCombo ? 7 : 5) * (0.6 + Math.random() * 0.9);
          p.alpha = 1;
          p.color = palette[i % palette.length];
          p.life = 0;
          p.maxLife = 0.45 + Math.random() * 0.3;
        }
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const updateSize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      };
      updateSize();

      const ro = new ResizeObserver(updateSize);
      ro.observe(document.body);

      let lastTime = performance.now();
      let rafId = 0;

      const tick = (now: number) => {
        const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
        lastTime = now;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Render active hand-motion beams
        for (let i = 0; i < MAX_BEAMS; i++) {
          const b = beamsRef.current[i];
          if (!b.active) continue;
          b.life += dt;
          if (b.life >= b.maxLife) {
            b.active = false;
            continue;
          }
          const progress = b.life / b.maxLife;
          const alpha = Math.max(0, 1 - progress);

          ctx.save();
          ctx.globalAlpha = alpha * 0.85;
          ctx.strokeStyle = b.color;
          ctx.lineWidth = (1 - progress) * 18 + 4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(b.startX, b.startY);
          ctx.lineTo(b.endX, b.endY);
          ctx.stroke();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = (1 - progress) * 6 + 2;
          ctx.beginPath();
          ctx.moveTo(b.startX, b.startY);
          ctx.lineTo(b.endX, b.endY);
          ctx.stroke();
          ctx.restore();
        }

        // Render active water droplets
        for (let i = 0; i < MAX_PARTICLES; i++) {
          const p = poolRef.current[i];
          if (!p.active) continue;
          p.life += dt;
          if (p.life >= p.maxLife) {
            p.active = false;
            continue;
          }

          p.vy += 420 * dt; // Gravity
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          const progress = p.life / p.maxLife;
          p.alpha = Math.max(0, 1 - progress);

          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * (1 - progress * 0.35), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        rafId = requestAnimationFrame(tick);
      };

      rafId = requestAnimationFrame(tick);

      return () => {
        cancelAnimationFrame(rafId);
        ro.disconnect();
      };
    }, []);

    return (
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-30 h-full w-full"
        aria-hidden="true"
      />
    );
  }
);
