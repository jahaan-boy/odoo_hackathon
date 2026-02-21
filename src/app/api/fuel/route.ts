import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "~/server/mongodb/client";

interface FuelLogDoc {
  _id: ObjectId;
  vehicleId: ObjectId;
  tripId: ObjectId | null;
  liters: number;
  cost: number;
  odometer: number;
  date: Date;
  createdAt: Date;
}

export async function GET() {
  try {
    const db = await getDb();

    const fuelLogs = await db
      .collection<FuelLogDoc>("fuelLogs")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Collect unique vehicle and trip IDs for enrichment
    const vehicleIds = [
      ...new Set(
        fuelLogs
          .map((f) => String(f.vehicleId ?? ""))
          .filter((id) => id.length > 0),
      ),
    ];
    const tripIds = [
      ...new Set(
        fuelLogs
          .map((f) => String(f.tripId ?? ""))
          .filter((id) => id.length > 0),
      ),
    ];

    const [vehicleDocs, tripDocs] = await Promise.all([
      vehicleIds.length > 0
        ? db
            .collection("vehicles")
            .find({ _id: { $in: vehicleIds.map((id) => new ObjectId(id)) } })
            .toArray()
        : Promise.resolve([]),
      tripIds.length > 0
        ? db
            .collection("trips")
            .find({ _id: { $in: tripIds.map((id) => new ObjectId(id)) } })
            .toArray()
        : Promise.resolve([]),
    ]);

    // Get driver IDs from trips for enrichment
    const driverIds = [
      ...new Set(
        tripDocs
          .map((t) => String(t.driverId ?? ""))
          .filter((id) => id.length > 0),
      ),
    ];

    const driverDocs =
      driverIds.length > 0
        ? await db
            .collection("drivers")
            .find({ _id: { $in: driverIds.map((id) => new ObjectId(id)) } })
            .toArray()
        : [];

    const vehicleMap = new Map(
      vehicleDocs.map((v) => [
        v._id.toString(),
        String(v.name ?? v.licensePlate ?? "Unknown"),
      ]),
    );
    const driverMap = new Map(
      driverDocs.map((d) => [d._id.toString(), String(d.name ?? "Unknown")]),
    );

    // Build trip map with driver name and distance
    const tripMap = new Map(
      tripDocs.map((t) => [
        t._id.toString(),
        {
          origin: String(t.origin ?? ""),
          destination: String(t.destination ?? ""),
          driverId: String(t.driverId ?? ""),
          driverName: driverMap.get(String(t.driverId ?? "")) ?? "Unknown",
          status: String(t.status ?? ""),
          // prefer explicit distance field, fall back to odometer delta
          distance: (() => {
            if (t.distance != null) return Number(t.distance);
            if (t.endOdometer && t.startOdometer)
              return Number(t.endOdometer) - Number(t.startOdometer);
            return null;
          })(),
          cargoWeight: Number(t.cargoWeight ?? 0),
        },
      ]),
    );

    const enriched = fuelLogs.map((f) => {
      const tripId = f.tripId ? f.tripId.toString() : null;
      const trip = tripId ? tripMap.get(tripId) : null;
      const kmPerLiter =
        trip?.distance && f.liters > 0
          ? Math.round((trip.distance / f.liters) * 100) / 100
          : null;
      return {
        _id: f._id.toString(),
        vehicleId: f.vehicleId.toString(),
        tripId,
        vehicleName: vehicleMap.get(f.vehicleId.toString()) ?? "Unknown",
        driverName: trip?.driverName ?? "N/A",
        tripRoute: trip
          ? `${trip.origin} → ${trip.destination}`
          : "No trip linked",
        tripStatus: trip?.status ?? "N/A",
        liters: f.liters,
        cost: f.cost,
        odometer: f.odometer,
        date: f.date,
        createdAt: f.createdAt,
        distance: trip?.distance ?? null,
        kmPerLiter,
      };
    });

    // Compute summary KPIs
    const totalFuelCost = fuelLogs.reduce((sum, f) => sum + (f.cost ?? 0), 0);
    const totalLiters = fuelLogs.reduce((sum, f) => sum + (f.liters ?? 0), 0);
    const avgCostPerLiter = totalLiters > 0 ? totalFuelCost / totalLiters : 0;

    // Average fuel efficiency across logs that have distance data
    const logsWithEfficiency = enriched.filter((e) => e.kmPerLiter !== null);
    const avgKmPerLiter =
      logsWithEfficiency.length > 0
        ? Math.round(
            (logsWithEfficiency.reduce(
              (sum, e) => sum + (e.kmPerLiter ?? 0),
              0,
            ) /
              logsWithEfficiency.length) *
              100,
          ) / 100
        : 0;

    return NextResponse.json({
      success: true,
      data: enriched,
      summary: {
        totalFuelCost,
        totalLiters,
        avgCostPerLiter: Math.round(avgCostPerLiter * 100) / 100,
        totalEntries: fuelLogs.length,
        avgKmPerLiter,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body = (await req.json()) as Record<string, unknown>;

    const vehicleId = body.vehicleId as string | undefined;
    const tripId = (body.tripId as string | undefined) ?? null;
    const liters = body.liters as number | undefined;
    const cost = body.cost as number | undefined;
    const odometer = body.odometer as number | undefined;
    const date = body.date as string | undefined;

    if (!vehicleId || !liters || !cost || odometer === undefined || !date) {
      return NextResponse.json(
        {
          success: false,
          message: "vehicleId, liters, cost, odometer, and date are required",
        },
        { status: 400 },
      );
    }

    // Validate vehicle exists
    const vehicle = await db
      .collection("vehicles")
      .findOne({ _id: new ObjectId(vehicleId) });

    if (!vehicle) {
      return NextResponse.json(
        { success: false, message: "Vehicle not found" },
        { status: 404 },
      );
    }

    // If tripId provided, validate it exists
    if (tripId) {
      const trip = await db
        .collection("trips")
        .findOne({ _id: new ObjectId(tripId) });
      if (!trip) {
        return NextResponse.json(
          { success: false, message: "Trip not found" },
          { status: 404 },
        );
      }
    }

    const newFuelLog = {
      vehicleId: new ObjectId(vehicleId),
      tripId: tripId ? new ObjectId(tripId) : null,
      liters: Number(liters),
      cost: Number(cost),
      odometer: Number(odometer),
      date: new Date(date),
      createdAt: new Date(),
    };

    const result = await db.collection("fuelLogs").insertOne(newFuelLog);

    // Update vehicle odometer
    await db
      .collection("vehicles")
      .updateOne(
        { _id: new ObjectId(vehicleId) },
        { $set: { odometer: Number(odometer), updatedAt: new Date() } },
      );

    return NextResponse.json(
      {
        success: true,
        message: "Fuel log created successfully",
        data: { _id: result.insertedId, ...newFuelLog },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Fuel log ID required" },
        { status: 400 },
      );
    }

    const result = await db
      .collection("fuelLogs")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Fuel log not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Fuel log deleted successfully",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
