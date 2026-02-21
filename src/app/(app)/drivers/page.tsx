"use client";

import { useCallback, useEffect, useState } from "react";
import LoadingScreen from "~/components/ui/LoadingScreen";

interface Driver {
  _id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
  safetyScore: number;
  tripsCompleted?: number;
  status: string;
  isActive: boolean;
  createdAt: string;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    licenseNumber: "",
    licenseExpiry: "",
  });

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/drivers");
      const json = (await res.json()) as {
        success: boolean;
        data?: Driver[];
        message?: string;
      };

      if (!json.success) {
        setError(json.message ?? "Failed to load drivers");
        return;
      }

      setDrivers(json.data ?? []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDrivers();
  }, [fetchDrivers]);

  const addDriver = async () => {
    if (
      !form.name ||
      !form.phone ||
      !form.licenseNumber ||
      !form.licenseExpiry
    ) {
      setError("Please fill all fields");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = (await res.json()) as {
        success: boolean;
        message?: string;
      };

      if (!res.ok || !data.success) {
        setError(data.message ?? "Failed to add driver");
        return;
      }

      setForm({ name: "", phone: "", licenseNumber: "", licenseExpiry: "" });
      setShowModal(false);
      void fetchDrivers();
    } catch (err) {
      console.error(err);
      setError("Server error occurred");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/drivers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });

      const data = (await res.json()) as {
        success: boolean;
        message?: string;
      };

      if (!data.success) {
        setError(data.message ?? "Failed to update driver");
        return;
      }

      void fetchDrivers();
    } catch (err) {
      console.error(err);
      setError("Server error occurred");
    }
  };

  const suspendDriver = async (id: string) => {
    try {
      await fetch(`/api/drivers?id=${id}`, { method: "DELETE" });
      void fetchDrivers();
    } catch (err) {
      console.error(err);
      setError("Server error occurred");
    }
  };

  // Computed stats
  const activeDrivers = drivers.filter(
    (d) => d.isActive !== false && d.status !== "Suspended",
  );
  const onDutyCount = drivers.filter(
    (d) => d.status === "On Duty" || d.status === "on_duty",
  ).length;
  const onTripCount = drivers.filter(
    (d) => d.status === "On Trip" || d.status === "on_trip",
  ).length;
  const suspendedCount = drivers.filter((d) => d.status === "Suspended").length;
  const avgSafetyScore =
    activeDrivers.length > 0
      ? Math.round(
          activeDrivers.reduce((sum, d) => sum + (d.safetyScore ?? 0), 0) /
            activeDrivers.length,
        )
      : 0;

  // Check license expiry
  const isExpired = (expiry: string) => {
    if (!expiry) return false;
    return new Date(expiry) < new Date();
  };

  const isExpiringSoon = (expiry: string) => {
    if (!expiry) return false;
    const expiryDate = new Date(expiry);
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    return expiryDate > new Date() && expiryDate <= thirtyDays;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800";
    if (score >= 70) return "bg-amber-100 text-amber-800";
    return "bg-red-100 text-red-800";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "On Duty":
      case "on_duty":
        return "bg-green-100 text-green-700";
      case "On Trip":
      case "on_trip":
        return "bg-blue-100 text-blue-700";
      case "Suspended":
        return "bg-red-100 text-red-700";
      case "Off Duty":
      case "off_duty":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="my-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">
          Driver Performance & Safety
        </h1>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => void fetchDrivers()}
            className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm text-black transition hover:bg-gray-100"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-black px-6 py-2 text-sm text-white transition hover:bg-gray-800"
          >
            + Add Driver
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-3 font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">On Duty</p>
          <h2 className="mt-2 text-3xl font-semibold">{onDutyCount}</h2>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">On Trip</p>
          <h2 className="mt-2 text-3xl font-semibold">{onTripCount}</h2>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Suspended</p>
          <h2 className="mt-2 text-3xl font-semibold">{suspendedCount}</h2>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Avg Safety Score</p>
          <h2 className="mt-2 text-3xl font-semibold">{avgSafetyScore}</h2>
        </div>
      </div>

      {/* Drivers Table */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4 text-sm font-medium">
          All Drivers ({drivers.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-semibold tracking-wide text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">License #</th>
                <th className="px-4 py-3 text-left">License Expiry</th>
                <th className="px-4 py-3 text-left">Safety Score</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    No drivers found.
                  </td>
                </tr>
              ) : (
                drivers.map((driver) => (
                  <tr
                    key={driver._id}
                    className="border-t border-gray-200 transition-colors hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium">{driver.name}</td>
                    <td className="px-4 py-3">{driver.phone}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {driver.licenseNumber}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          isExpired(driver.licenseExpiry)
                            ? "font-semibold text-red-600"
                            : isExpiringSoon(driver.licenseExpiry)
                              ? "font-semibold text-amber-600"
                              : ""
                        }
                      >
                        {formatDate(driver.licenseExpiry)}
                      </span>
                      {isExpired(driver.licenseExpiry) && (
                        <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                          EXPIRED
                        </span>
                      )}
                      {isExpiringSoon(driver.licenseExpiry) && (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                          EXPIRING
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${getScoreBadge(driver.safetyScore ?? 0)}`}
                      >
                        {driver.safetyScore ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusBadge(driver.status)}`}
                      >
                        {driver.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {driver.status === "On Duty" && (
                          <button
                            type="button"
                            onClick={() =>
                              void updateStatus(driver._id, "Off Duty")
                            }
                            className="text-xs font-medium text-gray-600 hover:underline"
                          >
                            Off Duty
                          </button>
                        )}
                        {driver.status === "Off Duty" && (
                          <button
                            type="button"
                            onClick={() =>
                              void updateStatus(driver._id, "On Duty")
                            }
                            className="text-xs font-medium text-green-700 hover:underline"
                          >
                            On Duty
                          </button>
                        )}
                        {driver.status !== "Suspended" && (
                          <button
                            type="button"
                            onClick={() => void suspendDriver(driver._id)}
                            className="text-xs font-medium text-red-600 hover:underline"
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ADD DRIVER MODAL */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow-xl">
            <h2 className="mb-6 text-xl font-semibold">Add New Driver</h2>

            <div className="grid gap-4">
              <div>
                <label
                  htmlFor="driverName"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Full Name
                </label>
                <input
                  id="driverName"
                  placeholder="Driver full name"
                  className="w-full rounded border p-3 text-sm"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <label
                  htmlFor="driverPhone"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Phone
                </label>
                <input
                  id="driverPhone"
                  placeholder="Phone number"
                  className="w-full rounded border p-3 text-sm"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div>
                <label
                  htmlFor="driverLicense"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  License Number
                </label>
                <input
                  id="driverLicense"
                  placeholder="e.g. DL-12345"
                  className="w-full rounded border p-3 text-sm"
                  value={form.licenseNumber}
                  onChange={(e) =>
                    setForm({ ...form, licenseNumber: e.target.value })
                  }
                />
              </div>

              <div>
                <label
                  htmlFor="driverExpiry"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  License Expiry Date
                </label>
                <input
                  id="driverExpiry"
                  type="date"
                  className="w-full rounded border p-3 text-sm"
                  value={form.licenseExpiry}
                  onChange={(e) =>
                    setForm({ ...form, licenseExpiry: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded border px-4 py-2 text-sm hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void addDriver()}
                disabled={saving}
                className="rounded bg-black px-5 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add Driver"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
