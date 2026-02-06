export default function CheckEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
            <svg
              className="h-7 w-7 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <h1 className="mb-2 text-xl font-bold text-gray-900">
            Check your email
          </h1>
          <p className="text-sm text-gray-500">
            We sent you a magic link. Click it to sign in to your dashboard.
          </p>

          <div className="mt-6 rounded-lg bg-gray-50 p-3 text-xs text-gray-400">
            Didn&apos;t receive it? Check your spam folder, or{" "}
            <a href="/login" className="text-blue-600 hover:underline">
              try again
            </a>
            .
          </div>
        </div>
      </div>
    </div>
  );
}
