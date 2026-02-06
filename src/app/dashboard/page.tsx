export default function DashboardOverviewPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Overview</h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Visits This Week */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Visits This Week</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">247</p>
          <p className="mt-1 text-sm text-green-600">+12% from last week</p>
          <div className="mt-4 h-24 rounded bg-gray-50 flex items-center justify-center text-xs text-gray-400">
            Chart placeholder
          </div>
        </div>

        {/* Leads by Type */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Leads by Type</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">18</p>
          <p className="mt-1 text-sm text-gray-500">This month</p>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Phone calls</span>
              <span className="font-medium text-gray-900">8</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Form submissions</span>
              <span className="font-medium text-gray-900">6</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Email clicks</span>
              <span className="font-medium text-gray-900">4</span>
            </div>
          </div>
        </div>

        {/* Top Pages */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Top Pages</h3>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="truncate text-gray-600">/</span>
              <span className="ml-2 font-medium text-gray-900">142</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="truncate text-gray-600">/services</span>
              <span className="ml-2 font-medium text-gray-900">56</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="truncate text-gray-600">/contact</span>
              <span className="ml-2 font-medium text-gray-900">31</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="truncate text-gray-600">/about</span>
              <span className="ml-2 font-medium text-gray-900">18</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly trend */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-medium text-gray-500">Traffic Trend</h3>
        <div className="mt-4 flex h-48 items-center justify-center rounded bg-gray-50 text-sm text-gray-400">
          Weekly traffic chart placeholder
        </div>
      </div>
    </div>
  );
}
