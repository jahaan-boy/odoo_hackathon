"use client";

import { useState, useEffect, useCallback } from "react";
import LoadingScreen from "~/components/ui/LoadingScreen";

interface FuelLog {
  _id: string;
  vehicleId: string;
  tripId: string | null;
  vehicleName: string;
  driverName: string;
  tripRoute: string;
  tripStatus: string;
  liters: number;
  cost: number;
  odometer: number;
  date: string;
  createdAt: string;
  distance: number | null;
  kmPerLiter: number | null;
}

interface FuelSummary {
  totalFuelCost: number;
  totalLiters: number;
  avgCostPerLiter: number;
  totalEntries: number;
  avgKmPerLiter: number;
}

interface VehicleOption {
  _id: string;
  name: string;
  licensePlate: string;
  odometer: number;
}

interface TripOption {
  _id: string;
  vehicleId: string;
  vehicleName: string;
  driverName: string;
  origin: string;
  destination: string;
  status: string;
}

export default function ExpensesAndFuelPage() {
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [summary, setSummary] = useState<FuelSummary>({
    totalFuelCost: 0,
    totalLiters: 0,
    avgCostPerLiter: 0,
    totalEntries: 0,
    avgKmPerLiter: 0,
  });
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [trips, setTrips] = useState<TripOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    vehicleId: "",
    tripId: "",
    liters: "",
    cost: "",
    odometer: "",
    date: new Date().toISOString().split("T")[0],
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [fuelRes, vehiclesRes, tripsRes] = await Promise.all([
        fetch("/api/fuel"),
        fetch("/api/vehicles?limit=200"),
        fetch("/api/trips"),
      ]);

      const fuelData = (await fuelRes.json()) as {
        success: boolean;
        data: FuelLog[];
        summary: FuelSummary;
      };
      const vehiclesData = (await vehiclesRes.json()) as {
        success: boolean;
        data: VehicleOption[];
      };
      const tripsData = (await tripsRes.json()) as {
        success: boolean;
        data: TripOption[];
      };

      if (fuelData.success) {
        setFuelLogs(fuelData.data);
        setSummary(fuelData.summary);
      }
      if (vehiclesData.success) {
        setVehicles(vehiclesData.data);
      }
      if (tripsData.success) {
        setTrips(tripsData.data);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Auto-fill odometer when vehicle is selected
    if (name === "vehicleId" && value) {
      const vehicle = vehicles.find((v) => v._id === value);
      if (vehicle) {
        setFormData((prev) => ({
          ...prev,
          vehicleId: value,
          odometer: String(vehicle.odometer ?? ""),
        }));
      }
    }

    // Auto-select vehicle when trip is selected
    if (name === "tripId" && value) {
      const trip = trips.find((t) => t._id === value);
      if (trip) {
        setFormData((prev) => ({
          ...prev,
          tripId: value,
          vehicleId: trip.vehicleId,
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/fuel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: formData.vehicleId,
          tripId: formData.tripId || null,
          liters: Number(formData.liters),
          cost: Number(formData.cost),
          odometer: Number(formData.odometer),
          date: formData.date,
        }),
      });
      const data = (await res.json()) as { success: boolean; message: string };
      if (data.success) {
        setIsModalOpen(false);
        setFormData({
          vehicleId: "",
          tripId: "",
          liters: "",
          cost: "",
          odometer: "",
          date: new Date().toISOString().split("T")[0],
        });
        void fetchData();
      } else {
        alert(data.message ?? "Failed to create fuel log");
      }
    } catch (err) {
      console.error("Failed to create fuel log:", err);
      alert("Failed to create fuel log");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this fuel log?")) return;
    try {
      const res = await fetch(`/api/fuel?id=${id}`, { method: "DELETE" });
      const data = (await res.json()) as { success: boolean };
      if (data.success) {
        void fetchData();
      }
    } catch (err) {
      console.error("Failed to delete fuel log:", err);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setFormData({
      vehicleId: "",
      tripId: "",
      liters: "",
      cost: "",
      odometer: "",
      date: new Date().toISOString().split("T")[0],
    });
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) handleCancel();
  };

  // Filter trips to show only completed/dispatched trips
  const availableTrips = trips.filter(
    (t) =>
      t.status === "Completed" ||
      t.status === "Dispatched" ||
      t.status === "On Trip",
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="my-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">
          Trip Expenses & Fuel
        </h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded-md bg-black px-4 py-2 text-white transition-colors hover:bg-gray-800"
        >
          Log Fuel Expense
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Fuel Cost</p>
          <p className="text-2xl font-bold">
            ₹{summary.totalFuelCost.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Liters</p>
          <p className="text-2xl font-bold">
            {summary.totalLiters.toLocaleString()} L
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Avg Cost / Liter</p>
          <p className="text-2xl font-bold">₹{summary.avgCostPerLiter}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Avg Fuel Efficiency</p>
          <p className="text-2xl font-bold">
            {summary.avgKmPerLiter > 0 ? `${summary.avgKmPerLiter} km/L` : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Entries</p>
          <p className="text-2xl font-bold">{summary.totalEntries}</p>
        </div>
      </div>

      {/* FUEL LOGS TABLE */}
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        {loading ? (
          <LoadingScreen />
        ) : fuelLogs.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            No fuel logs recorded yet. Click &quot;Log Fuel Expense&quot; to add
            one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-2 text-left font-bold">Vehicle</th>
                  <th className="px-3 py-2 text-left font-bold">Driver</th>
                  <th className="px-3 py-2 text-left font-bold">Route</th>
                  <th className="px-3 py-2 text-left font-bold">Liters</th>
                  <th className="px-3 py-2 text-left font-bold">Cost</th>
                  <th className="px-3 py-2 text-left font-bold">Odometer</th>
                  <th className="px-3 py-2 text-left font-bold">km/L</th>
                  <th className="px-3 py-2 text-left font-bold">Date</th>
                  <th className="px-3 py-2 text-left font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fuelLogs.map((log) => (
                  <tr
                    key={log._id}
                    className="border-b border-gray-200 transition-colors hover:bg-gray-100"
                  >
                    <td className="px-3 py-2 font-medium">{log.vehicleName}</td>
                    <td className="px-3 py-2">{log.driverName}</td>
                    <td className="px-3 py-2 text-sm text-gray-600">
                      {log.tripRoute}
                    </td>
                    <td className="px-3 py-2">{log.liters} L</td>
                    <td className="px-3 py-2">₹{log.cost.toLocaleString()}</td>
                    <td className="px-3 py-2">
                      {log.odometer.toLocaleString()} km
                    </td>
                    <td className="px-3 py-2">
                      {log.kmPerLiter !== null ? (
                        <span className="font-medium text-green-700">
                          {log.kmPerLiter} km/L
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {new Date(log.date).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleDelete(log._id)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ADD FUEL LOG MODAL */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={handleOverlayClick}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <h2 className="mb-4 text-xl font-semibold">Log Fuel Expense</h2>

            <form onSubmit={handleSubmit}>
              {/* Trip (optional) */}
              <div className="mb-4">
                <label
                  htmlFor="tripId"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Trip (optional)
                </label>
                <select
                  id="tripId"
                  name="tripId"
                  value={formData.tripId}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-gray-200 focus:outline-none"
                >
                  <option value="">No trip linked</option>
                  {availableTrips.map((trip) => (
                    <option key={trip._id} value={trip._id}>
                      {trip.origin} → {trip.destination} ({trip.driverName}) [
                      {trip.status}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Vehicle */}
              <div className="mb-4">
                <label
                  htmlFor="vehicleId"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Vehicle *
                </label>
                <select
                  id="vehicleId"
                  name="vehicleId"
                  value={formData.vehicleId}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-gray-200 focus:outline-none"
                  required
                >
                  <option value="">Select vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.name} ({v.licensePlate})
                    </option>
                  ))}
                </select>
              </div>

              {/* Liters */}
              <div className="mb-4">
                <label
                  htmlFor="liters"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Liters *
                </label>
                <input
                  type="number"
                  id="liters"
                  name="liters"
                  value={formData.liters}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-gray-200 focus:outline-none"
                  placeholder="Enter liters"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              {/* Cost */}
              <div className="mb-4">
                <label
                  htmlFor="cost"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Cost (₹) *
                </label>
                <input
                  type="number"
                  id="cost"
                  name="cost"
                  value={formData.cost}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-gray-200 focus:outline-none"
                  placeholder="Enter cost"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              {/* Odometer */}
              <div className="mb-4">
                <label
                  htmlFor="odometer"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Odometer (km) *
                </label>
                <input
                  type="number"
                  id="odometer"
                  name="odometer"
                  value={formData.odometer}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-gray-200 focus:outline-none"
                  placeholder="Current odometer reading"
                  min="0"
                  required
                />
              </div>

              {/* Date */}
              <div className="mb-4">
                <label
                  htmlFor="date"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Date *
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-gray-200 focus:outline-none"
                  required
                />
              </div>

              {/* Buttons */}
              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-md bg-black px-4 py-2 text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Create"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-black transition-colors hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
