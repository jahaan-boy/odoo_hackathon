"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoadingScreen from "~/components/ui/LoadingScreen";

interface DashboardKpis {
  activeFleet: number;
  maintenanceAlerts: number;
  utilizationRate: number;
  pendingCargo: number;
  totalVehicles: number;
}

interface RecentTrip {
  _id: string;
  trip: string;
  vehicle: string;
  driver: string;
  origin: string;
  destination: string;
  status: string;
  cargoWeight: number;
  createdAt: string;
}

interface DashboardData {
  kpis: DashboardKpis;
  recentTrips: RecentTrip[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard");
      const json = (await res.json()) as {
        success: boolean;
        data?: DashboardData;
        message?: string;
      };

      if (!json.success || !json.data) {
        setError(json.message ?? "Failed to load dashboard data");
        return;
      }

      setData(json.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDashboard();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => void fetchDashboard()}
          className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          Retry
        </button>
      </div>
    );
  }

  const kpis = data?.kpis;
  const trips = data?.recentTrips ?? [];

  const kpiCards = [
    { label: "Active Fleet", value: kpis?.activeFleet ?? 0 },
    { label: "Maintenance Alerts", value: kpis?.maintenanceAlerts ?? 0 },
    {
      label: "Utilization Rate",
      value: `${kpis?.utilizationRate ?? 0}%`,
    },
    { label: "Pending Cargo", value: kpis?.pendingCargo ?? 0 },
  ];

  return (
    <div>
      {/* HEADER */}
      <div className="my-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <div className="flex gap-5">
          <button
            type="button"
            onClick={() => router.push("/trip-dispatcher")}
            className="rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            New Trip
          </button>
          <button
            type="button"
            onClick={() => router.push("/vehicles")}
            className="rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            New Vehicle
          </button>
        </div>
      </div>

      <div className="mt-6 mb-6 w-full rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between gap-4">
          <input
            type="search"
            placeholder="Search trips, vehicles, drivers..."
            className="flex-1 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm transition outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
          />
          <div className="flex gap-3">
            <button
              type="button"
              className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm text-black transition hover:bg-gray-100"
            >
              Group by
            </button>
            <button
              type="button"
              className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm text-black transition hover:bg-gray-100"
            >
              Filter
            </button>
            <button
              type="button"
              onClick={() => void fetchDashboard()}
              className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm text-black transition hover:bg-gray-100"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <section className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
        {kpiCards.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-gray-200 bg-white p-8"
          >
            <div className="text-4xl font-semibold">{kpi.value}</div>
            <div className="mt-3 text-base text-gray-600">{kpi.label}</div>
          </div>
        ))}
      </section>

      {/* Active Trips Table */}
      <section className="mt-6">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4 text-sm font-medium">
            Recent Trips
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white text-xs font-semibold tracking-wide text-gray-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Trip</th>
                  <th className="px-5 py-3">Vehicle</th>
                  <th className="px-5 py-3">Driver</th>
                  <th className="px-5 py-3">Route</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {trips.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-8 text-center text-gray-400"
                    >
                      No trips found.
                    </td>
                  </tr>
                ) : (
                  trips.map((row) => {
                    const isActive =
                      row.status === "Dispatched" ||
                      row.status === "On Trip" ||
                      row.status === "dispatched";
                    return (
                      <tr
                        key={row._id}
                        className="border-t border-gray-200 transition hover:bg-gray-50"
                      >
                        <td className="px-5 py-4 font-medium text-black">
                          {row.trip}
                        </td>
                        <td className="px-5 py-4 text-gray-700">
                          {row.vehicle}
                        </td>
                        <td className="px-5 py-4 text-gray-700">
                          {row.driver}
                        </td>
                        <td className="px-5 py-4 text-gray-700">
                          {row.origin && row.destination
                            ? `${row.origin} → ${row.destination}`
                            : "—"}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={
                              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold " +
                              (isActive
                                ? "bg-black text-white"
                                : row.status === "Completed"
                                  ? "bg-green-100 text-green-700"
                                  : row.status === "Cancelled"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-200 text-gray-800")
                            }
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
