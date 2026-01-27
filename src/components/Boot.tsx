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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
      {/* Animated background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-primary/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "3s" }}
        />
        <div
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-primary/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "3s", animationDelay: "1.5s" }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-12 px-8">
        {/* Logo/Title area with pulsing animation */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative text-7xl font-bold bg-gradient-to-br from-primary via-primary to-primary/60 bg-clip-text text-transparent animate-fadeIn">
              LocalFlare
            </div>
          </div>
          <div
            className="text-muted-foreground text-lg animate-fadeIn"
            style={{ animationDelay: "0.3s", animationFillMode: "both" }}
          >
            Docker Management Platform
          </div>
        </div>

        {/* Loading steps */}
        <div className="flex flex-col gap-6 min-w-[400px]">
          {steps.map((step, index) => {
            const isActive = index === currentIndex;
            const isCompleted = index < currentIndex;
            const isPending = index > currentIndex;

            return (
              <div
                key={step.state}
                className={`
                                    flex items-center gap-4 p-4 rounded-xl transition-all duration-500
                                    ${isActive ? "bg-primary/10 border border-primary/30 scale-105" : ""}
                                    ${isCompleted ? "bg-primary/5 border border-primary/20" : ""}
                                    ${isPending ? "bg-muted/30 border border-border/50 opacity-50" : ""}
                                `}
                style={{
                  animationDelay: `${index * 0.2}s`,
                  animationFillMode: "both",
                }}
              >
                {/* Icon/Status indicator */}
                <div
                  className={`
                                    flex items-center justify-center w-12 h-12 rounded-full
                                    transition-all duration-500
                                    ${isActive ? "bg-primary/20 animate-pulse" : ""}
                                    ${isCompleted ? "bg-primary/30" : ""}
                                    ${isPending ? "bg-muted/50" : ""}
                                `}
                >
                  {isCompleted ? (
                    <span className="text-2xl animate-bounceIn">✓</span>
                  ) : (
                    <span
                      className={`text-2xl ${isActive ? "animate-bounce" : ""}`}
                    >
                      {step.icon}
                    </span>
                  )}
                </div>

                {/* Label */}
                <div className="flex-1">
                  <div
                    className={`
                                        text-base font-medium transition-all duration-300
                                        ${isActive ? "text-foreground" : ""}
                                        ${isCompleted ? "text-muted-foreground" : ""}
                                        ${isPending ? "text-muted-foreground/50" : ""}
                                    `}
                  >
                    {step.label}
                  </div>
                </div>

                {/* Loading spinner for active step */}
                {isActive && (
                  <div className="flex gap-1.5">
                    <div
                      className="w-2 h-2 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-md">
          <div className="h-2 bg-muted/30 rounded-full overflow-hidden backdrop-blur-sm">
            <div
              className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary transition-all duration-700 ease-out rounded-full"
              style={{
                width: `${((currentIndex + 1) / steps.length) * 100}%`,
              }}
            >
              <div className="h-full w-full animate-pulse" />
            </div>
          </div>
          <div className="mt-3 text-center text-sm text-muted-foreground">
            Step {currentIndex + 1} of {steps.length}
          </div>
        </div>
      </div>
    </div>
  );
}
