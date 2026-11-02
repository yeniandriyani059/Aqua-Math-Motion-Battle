import React from 'react';

interface AquaKingdomBackdropProps {
  blueActiveFlash?: boolean;
  yellowActiveFlash?: boolean;
}

/**
 * Full-viewport illustrated Water Kingdom arena backdrop inspired by the reference image:
 * - Sky & sunlit clouds
 * - Distant aqua & golden castle towers
 * - Giant blue/teal water pipes and valves
 * - Cascading waterfalls on left & right + central water fountain divider
 * - Shimmering lagoon floor at the bottom
 */
export const AquaKingdomBackdrop: React.FC<AquaKingdomBackdropProps> = ({
  blueActiveFlash = false,
  yellowActiveFlash = false,
}) => {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Sky to Lagoon Base Gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #0284c7 0%, #38bdf8 28%, #7dd3fc 58%, #0ea5e9 82%, #0369a1 100%)',
        }}
      />

      {/* Left Team Blue Ambient Glow & Right Team Yellow Sunlit Warmth */}
      <div
        className="absolute inset-y-0 left-0 w-1/2 transition-opacity duration-300"
        style={{
          background:
            'radial-gradient(circle at 35% 45%, rgba(56, 189, 248, 0.35), rgba(3, 105, 161, 0.25) 75%)',
          opacity: blueActiveFlash ? 1 : 0.85,
        }}
      />
      <div
        className="absolute inset-y-0 right-0 w-1/2 transition-opacity duration-300"
        style={{
          background:
            'radial-gradient(circle at 65% 38%, rgba(254, 240, 138, 0.42), rgba(245, 158, 11, 0.14) 70%)',
          opacity: yellowActiveFlash ? 1 : 0.88,
        }}
      />

      {/* Illustrated SVG Water Kingdom Architecture, Pipes, Castles & Waterfalls */}
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id="skyCloud" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.45" />
          </linearGradient>
          <linearGradient id="warmCloud" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fde68a" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="pipeBlue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#075985" />
          </linearGradient>
          <linearGradient id="pipeTeal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5eead4" />
            <stop offset="55%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#115e59" />
          </linearGradient>
          <linearGradient id="castleWallBlue" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#7dd3fc" />
          </linearGradient>
          <linearGradient id="castleWallWarm" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="100%" stopColor="#bae6fd" />
          </linearGradient>
          <linearGradient id="domeGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="65%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id="domeBlue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="65%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
          <linearGradient id="waterfallGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.92" />
            <stop offset="50%" stopColor="#7dd3fc" stopOpacity="0.78" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="lagoonGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.95" />
          </linearGradient>
        </defs>

        {/* Soft Sunbeams on Right Side (Tim Kuning) */}
        <g opacity="0.28">
          <polygon points="1350,0 1600,0 1600,600 1050,600" fill="#fef08a" />
          <polygon points="1150,0 1320,0 1100,650 880,650" fill="#fef08a" />
        </g>

        {/* Clouds */}
        <g fill="url(#skyCloud)">
          <ellipse cx="260" cy="140" rx="140" ry="38" />
          <ellipse cx="320" cy="125" rx="95" ry="34" />
          <ellipse cx="640" cy="170" rx="165" ry="35" />
        </g>
        <g fill="url(#warmCloud)">
          <ellipse cx="1150" cy="130" rx="160" ry="42" />
          <ellipse cx="1230" cy="112" rx="110" ry="34" />
          <ellipse cx="1440" cy="165" rx="130" ry="32" />
        </g>

        {/* Distant Left Water Kingdom Castles (Tim Biru Side) */}
        <g opacity="0.92">
          {/* Far Left Waterfall Cliff */}
          <rect x="0" y="210" width="115" height="520" rx="12" fill="#0369a1" />
          <rect x="18" y="215" width="68" height="500" fill="url(#waterfallGrad)" />
          <line x1="38" y1="220" x2="38" y2="700" stroke="#ffffff" strokeWidth="3" strokeDasharray="18 14" opacity="0.7" />
          <line x1="62" y1="240" x2="62" y2="700" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="14 18" opacity="0.65" />

          {/* Castle Tower 1 */}
          <rect x="125" y="340" width="76" height="320" fill="url(#castleWallBlue)" stroke="#0284c7" strokeWidth="3" />
          <path d="M115 340 Q163 265 211 340 Z" fill="url(#domeBlue)" />
          <circle cx="163" cy="272" r="7" fill="#fde047" />
          <rect x="148" y="375" width="12" height="24" rx="6" fill="#0369a1" />
          <rect x="168" y="375" width="12" height="24" rx="6" fill="#0369a1" />

          {/* Castle Tower 2 */}
          <rect x="230" y="290" width="92" height="370" fill="url(#castleWallBlue)" stroke="#0284c7" strokeWidth="3" />
          <path d="M220 290 Q276 210 332 290 Z" fill="url(#domeGold)" />
          <rect x="255" y="330" width="16" height="30" rx="8" fill="#0369a1" />
          <rect x="281" y="330" width="16" height="30" rx="8" fill="#0369a1" />

          {/* Castle Tower 3 */}
          <rect x="360" y="370" width="74" height="290" fill="url(#castleWallBlue)" stroke="#0284c7" strokeWidth="3" />
          <path d="M352 370 Q397 300 442 370 Z" fill="url(#domeBlue)" />

          {/* Giant Blue & Teal Water Pipes (Left Arena) */}
          <path
            d="M 95 450 H 470 Q 510 450 510 490 V 640"
            fill="none"
            stroke="url(#pipeBlue)"
            strokeWidth="36"
            strokeLinecap="round"
          />
          {/* Pipe Flanges */}
          <rect x="195" y="426" width="14" height="48" rx="4" fill="#075985" />
          <rect x="345" y="426" width="14" height="48" rx="4" fill="#075985" />
          <rect x="486" y="535" width="48" height="14" rx="4" fill="#075985" />

          {/* Secondary Curved Pipe */}
          <path
            d="M 280 650 V 530 Q 280 500 310 500 H 680"
            fill="none"
            stroke="url(#pipeTeal)"
            strokeWidth="26"
            strokeLinecap="round"
          />
        </g>

        {/* Distant Right Water Kingdom Castles (Tim Kuning Side) */}
        <g opacity="0.92">
          {/* Far Right Waterfall Cliff */}
          <rect x="1480" y="210" width="120" height="520" rx="12" fill="#0369a1" />
          <rect x="1505" y="215" width="70" height="500" fill="url(#waterfallGrad)" />
          <line x1="1528" y1="220" x2="1528" y2="700" stroke="#ffffff" strokeWidth="3" strokeDasharray="18 14" opacity="0.7" />
          <line x1="1555" y1="240" x2="1555" y2="700" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="14 18" opacity="0.65" />

          {/* Right Castle Tower 1 */}
          <rect x="920" y="340" width="84" height="320" fill="url(#castleWallWarm)" stroke="#0284c7" strokeWidth="3" />
          <path d="M910 340 Q962 260 1014 340 Z" fill="url(#domeGold)" />
          <rect x="945" y="378" width="14" height="26" rx="7" fill="#0369a1" />
          <rect x="967" y="378" width="14" height="26" rx="7" fill="#0369a1" />

          {/* Right Castle Tower 2 */}
          <rect x="1150" y="285" width="96" height="375" fill="url(#castleWallWarm)" stroke="#0284c7" strokeWidth="3" />
          <path d="M1138 285 Q1198 205 1258 285 Z" fill="url(#domeGold)" />
          <circle cx="1198" cy="198" r="8" fill="#fde047" />
          <rect x="1178" y="325" width="16" height="32" rx="8" fill="#0369a1" />
          <rect x="1204" y="325" width="16" height="32" rx="8" fill="#0369a1" />

          {/* Right Castle Tower 3 */}
          <rect x="1340" y="330" width="82" height="330" fill="url(#castleWallWarm)" stroke="#0284c7" strokeWidth="3" />
          <path d="M1330 330 Q1381 255 1432 330 Z" fill="url(#domeBlue)" />

          {/* Giant Pipes on Right Side */}
          <path
            d="M 1500 460 H 1120 Q 1080 460 1080 500 V 645"
            fill="none"
            stroke="url(#pipeTeal)"
            strokeWidth="34"
            strokeLinecap="round"
          />
          <rect x="1360" y="438" width="14" height="44" rx="4" fill="#115e59" />
          <rect x="1210" y="438" width="14" height="44" rx="4" fill="#115e59" />

          <path
            d="M 920 515 H 1300 Q 1330 515 1330 545 V 660"
            fill="none"
            stroke="url(#pipeBlue)"
            strokeWidth="26"
            strokeLinecap="round"
          />
        </g>

        {/* Central Arena Divider: Grand Water Tower & Fountain Column */}
        <g>
          {/* Central Water Column Stream */}
          <rect x="766" y="240" width="68" height="470" fill="url(#waterfallGrad)" opacity="0.85" />
          <line x1="786" y1="250" x2="786" y2="700" stroke="#ffffff" strokeWidth="3" strokeDasharray="16 12" opacity="0.8" />
          <line x1="800" y1="245" x2="800" y2="700" stroke="#e0f2fe" strokeWidth="4" strokeDasharray="22 14" opacity="0.85" />
          <line x1="814" y1="255" x2="814" y2="700" stroke="#ffffff" strokeWidth="3" strokeDasharray="16 12" opacity="0.8" />

          {/* Central Pipe Rings */}
          <rect x="752" y="395" width="96" height="22" rx="10" fill="url(#pipeBlue)" stroke="#075985" strokeWidth="3" />
          <rect x="744" y="555" width="112" height="26" rx="12" fill="url(#pipeBlue)" stroke="#075985" strokeWidth="3" />
          <ellipse cx="800" cy="695" rx="95" ry="20" fill="#e0f2fe" opacity="0.65" />
        </g>

        {/* Bottom Lagoon Water & Foam Ripples */}
        <rect x="0" y="680" width="1600" height="220" fill="url(#lagoonGrad)" />
        <ellipse cx="260" cy="715" rx="140" ry="14" fill="#7dd3fc" opacity="0.35" />
        <ellipse cx="560" cy="740" rx="180" ry="16" fill="#7dd3fc" opacity="0.3" />
        <ellipse cx="1060" cy="735" rx="170" ry="15" fill="#fde047" opacity="0.25" />
        <ellipse cx="1360" cy="715" rx="145" ry="14" fill="#7dd3fc" opacity="0.35" />
      </svg>
    </div>
  );
};
