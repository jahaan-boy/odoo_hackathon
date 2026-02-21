"use client";

import { useCallback, useEffect, useState } from "react";
import LoadingScreen from "~/components/ui/LoadingScreen";

interface AnalyticsKpis {
  totalFuelCost: number;
  totalMaintenanceCost: number;
  totalOperationalCost: number;
  utilizationRate: number;
  fleetROI: number;
  completionRate: number;
  totalTrips: number;
  completedTrips: number;
  totalVehicles: number;
  activeVehicles: number;
}

interface CostliestVehicle {
  _id: string;
  name: string;
  fuelCost: number;
  maintenanceCost: number;
  totalCost: number;
}

interface MonthlySummary {
  month: string;
  fuelCost: number;
  maintenanceCost: number;
  totalCost: number;
  tripsCompleted: number;
  revenue: number;
  profit: number;
}

interface AnalyticsData {
  kpis: AnalyticsKpis;
  topCostliestVehicles: CostliestVehicle[];
  monthlySummary: MonthlySummary[];
}

const formatCurrency = (amount: number) => {
  if (amount >= 100000) {
    return `$${(amount / 100000).toFixed(1)}L`;
  }
  return `$${amount.toLocaleString()}`;
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/analytics");
      const json = (await res.json()) as {
        success: boolean;
        data?: AnalyticsData;
        message?: string;
      };

      if (!json.success || !json.data) {
        setError(json.message ?? "Failed to load analytics");
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
  }, []);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => void fetchAnalytics()}
          className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          Retry
        </button>
      </div>
    );
  }

  const kpis = data?.kpis;
  const topVehicles = data?.topCostliestVehicles ?? [];
  const monthly = data?.monthlySummary ?? [];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="my-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">
          Analytics & Reports
        </h1>
        <button
          type="button"
          onClick={() => void fetchAnalytics()}
          className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm text-black transition hover:bg-gray-100"
        >
          Refresh
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Total Fuel Cost"
          value={formatCurrency(kpis?.totalFuelCost ?? 0)}
        />
        <KpiCard
          label="Maintenance Cost"
          value={formatCurrency(kpis?.totalMaintenanceCost ?? 0)}
        />
        <KpiCard
          label="Fleet ROI"
          value={`${(kpis?.fleetROI ?? 0 > 0) ? "+" : ""}${kpis?.fleetROI ?? 0}%`}
        />
        <KpiCard
          label="Utilization Rate"
          value={`${kpis?.utilizationRate ?? 0}%`}
        />
        <KpiCard
          label="Trip Completion"
          value={`${kpis?.completedTrips ?? 0}/${kpis?.totalTrips ?? 0}`}
          subtext={`${kpis?.completionRate ?? 0}% rate`}
        />
      </div>

      {/* Two Column: Top Costliest + Trip Stats */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top 5 Costliest Vehicles */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-lg font-semibold">
            Top 5 Costliest Vehicles
          </h3>
          {topVehicles.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              No cost data available yet.
            </p>
          ) : (
            <div className="space-y-3">
              {topVehicles.map((v, i) => {
                const maxCost = topVehicles[0]?.totalCost ?? 1;
                const pct =
                  maxCost > 0 ? Math.round((v.totalCost / maxCost) * 100) : 0;
                return (
                  <div key={v._id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {i + 1}. {v.name}
                      </span>
                      <span className="text-gray-600">
                        ${v.totalCost.toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-black"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-0.5 flex justify-between text-[11px] text-gray-400">
                      <span>Fuel: ${v.fuelCost.toLocaleString()}</span>
                      <span>
                        Maintenance: ${v.maintenanceCost.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fleet Overview */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-lg font-semibold">Fleet Overview</h3>
          <div className="grid grid-cols-2 gap-4">
            <StatBlock
              label="Total Vehicles"
              value={kpis?.totalVehicles ?? 0}
            />
            <StatBlock
              label="Active Vehicles"
              value={kpis?.activeVehicles ?? 0}
            />
            <StatBlock label="Total Trips" value={kpis?.totalTrips ?? 0} />
            <StatBlock
              label="Completed Trips"
              value={kpis?.completedTrips ?? 0}
            />
            <StatBlock
              label="Operational Cost"
              value={formatCurrency(kpis?.totalOperationalCost ?? 0)}
            />
            <StatBlock
              label="Completion Rate"
              value={`${kpis?.completionRate ?? 0}%`}
            />
          </div>
        </div>
      </div>

      {/* Monthly Financial Summary */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4 text-sm font-medium">
          Monthly Financial Summary
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-semibold tracking-wide text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Month</th>
                <th className="px-4 py-3 text-right">Fuel Cost</th>
                <th className="px-4 py-3 text-right">Maintenance</th>
                <th className="px-4 py-3 text-right">Total Cost</th>
                <th className="px-4 py-3 text-right">Trips Done</th>
                <th className="px-4 py-3 text-right">Est. Revenue</th>
                <th className="px-4 py-3 text-right">Est. Profit</th>
              </tr>
            </thead>
            <tbody>
              {monthly.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    No financial data available yet. Complete trips and log
                    expenses to see data here.
                  </td>
                </tr>
              ) : (
                monthly.map((row) => (
                  <tr
                    key={row.month}
                    className="border-t border-gray-200 transition-colors hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium">{row.month}</td>
                    <td className="px-4 py-3 text-right">
                      ${row.fuelCost.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      ${row.maintenanceCost.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      ${row.totalCost.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.tripsCompleted}
                    </td>
                    <td className="px-4 py-3 text-right text-green-700">
                      ${row.revenue.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={
                          row.profit >= 0 ? "text-green-700" : "text-red-600"
                        }
                      >
                        {row.profit >= 0 ? "+" : ""}$
                        {row.profit.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {subtext && <p className="mt-1 text-xs text-gray-400">{subtext}</p>}
    </div>
  );
}

function StatBlock({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{String(value)}</p>
    </div>
  );
}
