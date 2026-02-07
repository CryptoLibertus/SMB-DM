"use client";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export default function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <>
      {/* Desktop: dots */}
      <div className="hidden items-center gap-2 sm:flex">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const step = i + 1;
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;

          return (
            <div
              key={step}
              className={`h-2 w-2 rounded-full transition-colors ${
                isCompleted
                  ? "bg-accent"
                  : isCurrent
                    ? "bg-accent ring-2 ring-accent/30"
                    : "bg-white/20"
              }`}
            />
          );
        })}
      </div>

      {/* Mobile: text */}
      <p className="text-sm text-text-light sm:hidden">
        Step {currentStep} of {totalSteps}
      </p>
    </>
  );
}
