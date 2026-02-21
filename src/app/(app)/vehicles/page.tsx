"use client";

import { useCallback, useEffect, useState } from "react";

import type { Vehicle, VehicleStatus } from "~/types/vehicle";
import LoadingScreen from "~/components/ui/LoadingScreen";

const STATUS_LABELS: Record<VehicleStatus, string> = {
  available: "Available",
  on_trip: "On Trip",
  in_shop: "In Shop",
  out_of_service: "Out of Service",
};

const STATUS_OPTIONS: Array<{ value: VehicleStatus | "all"; label: string }> = [
  { value: "all", label: "All Status" },
  { value: "available", label: "Available" },
  { value: "on_trip", label: "On Trip" },
  { value: "in_shop", label: "In Shop" },
  { value: "out_of_service", label: "Out of Service" },
];

interface NewVehicleForm {
  name: string;
  model: string;
  licensePlate: string;
  type: "truck" | "van" | "bike";
  maxCapacity: string;
  capacityUnit: "kg" | "ton";
  odometer: string;
  region: string;
}

const initialFormState: NewVehicleForm = {
  name: "",
  model: "",
  licensePlate: "",
  type: "truck",
  maxCapacity: "",
  capacityUnit: "kg",
  odometer: "",
  region: "",
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filtered, setFiltered] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | "all">(
    "all",
  );
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newVehicle, setNewVehicle] =
    useState<NewVehicleForm>(initialFormState);

  const fetchVehicles = async () => {
    try {
      const res = await fetch("/api/vehicles");
      const data = (await res.json()) as { data?: Vehicle[] };
      setVehicles(data.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = useCallback(() => {
    let result = [...vehicles];

    if (statusFilter !== "all") {
      result = result.filter((v) => v.status === statusFilter);
    }

    if (search) {
      const term = search.toLowerCase();
      result = result.filter(
        (v) =>
          v.licensePlate.toLowerCase().includes(term) ||
          v.model.toLowerCase().includes(term) ||
          v.name.toLowerCase().includes(term),
      );
    }

    setFiltered(result);
  }, [vehicles, statusFilter, search]);

  useEffect(() => {
    void fetchVehicles();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const retireVehicle = async (id: string) => {
    await fetch(`/api/vehicles?id=${id}`, { method: "DELETE" });
    void fetchVehicles();
  };

  const addVehicle = async () => {
    await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newVehicle.name,
        model: newVehicle.model,
        licensePlate: newVehicle.licensePlate,
        type: newVehicle.type,
        maxCapacity: Number(newVehicle.maxCapacity),
        capacityUnit: newVehicle.capacityUnit,
        odometer: Number(newVehicle.odometer),
        region: newVehicle.region,
      }),
    });

    setShowModal(false);
    setNewVehicle(initialFormState);
    void fetchVehicles();
  };

  const available = vehicles.filter((v) => v.status === "available").length;
  const activeFleet = vehicles.filter((v) => v.status === "on_trip").length;
  const maintenance = vehicles.filter((v) => v.status === "in_shop").length;

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div>
      {/* HEADER */}
      <div className="my-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">
          Fleet Vehicles
        </h1>

        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-black px-6 py-2 text-white transition hover:bg-gray-800"
        >
          New Vehicle
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Kpi title="Available" value={available} />
        <Kpi title="On Trip" value={activeFleet} />
        <Kpi title="In Shop" value={maintenance} />
      </div>

      {/* FILTER BAR */}
      <div className="mt-6 mb-6 w-full rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between gap-4">
          <input
            type="text"
            placeholder="Search by plate, model, or name..."
            className="flex-1 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm transition outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm transition outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as VehicleStatus | "all")
            }
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => void fetchVehicles()}
            className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm text-black transition hover:bg-gray-100"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">License Plate</th>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Model</th>
              <th className="p-4 text-left">Capacity</th>
              <th className="p-4 text-left">Odometer</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400">
                  No vehicles found.
                </td>
              </tr>
            ) : (
              filtered.map((vehicle) => (
                <tr
                  key={vehicle._id}
                  className="border-t transition hover:bg-gray-50"
                >
                  <td className="p-4 font-medium">{vehicle.licensePlate}</td>
                  <td className="p-4">{vehicle.name}</td>
                  <td className="p-4">{vehicle.model}</td>
                  <td className="p-4">
                    {vehicle.maxCapacity} {vehicle.capacityUnit}
                  </td>
                  <td className="p-4">{vehicle.odometer} km</td>
                  <td className="p-4">
                    <StatusBadge status={vehicle.status} />
                  </td>
                  <td className="p-4">
                    {vehicle.status !== "out_of_service" && (
                      <button
                        onClick={() => void retireVehicle(vehicle._id)}
                        className="text-black hover:underline"
                      >
                        Retire
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow-xl">
            <h2 className="mb-6 text-xl font-semibold">Add New Vehicle</h2>

            <div className="grid gap-4">
              <input
                placeholder="Vehicle Name"
                className="rounded border p-3"
                value={newVehicle.name}
                onChange={(e) =>
                  setNewVehicle({ ...newVehicle, name: e.target.value })
                }
              />

              <input
                placeholder="License Plate"
                className="rounded border p-3"
                value={newVehicle.licensePlate}
                onChange={(e) =>
                  setNewVehicle({
                    ...newVehicle,
                    licensePlate: e.target.value,
                  })
                }
              />

              <input
                placeholder="Model"
                className="rounded border p-3"
                value={newVehicle.model}
                onChange={(e) =>
                  setNewVehicle({ ...newVehicle, model: e.target.value })
                }
              />

              <select
                className="rounded border p-3"
                value={newVehicle.type}
                onChange={(e) =>
                  setNewVehicle({
                    ...newVehicle,
                    type: e.target.value as "truck" | "van" | "bike",
                  })
                }
              >
                <option value="truck">Truck</option>
                <option value="van">Van</option>
                <option value="bike">Bike</option>
              </select>

              <div className="flex gap-3">
                <input
                  type="number"
                  placeholder="Max Capacity"
                  className="w-full rounded border p-3"
                  value={newVehicle.maxCapacity}
                  onChange={(e) =>
                    setNewVehicle({
                      ...newVehicle,
                      maxCapacity: e.target.value,
                    })
                  }
                />
                <select
                  className="rounded border p-3"
                  value={newVehicle.capacityUnit}
                  onChange={(e) =>
                    setNewVehicle({
                      ...newVehicle,
                      capacityUnit: e.target.value as "kg" | "ton",
                    })
                  }
                >
                  <option value="kg">kg</option>
                  <option value="ton">ton</option>
                </select>
              </div>

              <input
                type="number"
                placeholder="Odometer"
                className="rounded border p-3"
                value={newVehicle.odometer}
                onChange={(e) =>
                  setNewVehicle({ ...newVehicle, odometer: e.target.value })
                }
              />

              <input
                placeholder="Region"
                className="rounded border p-3"
                value={newVehicle.region}
                onChange={(e) =>
                  setNewVehicle({ ...newVehicle, region: e.target.value })
                }
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded border px-4 py-2 hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                onClick={() => void addVehicle()}
                className="rounded bg-black px-5 py-2 text-white hover:bg-gray-800"
              >
                Add Vehicle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <h2 className="mt-2 text-3xl font-semibold">{value}</h2>
    </div>
  );
}

function StatusBadge({ status }: { status: VehicleStatus }) {
  const colors: Record<VehicleStatus, string> = {
    available: "bg-green-100 text-green-700",
    on_trip: "bg-blue-100 text-blue-700",
    in_shop: "bg-amber-100 text-amber-700",
    out_of_service: "bg-gray-100 text-gray-500",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${colors[status] ?? ""}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
