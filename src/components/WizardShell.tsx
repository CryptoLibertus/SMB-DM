"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import StepIndicator from "./StepIndicator";

interface WizardShellProps {
  currentStep: number;
  totalSteps: number;
  title: string;
  subtitle: string;
  direction: 1 | -1;
  children: React.ReactNode;
}

export default function WizardShell({
  currentStep,
  totalSteps,
  title,
  subtitle,
  direction,
  children,
}: WizardShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Fixed header */}
      <header className="relative shrink-0 bg-surface-dark text-white">
        <div className="grid-bg pointer-events-none absolute inset-0" />

        <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            SMB<span className="text-accent">-DM</span>
          </Link>
          <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
          <Link
            href="/login"
            className="text-sm font-medium text-text-light transition-colors hover:text-white"
          >
            Sign in
          </Link>
        </nav>

        <div className="relative z-10 mx-auto max-w-3xl px-6 pb-8 pt-4 text-center">
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-text-light sm:text-base">{subtitle}</p>
        </div>
      </header>

      {/* Step content area */}
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={{
              enter: (d: number) => ({ x: `${d * 100}%`, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: `${d * -100}%`, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex min-h-full flex-col"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
