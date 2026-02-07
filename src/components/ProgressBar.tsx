"use client";

interface Stage {
  label: string;
  description: string;
}

interface ProgressBarProps {
  currentStage: number;
  stages: Stage[];
  timeEstimate?: string;
}

export default function ProgressBar({ currentStage, stages, timeEstimate }: ProgressBarProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {stages.map((stage, index) => {
          const isCompleted = index < currentStage;
          const isActive = index === currentStage;

          return (
            <div key={index} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {index > 0 && (
                  <div
                    className={`h-0.5 flex-1 ${
                      isCompleted ? "bg-accent" : "bg-border-subtle"
                    }`}
                  />
                )}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                    isCompleted
                      ? "bg-accent text-white"
                      : isActive
                        ? "border-2 border-accent bg-white text-accent"
                        : "border-2 border-border-subtle bg-white text-text-muted"
                  }`}
                >
                  {isCompleted ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                {index < stages.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 ${
                      isCompleted ? "bg-accent" : "bg-border-subtle"
                    }`}
                  />
                )}
              </div>
              <div className="mt-2 text-center">
                <p
                  className={`text-xs font-medium ${
                    isCompleted || isActive ? "text-accent" : "text-text-muted"
                  }`}
                >
                  {stage.label}
                </p>
                <p
                  className={`mt-0.5 hidden text-xs sm:block ${
                    isActive || isCompleted ? "text-text-muted" : "text-text-light"
                  }`}
                >
                  {stage.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {timeEstimate && (
        <p className="mt-3 text-center text-xs text-text-muted">{timeEstimate}</p>
      )}
    </div>
  );
}
