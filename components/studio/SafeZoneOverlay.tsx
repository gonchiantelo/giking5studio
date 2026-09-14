"use client";

/**
 * SafeZoneOverlay
 * Renders TikTok / IG Reels UI safe zone guides over the 9:16 canvas.
 *
 * Safe zone measurements (approximate from native UI):
 *   - Top bar (profile/close):  ~8% of height
 *   - Bottom bar (description): ~20% of height
 *   - Right bar (likes/share):  ~14% of width
 *
 * Text should live between these zones.
 */
export default function SafeZoneOverlay() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-label="Safe zone guides"
    >
      {/* ── Top zone — profile + close button area ── */}
      <rect
        x="0" y="0" width="100" height="8"
        fill="rgba(181,67,43,0.15)"
        stroke="#b5432b"
        strokeWidth="0.3"
        strokeDasharray="2 1"
      />
      <text x="1" y="5.5" fontSize="2.8" fill="#b5432b" fontFamily="monospace">
        ↑ PERFIL / CERRAR
      </text>

      {/* ── Bottom zone — description + audio bar ── */}
      <rect
        x="0" y="80" width="86" height="20"
        fill="rgba(181,67,43,0.15)"
        stroke="#b5432b"
        strokeWidth="0.3"
        strokeDasharray="2 1"
      />
      <text x="1" y="96" fontSize="2.8" fill="#b5432b" fontFamily="monospace">
        ↓ DESCRIPCIÓN / AUDIO
      </text>

      {/* ── Right zone — likes, comments, share ── */}
      <rect
        x="86" y="8" width="14" height="72"
        fill="rgba(181,67,43,0.15)"
        stroke="#b5432b"
        strokeWidth="0.3"
        strokeDasharray="2 1"
      />
      <text
        x="93" y="44" fontSize="2.5" fill="#b5432b" fontFamily="monospace"
        transform="rotate(90, 93, 44)"
      >
        → LIKES / SHARE
      </text>

      {/* ── Safe zone outline ── */}
      <rect
        x="0" y="8" width="86" height="72"
        fill="none"
        stroke="rgba(159,180,209,0.6)"
        strokeWidth="0.4"
        strokeDasharray="3 1"
      />
    </svg>
  );
}
