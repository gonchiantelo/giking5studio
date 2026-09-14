import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ============================================================
  // OBLIGATORIO para ffmpeg.wasm: habilita SharedArrayBuffer
  // COEP y COOP son requeridos por el navegador para este feature.
  // NOTA: Estos headers pueden romper iframes de terceros (Meta Pixel,
  // embeds externos). Si usás la app en producción con esos scripts,
  // considerá aplicar estos headers sólo al path /studio.
  // ============================================================
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
