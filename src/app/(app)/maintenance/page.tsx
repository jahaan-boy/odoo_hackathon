"use client";

import { useEffect, useState } from "react";
import LoadingScreen from "~/components/ui/LoadingScreen";

type ServiceLogStatus = "IN PROGRESS" | "COMPLETED" | "SCHEDULED";

interface ServiceLog {
  _id: string;
  vehicle: string;
  service: string;
  description: string;
  cost: number;
  date: string;
  status: ServiceLogStatus;
}

interface ApiListResponse {
  data?: ServiceLog[];
  message?: string;
}

interface ApiMutateResponse {
  message?: string;
}

export default function MaintenancePage() {
  const [logs, setLogs] = useState<ServiceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    vehicle: "",
    service: "",
    description: "",
    cost: "",
    date: "",
    status: "SCHEDULED",
  });

  // ==============================
  // FETCH LOGS
  // ==============================
  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/maintenance");
      const data = (await res.json()) as ApiListResponse;

      if (res.ok) {
        setLogs(data.data ?? []);
      } else {
        console.error("Fetch error:", data.message);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLogs();
  }, []);

  const addLog = async () => {
    if (
      !form.vehicle ||
      !form.service ||
      !form.description ||
      !form.cost ||
      !form.date
    ) {
      alert("Please fill all fields");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          cost: Number(form.cost),
        }),
      });

      const data = (await res.json()) as ApiMutateResponse;

      if (!res.ok) {
        alert(data.message ?? "Failed to save log");
        return;
      }

      // Reset form
      setForm({
        vehicle: "",
        service: "",
        description: "",
        cost: "",
        date: "",
        status: "SCHEDULED",
      });

      setShowModal(false);
      void fetchLogs(); // refresh table
    } catch (error) {
      console.error("Error adding log:", error);
      alert("Server error occurred");
    } finally {
      setSaving(false);
    }
  };

  const totalSpend = logs.reduce((acc, log) => acc + log.cost, 0);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-10">
      {/* HEADER */}
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Maintenance & Service
          </h1>
          <p className="mt-2 text-gray-500">
            Total spend:{" "}
            <span className="font-semibold text-black">
              ${totalSpend.toLocaleString()}
            </span>
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-black px-6 py-2 text-white transition hover:bg-gray-800"
        >
          Log Service
        </button>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-xs tracking-wider text-gray-600 uppercase">
            <tr>
              <th className="p-4 text-left">Vehicle</th>
              <th className="p-4 text-left">Service</th>
              <th className="p-4 text-left">Description</th>
              <th className="p-4 text-left">Cost</th>
              <th className="p-4 text-left">Date</th>
              <th className="p-4 text-left">Status</th>
            </tr>
          </thead>

          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  No maintenance logs found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log._id}
                  className="border-t transition hover:bg-gray-50"
                >
                  <td className="p-4 font-medium">{log.vehicle}</td>
                  <td className="p-4">{log.service}</td>
                  <td className="p-4 text-gray-500">{log.description}</td>
                  <td className="p-4 font-medium">
                    ${log.cost.toLocaleString()}
                  </td>
                  <td className="p-4">{log.date}</td>
                  <td className="p-4">
                    <StatusBadge status={log.status} />
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
            <h2 className="mb-6 text-xl font-semibold">Log New Service</h2>

            <div className="grid gap-4">
              <input
                placeholder="Vehicle Name"
                className="rounded border p-3"
                value={form.vehicle}
                onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
              />
              <input
                placeholder="Service Type"
                className="rounded border p-3"
                value={form.service}
                onChange={(e) => setForm({ ...form, service: e.target.value })}
              />
              <textarea
                placeholder="Description"
                className="rounded border p-3"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
              <input
                type="number"
                placeholder="Cost"
                className="rounded border p-3"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
              />
              <input
                type="date"
                className="rounded border p-3"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
              <select
                className="rounded border p-3"
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as ServiceLogStatus,
                  })
                }
              >
                <option value="IN PROGRESS">IN PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="SCHEDULED">SCHEDULED</option>
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded border px-4 py-2 hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                onClick={addLog}
                disabled={saving}
                className="rounded bg-black px-5 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Log"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
      {status}
    </span>
  );
}
