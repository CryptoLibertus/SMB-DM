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
                      isCompleted ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  />
                )}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                    isCompleted
                      ? "bg-blue-600 text-white"
                      : isActive
                        ? "border-2 border-blue-600 bg-white text-blue-600"
                        : "border-2 border-gray-200 bg-white text-gray-400"
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
                      isCompleted ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
              <div className="mt-2 text-center">
                <p
                  className={`text-xs font-medium ${
                    isCompleted
                      ? "text-blue-600"
                      : isActive
                        ? "text-blue-600"
                        : "text-gray-400"
                  }`}
                >
                  {stage.label}
                </p>
                <p
                  className={`mt-0.5 text-xs ${
                    isActive ? "text-gray-500" : isCompleted ? "text-gray-500" : "text-gray-300"
                  }`}
                >
                  <span className="sm:hidden">
                    {stage.label}
                  </span>
                  <span className="hidden sm:inline">
                    {stage.description}
                  </span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {timeEstimate && (
        <p className="mt-3 text-center text-xs text-gray-400">{timeEstimate}</p>
      )}
    </div>
  );
}
