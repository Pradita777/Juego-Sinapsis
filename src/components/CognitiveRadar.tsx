import type { PlayerProfile } from '../game/types';

interface CognitiveRadarProps {
  profile: PlayerProfile;
}

export function CognitiveRadar({ profile }: CognitiveRadarProps) {
  const { logica, memoria, atencion } = profile.domains;

  // Normalize 100..1000 Peak Index into 0.25..1.0 radius
  const norm = (val: number) => Math.max(0.22, Math.min(1, val / 1000));

  const cx = 130;
  const cy = 128;
  const maxR = 84;

  // Angles: Top (-90deg) = Lógica, Bottom Right (30deg) = Memoria, Bottom Left (150deg) = Atención
  const angles = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6];
  const values = [norm(logica.peakIndex), norm(memoria.peakIndex), norm(atencion.peakIndex)];

  const getPt = (angle: number, r: number) => ({
    x: cx + Math.cos(angle) * r,
    y: cy + Math.sin(angle) * r,
  });

  const polygonPts = angles
    .map((a, idx) => {
      const pt = getPt(a, maxR * values[idx]);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(' ');

  const rings = [0.33, 0.66, 1.0];

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 260 236" className="w-full max-w-[260px] h-auto" role="img" aria-label="Mapa cognitivo de Lógica, Memoria y Atención">
        {rings.map((ratio) => {
          const pts = angles
            .map((a) => {
              const p = getPt(a, maxR * ratio);
              return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            })
            .join(' ');
          return (
            <polygon
              key={ratio}
              points={pts}
              fill="none"
              stroke="rgba(148, 163, 184, 0.2)"
              strokeWidth={ratio === 1 ? 1.5 : 1}
            />
          );
        })}

        {angles.map((a, idx) => {
          const end = getPt(a, maxR);
          return (
            <line
              key={idx}
              x1={cx}
              y1={cy}
              x2={end.x}
              y2={end.y}
              stroke="rgba(148, 163, 184, 0.24)"
              strokeWidth="1"
            />
          );
        })}

        <polygon
          points={polygonPts}
          fill="rgba(56, 189, 248, 0.22)"
          stroke="#38BDF8"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Domain vertex dots */}
        <circle cx={getPt(angles[0], maxR * values[0]).x} cy={getPt(angles[0], maxR * values[0]).y} r="5" fill="#F59E0B" stroke="#0f172a" strokeWidth="2" />
        <circle cx={getPt(angles[1], maxR * values[1]).x} cy={getPt(angles[1], maxR * values[1]).y} r="5" fill="#38BDF8" stroke="#0f172a" strokeWidth="2" />
        <circle cx={getPt(angles[2], maxR * values[2]).x} cy={getPt(angles[2], maxR * values[2]).y} r="5" fill="#10B981" stroke="#0f172a" strokeWidth="2" />

        {/* Labels */}
        <text x={cx} y={24} textAnchor="middle" fill="#FCD34D" fontSize="12" fontWeight="700">
          LÓGICA · {logica.peakIndex}
        </text>
        <text x={208} y={198} textAnchor="middle" fill="#7DD3FC" fontSize="12" fontWeight="700">
          MEMORIA · {memoria.peakIndex}
        </text>
        <text x={52} y={198} textAnchor="middle" fill="#6EE7B7" fontSize="12" fontWeight="700">
          ATENCIÓN · {atencion.peakIndex}
        </text>
      </svg>
    </div>
  );
}
