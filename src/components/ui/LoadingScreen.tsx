"use client";

export default function LoadingScreen() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5">
      {/* Van + text row */}
      <div className="flex items-end gap-4">
        {/* Animated Van */}
        <div className="animate-van">
          <svg
            width="80"
            height="80"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Truck body */}
            <path
              d="M25 30 C25 22, 32 18, 40 18 L85 18 C93 18, 95 24, 95 30 L95 68 C95 72, 93 74, 90 74 L82 74 C82 74, 82 68, 76 64 C70 60, 64 64, 64 74 L38 74 C38 74, 38 68, 32 64 C26 60, 20 64, 20 74 L15 74 C12 74, 10 72, 10 68 L10 58 C10 50, 14 46, 18 44 L25 40 Z"
              fill="black"
            />
            {/* Cabin cutout / window */}
            <path
              d="M12 52 L22 42 C24 40, 26 40, 28 40 L28 56 L12 56 Z"
              fill="white"
              opacity="0.15"
            />
            {/* Rear wheel */}
            <circle cx="76" cy="74" r="10" fill="black" />
            <circle cx="76" cy="74" r="4" fill="white" />
            {/* Front wheel */}
            <circle cx="28" cy="74" r="10" fill="black" />
            <circle cx="28" cy="74" r="4" fill="white" />
          </svg>
        </div>

        {/* Loading text */}
        <span className="mb-2 text-xl font-semibold tracking-wide text-black">
          Loading
          <span className="animate-dots" />
        </span>
      </div>

      {/* Road line */}
      <div className="h-0.5 w-40 overflow-hidden rounded-full bg-gray-200">
        <div className="animate-road h-full w-10 rounded-full bg-gray-400" />
      </div>

      {/* Inline keyframes */}
      <style jsx>{`
        .animate-van {
          animation: vanBounce 0.3s ease-in-out infinite;
        }

        @keyframes vanBounce {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-6px);
          }
        }

        .animate-dots::after {
          content: "";
          animation: dots 1.4s steps(4, end) infinite;
        }

        @keyframes dots {
          0% {
            content: "";
          }
          25% {
            content: ".";
          }
          50% {
            content: "..";
          }
          75% {
            content: "...";
          }
          100% {
            content: "";
          }
        }

        .animate-road {
          animation: roadMove 0.8s linear infinite;
        }

        @keyframes roadMove {
          0% {
            transform: translateX(-40px);
          }
          100% {
            transform: translateX(160px);
          }
        }
      `}</style>
    </div>
  );
}
