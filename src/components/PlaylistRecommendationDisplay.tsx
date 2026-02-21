import React from "react";

interface PlaylistRecommendationDisplayProps {
  theme: string;
  song: string;
}

const PlaylistRecommendationDisplay: React.FC<PlaylistRecommendationDisplayProps> = ({
  theme,
  song,
}) => {
  return (
    <div className="quote-font mx-auto flex max-w-[560px] items-center justify-center gap-5 whitespace-pre-line break-keep">
      <div className="relative w-[clamp(6.1rem,17vw,6.9rem)] h-[clamp(6.1rem,17vw,6.9rem)] flex-shrink-0 animate-[lp-spin_4s_linear_infinite] rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.5),inset_0_0_10px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(255,255,255,0.2)] border border-black flex items-center justify-center overflow-hidden"
        style={{ background: 'conic-gradient(from 0deg, #111 0%, #333 10%, #111 20%, #222 30%, #111 40%, #333 50%, #111 60%, #222 70%, #111 80%, #333 90%, #111 100%)' }}
        aria-hidden>

        {/* Vinyl Grooves & Reflection Overlay */}
        <div className="absolute inset-0 rounded-full opacity-40 mix-blend-overlay pointer-events-none"
          style={{
            background: 'repeating-radial-gradient(circle at center, transparent, transparent 2px, rgba(255,255,255,0.1) 3px, rgba(255,255,255,0.1) 4px)'
          }}
        />

        {/* Center Label */}
        <div className="relative w-[40%] h-[40%] rounded-full bg-gradient-to-br from-gray-200 to-gray-400 border-[2px] border-[#111] shadow-inner flex items-center justify-center z-10">
          <div className="w-[80%] h-[80%] rounded-full border border-gray-400/50 flex items-center justify-center">
            <div className="w-[15%] h-[15%] rounded-full bg-black shadow-inner" />
          </div>
        </div>
      </div>
      <div className="min-w-0 text-left">
        <h2 className="text-3xl font-bold leading-tight">{theme}</h2>
        <p className="mt-3 text-2xl font-light leading-snug">{song}</p>
      </div>
    </div>
  );
};

export default PlaylistRecommendationDisplay;
