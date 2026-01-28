import { useDocker } from "@/providers/docker.provider";

export default function Boot() {
  const { loadState } = useDocker();

  const steps = [
    { state: "init", label: "Initializing Application", icon: "⚡" },
    { state: "host", label: "Connecting to Hosts", icon: "🌐" },
    { state: "containers", label: "Loading Containers", icon: "📦" },
  ];

  const getCurrentStepIndex = () => {
    return steps.findIndex((step) => step.state === loadState);
  };

  const currentIndex = getCurrentStepIndex();

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)]">
      {/* Terminal-style loading notification */}
      <div className="bg-[#1a1b26] border border-gray-700/50 rounded-lg shadow-2xl backdrop-blur-sm overflow-hidden">
        {/* Terminal header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[#1a1b26] border-b border-gray-700/50">
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <div className="flex-1 text-center">
            <span className="text-xs text-gray-400 font-mono">
              Initializing Dockerflare
            </span>
          </div>
        </div>

        {/* Terminal content */}
        <div className="p-4 font-mono text-sm text-gray-300 space-y-2">
          {/* Loading steps */}
          {steps.map((step, index) => {
            const isActive = index === currentIndex;
            const isCompleted = index < currentIndex;

            return (
              <div
                key={step.state}
                className={`flex items-center gap-2 transition-all duration-300 ${
                  isCompleted
                    ? "text-green-400"
                    : isActive
                      ? "text-blue-400"
                      : "text-gray-600"
                }`}
              >
                <span className="text-xs w-4">
                  {isCompleted ? "✓" : isActive ? step.icon : "○"}
                </span>
                <span className="flex-1">
                  {isCompleted
                    ? "Done"
                    : isActive
                      ? step.label + "..."
                      : step.label}
                </span>
                {/* Loading animation for active step */}
                {isActive && (
                  <span className="flex gap-1">
                    <span className="animate-bounce text-blue-400">●</span>
                    <span
                      className="animate-bounce text-blue-400"
                      style={{ animationDelay: "0.1s" }}
                    >
                      ●
                    </span>
                    <span
                      className="animate-bounce text-blue-400"
                      style={{ animationDelay: "0.2s" }}
                    >
                      ●
                    </span>
                  </span>
                )}
              </div>
            );
          })}

          {/* Progress bar */}
          <div className="mt-4">
            <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500 transition-all duration-700 ease-out"
                style={{
                  width: `${(currentIndex / steps.length) * 100}%`,
                }}
              />
            </div>
            <div className="mt-1 text-center text-xs text-gray-500">
              {currentIndex + 1}/{steps.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
