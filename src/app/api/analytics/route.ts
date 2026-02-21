import { NextResponse } from "next/server";
import { getDb } from "~/server/mongodb/client";

export async function GET() {
  try {
    const db = await getDb();

    // Fetch all data in parallel
    const [vehicles, trips, serviceLogs, fuelLogs, drivers] = await Promise.all(
      [
        db.collection("vehicles").find({}).toArray(),
        db.collection("trips").find({}).toArray(),
        db.collection("services").find({}).toArray(),
        db.collection("fuelLogs").find({}).toArray(),
        db.collection("drivers").find({}).toArray(),
      ],
    );

    // ── KPI Calculations ──

    // Total fuel cost from fuel logs
    const totalFuelCost = fuelLogs.reduce(
      (sum, log) => sum + Number(log.cost ?? 0),
      0,
    );

    // Total fuel cost from trip estimates (fallback if no fuel logs)
    const totalEstimatedFuelCost = trips.reduce(
      (sum, t) => sum + Number(t.estimatedFuelCost ?? 0),
      0,
    );

    // Total maintenance cost
    const totalMaintenanceCost = serviceLogs.reduce(
      (sum, log) => sum + Number(log.cost ?? 0),
      0,
    );

    // Utilization rate
    const activeVehicles = vehicles.filter(
      (v) => v.status !== "out_of_service",
    );
    const onTripVehicles = vehicles.filter(
      (v) => v.status === "on_trip" || v.status === "On Trip",
    );
    const utilizationRate =
      activeVehicles.length > 0
        ? Math.round((onTripVehicles.length / activeVehicles.length) * 100)
        : 0;

    // Completed trips
    const completedTrips = trips.filter(
      (t) => t.status === "Completed" || t.status === "completed",
    );
    const totalTrips = trips.length;
    const completionRate =
      totalTrips > 0
        ? Math.round((completedTrips.length / totalTrips) * 100)
        : 0;

    // Total operational cost
    const fuelCostToUse =
      totalFuelCost > 0 ? totalFuelCost : totalEstimatedFuelCost;
    const totalOperationalCost = fuelCostToUse + totalMaintenanceCost;

    // Fleet ROI: (revenue proxy - costs) / costs
    // Using completed trip count * average estimated fuel as a rough revenue proxy
    // since we don't have a revenue field yet
    const avgTripValue =
      completedTrips.length > 0
        ? completedTrips.reduce(
            (sum, t) => sum + Number(t.estimatedFuelCost ?? 0),
            0,
          ) / completedTrips.length
        : 0;
    const estimatedRevenue = avgTripValue * completedTrips.length * 2.5; // rough 2.5x markup
    const fleetROI =
      totalOperationalCost > 0
        ? Math.round(
            ((estimatedRevenue - totalOperationalCost) / totalOperationalCost) *
              100,
          )
        : 0;

    // ── Per-Vehicle Cost Breakdown (top 5 costliest) ──
    const vehicleCostMap = new Map<
      string,
      { name: string; fuelCost: number; maintenanceCost: number }
    >();

    for (const v of vehicles) {
      vehicleCostMap.set(v._id.toString(), {
        name: String(v.name ?? v.licensePlate ?? "Unknown"),
        fuelCost: 0,
        maintenanceCost: 0,
      });
    }

    for (const log of fuelLogs) {
      const vId = String(log.vehicleId ?? "");
      const entry = vehicleCostMap.get(vId);
      if (entry) {
        entry.fuelCost += Number(log.cost ?? 0);
      }
    }

    // Also aggregate from trip estimated fuel costs per vehicle
    for (const t of trips) {
      const vId = String(t.vehicleId ?? "");
      const entry = vehicleCostMap.get(vId);
      if (entry && totalFuelCost === 0) {
        // only use estimates if no real fuel logs
        entry.fuelCost += Number(t.estimatedFuelCost ?? 0);
      }
    }

    for (const log of serviceLogs) {
      // The maintenance logs store vehicle as a string name, not ObjectId
      // Try to match by name or by vehicleId field
      const vId = String(log.vehicleId ?? "");
      const entry = vehicleCostMap.get(vId);
      if (entry) {
        entry.maintenanceCost += Number(log.cost ?? 0);
      }
    }

    const topCostliestVehicles = [...vehicleCostMap.entries()]
      .map(([id, data]) => ({
        _id: id,
        name: data.name,
        fuelCost: data.fuelCost,
        maintenanceCost: data.maintenanceCost,
        totalCost: data.fuelCost + data.maintenanceCost,
      }))
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 5);

    // ── Monthly Breakdown ──
    const monthlyMap = new Map<
      string,
      { fuelCost: number; maintenanceCost: number; tripsCompleted: number }
    >();

    const getMonthKey = (date: unknown): string | null => {
      if (!date) return null;
      const d = new Date(date as string | number | Date);
      if (isNaN(d.getTime())) return null;
      const year = d.getFullYear();
      const month = d.getMonth(); // 0-indexed
      return `${year}-${String(month + 1).padStart(2, "0")}`;
    };

    const getOrCreateMonth = (key: string) => {
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, {
          fuelCost: 0,
          maintenanceCost: 0,
          tripsCompleted: 0,
        });
      }
      return monthlyMap.get(key)!;
    };

    // Aggregate fuel logs by month
    for (const log of fuelLogs) {
      const key = getMonthKey(log.date ?? log.createdAt);
      if (key) {
        getOrCreateMonth(key).fuelCost += Number(log.cost ?? 0);
      }
    }

    // Aggregate estimated fuel from trips if no fuel logs
    if (totalFuelCost === 0) {
      for (const t of trips) {
        const key = getMonthKey(t.createdAt);
        if (key) {
          getOrCreateMonth(key).fuelCost += Number(t.estimatedFuelCost ?? 0);
        }
      }
    }

    // Aggregate maintenance by month
    for (const log of serviceLogs) {
      const key = getMonthKey(log.date ?? log.createdAt);
      if (key) {
        getOrCreateMonth(key).maintenanceCost += Number(log.cost ?? 0);
      }
    }

    // Count completed trips by month
    for (const t of completedTrips) {
      const key = getMonthKey(t.completedAt ?? t.updatedAt ?? t.createdAt);
      if (key) {
        getOrCreateMonth(key).tripsCompleted += 1;
      }
    }

    // Sort monthly data chronologically and format
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const monthlySummary = [...monthlyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => {
        const [yearStr, monthStr] = key.split("-");
        const monthIndex = parseInt(monthStr ?? "1", 10) - 1;
        const totalCost = data.fuelCost + data.maintenanceCost;
        // Rough revenue estimate: 2.5x of total cost for completed trips
        const revenue = data.tripsCompleted > 0 ? totalCost * 2.5 : 0;
        return {
          month: `${monthNames[monthIndex] ?? "?"} ${yearStr}`,
          fuelCost: data.fuelCost,
          maintenanceCost: data.maintenanceCost,
          totalCost,
          tripsCompleted: data.tripsCompleted,
          revenue: Math.round(revenue),
          profit: Math.round(revenue - totalCost),
        };
      });

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          totalFuelCost: fuelCostToUse,
          totalMaintenanceCost,
          totalOperationalCost,
          utilizationRate,
          fleetROI,
          completionRate,
          totalTrips,
          completedTrips: completedTrips.length,
          totalVehicles: vehicles.length,
          activeVehicles: activeVehicles.length,
        },
        topCostliestVehicles,
        monthlySummary,
        tripFuelCosts: (() => {
          // Build lookup maps
          const vehicleNameMap = new Map(
            vehicles.map((v) => [
              v._id.toString(),
              String(v.name ?? v.licensePlate ?? "Unknown"),
            ]),
          );
          const driverNameMap = new Map(
            drivers.map((d) => [d._id.toString(), String(d.name ?? "Unknown")]),
          );

          // Aggregate actual fuel cost per trip from fuelLogs
          const actualFuelByTrip = new Map<
            string,
            { cost: number; liters: number }
          >();
          for (const log of fuelLogs) {
            const tId = log.tripId ? String(log.tripId) : null;
            if (!tId) continue;
            const existing = actualFuelByTrip.get(tId) ?? {
              cost: 0,
              liters: 0,
            };
            existing.cost += Number(log.cost ?? 0);
            existing.liters += Number(log.liters ?? 0);
            actualFuelByTrip.set(tId, existing);
          }

          return trips
            .map((t) => {
              const tripId = t._id.toString();
              const actual = actualFuelByTrip.get(tripId);
              return {
                _id: tripId,
                vehicleName:
                  vehicleNameMap.get(String(t.vehicleId ?? "")) ?? "Unknown",
                driverName:
                  driverNameMap.get(String(t.driverId ?? "")) ?? "Unknown",
                origin: String(t.origin ?? ""),
                destination: String(t.destination ?? ""),
                distance: t.distance != null ? Number(t.distance) : null,
                status: String(t.status ?? "Draft"),
                estimatedFuelCost: Number(t.estimatedFuelCost ?? 0),
                actualFuelCost: actual?.cost ?? 0,
                actualLiters: actual?.liters ?? 0,
                createdAt: t.createdAt as Date,
              };
            })
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            );
        })(),
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
