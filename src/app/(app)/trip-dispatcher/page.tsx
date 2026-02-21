"use client";

import { useCallback, useEffect, useState } from "react";
import LoadingScreen from "~/components/ui/LoadingScreen";

interface VehicleOption {
  _id: string;
  name: string;
  licensePlate: string;
  maxCapacity: number;
  capacityUnit: string;
  status: string;
}

interface DriverOption {
  _id: string;
  name: string;
  status: string;
}

interface Trip {
  _id: string;
  vehicleName: string;
  driverName: string;
  origin: string;
  destination: string;
  cargoWeight: number;
  status: string;
  createdAt: string;
}

export default function TripDispatcherPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    vehicleId: "",
    cargoWeight: "",
    driverId: "",
    origin: "",
    destination: "",
    estimatedFuelCost: "",
    distance: "",
  });

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [tripsRes, vehiclesRes, driversRes] = await Promise.all([
        fetch("/api/trips"),
        fetch("/api/vehicles"),
        fetch("/api/drivers"),
      ]);

      const tripsJson = (await tripsRes.json()) as {
        success: boolean;
        data?: Trip[];
      };
      const vehiclesJson = (await vehiclesRes.json()) as {
        success: boolean;
        data?: VehicleOption[];
      };
      const driversJson = (await driversRes.json()) as {
        success: boolean;
        data?: DriverOption[];
      };

      setTrips(tripsJson.data ?? []);
      setVehicles(vehiclesJson.data ?? []);
      setDrivers(driversJson.data ?? []);
    } catch (err) {
      console.error(err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  // Only show available vehicles and on-duty drivers in the form
  const availableVehicles = vehicles.filter(
    (v) => v.status === "available" || v.status === "Available",
  );
  const availableDrivers = drivers.filter(
    (d) => d.status === "On Duty" || d.status === "on_duty",
  );

  // Show selected vehicle's max capacity
  const selectedVehicle = vehicles.find((v) => v._id === formData.vehicleId);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDispatching(true);
    setError(null);

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: formData.vehicleId,
          driverId: formData.driverId,
          cargoWeight: Number(formData.cargoWeight),
          origin: formData.origin,
          destination: formData.destination,
          estimatedFuelCost: Number(formData.estimatedFuelCost),
          distance: formData.distance ? Number(formData.distance) : null,
        }),
      });

      const data = (await res.json()) as {
        success: boolean;
        message?: string;
      };

      if (!res.ok || !data.success) {
        setError(data.message ?? "Failed to dispatch trip");
        return;
      }

      // Reset form and refresh data
      setFormData({
        vehicleId: "",
        cargoWeight: "",
        driverId: "",
        origin: "",
        destination: "",
        estimatedFuelCost: "",
        distance: "",
      });
      void fetchAll();
    } catch (err) {
      console.error(err);
      setError("Server error occurred");
    } finally {
      setDispatching(false);
    }
  };

  const updateTripStatus = async (tripId: string, status: string) => {
    try {
      const res = await fetch("/api/trips", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: tripId, status }),
      });

      const data = (await res.json()) as {
        success: boolean;
        message?: string;
      };

      if (!data.success) {
        setError(data.message ?? "Failed to update trip");
        return;
      }

      void fetchAll();
    } catch (err) {
      console.error(err);
      setError("Server error occurred");
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Dispatched":
        return "bg-blue-100 text-blue-800";
      case "Completed":
        return "bg-green-100 text-green-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      case "Draft":
      case "draft":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
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
          Trip Dispatcher
        </h1>
        <button
          type="button"
          onClick={() => void fetchAll()}
          className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm text-black transition hover:bg-gray-100"
        >
          Refresh
        </button>
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

      {/* SECTION 1: Trip Fleet Table */}
      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4 text-sm font-medium">
          All Trips ({trips.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-semibold tracking-wide text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Trip ID</th>
                <th className="px-4 py-3 text-left">Vehicle</th>
                <th className="px-4 py-3 text-left">Driver</th>
                <th className="px-4 py-3 text-left">Origin</th>
                <th className="px-4 py-3 text-left">Destination</th>
                <th className="px-4 py-3 text-left">Cargo</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {trips.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    No trips found.
                  </td>
                </tr>
              ) : (
                trips.map((trip) => (
                  <tr
                    key={trip._id}
                    className="border-t border-gray-200 transition-colors hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium">
                      TR-{trip._id.slice(-4).toUpperCase()}
                    </td>
                    <td className="px-4 py-3">{trip.vehicleName}</td>
                    <td className="px-4 py-3">{trip.driverName}</td>
                    <td className="px-4 py-3">{trip.origin}</td>
                    <td className="px-4 py-3">{trip.destination}</td>
                    <td className="px-4 py-3">{trip.cargoWeight} kg</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(trip.status)}`}
                      >
                        {trip.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {trip.status === "Dispatched" && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void updateTripStatus(trip._id, "Completed")
                            }
                            className="text-xs font-medium text-green-700 hover:underline"
                          >
                            Complete
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void updateTripStatus(trip._id, "Cancelled")
                            }
                            className="text-xs font-medium text-red-700 hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 2: New Trip Form */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-xl font-semibold">Dispatch New Trip</h2>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Select Vehicle */}
            <div>
              <label
                htmlFor="vehicleId"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Select Vehicle
              </label>
              <select
                id="vehicleId"
                name="vehicleId"
                value={formData.vehicleId}
                onChange={handleInputChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-gray-200 focus:outline-none"
                required
              >
                <option value="">Choose a vehicle</option>
                {availableVehicles.map((vehicle) => (
                  <option key={vehicle._id} value={vehicle._id}>
                    {vehicle.name} ({vehicle.licensePlate}) — Max:{" "}
                    {vehicle.maxCapacity} {vehicle.capacityUnit ?? "kg"}
                  </option>
                ))}
              </select>
              {availableVehicles.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  No available vehicles. All vehicles are on trip, in shop, or
                  retired.
                </p>
              )}
            </div>

            {/* Select Driver */}
            <div>
              <label
                htmlFor="driverId"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Select Driver
              </label>
              <select
                id="driverId"
                name="driverId"
                value={formData.driverId}
                onChange={handleInputChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-gray-200 focus:outline-none"
                required
              >
                <option value="">Choose a driver</option>
                {availableDrivers.map((driver) => (
                  <option key={driver._id} value={driver._id}>
                    {driver.name}
                  </option>
                ))}
              </select>
              {availableDrivers.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  No available drivers. All drivers are on trip or suspended.
                </p>
              )}
            </div>

            {/* Cargo Weight */}
            <div>
              <label
                htmlFor="cargoWeight"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Cargo Weight (kg)
              </label>
              <input
                type="number"
                id="cargoWeight"
                name="cargoWeight"
                value={formData.cargoWeight}
                onChange={handleInputChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-gray-200 focus:outline-none"
                placeholder="Enter weight in kg"
                required
              />
              {selectedVehicle &&
                formData.cargoWeight &&
                Number(formData.cargoWeight) > selectedVehicle.maxCapacity && (
                  <p className="mt-1 text-xs text-red-600">
                    Exceeds vehicle max capacity of{" "}
                    {selectedVehicle.maxCapacity}{" "}
                    {selectedVehicle.capacityUnit ?? "kg"}
                  </p>
                )}
            </div>

            {/* Estimated Fuel Cost */}
            <div>
              <label
                htmlFor="estimatedFuelCost"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Estimated Fuel Cost ($)
              </label>
              <input
                type="number"
                id="estimatedFuelCost"
                name="estimatedFuelCost"
                value={formData.estimatedFuelCost}
                onChange={handleInputChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-gray-200 focus:outline-none"
                placeholder="Enter estimated fuel cost"
                required
              />
            </div>

            {/* Distance */}
            <div>
              <label
                htmlFor="distance"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Distance (km)
              </label>
              <input
                type="number"
                id="distance"
                name="distance"
                value={formData.distance}
                onChange={handleInputChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-gray-200 focus:outline-none"
                placeholder="Enter route distance in km"
                min="0"
                step="0.1"
              />
            </div>

            {/* Origin Address */}
            <div>
              <label
                htmlFor="origin"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Origin Address
              </label>
              <input
                type="text"
                id="origin"
                name="origin"
                value={formData.origin}
                onChange={handleInputChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-gray-200 focus:outline-none"
                placeholder="Enter origin address"
                required
              />
            </div>

            {/* Destination */}
            <div>
              <label
                htmlFor="destination"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Destination
              </label>
              <input
                type="text"
                id="destination"
                name="destination"
                value={formData.destination}
                onChange={handleInputChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-gray-200 focus:outline-none"
                placeholder="Enter destination address"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={dispatching}
            className="w-full rounded-md bg-black px-4 py-2.5 font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            {dispatching ? "Dispatching..." : "Confirm & Dispatch Trip"}
          </button>
        </form>
      </section>
    </div>
  );
}
