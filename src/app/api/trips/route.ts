import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "~/server/mongodb/client";

export async function GET() {
  try {
    const db = await getDb();

    const trips = await db
      .collection("trips")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Enrich with vehicle and driver names
    const vehicleIds = [
      ...new Set(
        trips
          .map((t) => String(t.vehicleId ?? ""))
          .filter((id) => id.length > 0),
      ),
    ];
    const driverIds = [
      ...new Set(
        trips
          .map((t) => String(t.driverId ?? ""))
          .filter((id) => id.length > 0),
      ),
    ];

    const [vehicleDocs, driverDocs] = await Promise.all([
      vehicleIds.length > 0
        ? db
            .collection("vehicles")
            .find({ _id: { $in: vehicleIds.map((id) => new ObjectId(id)) } })
            .toArray()
        : Promise.resolve([]),
      driverIds.length > 0
        ? db
            .collection("drivers")
            .find({ _id: { $in: driverIds.map((id) => new ObjectId(id)) } })
            .toArray()
        : Promise.resolve([]),
    ]);

    const vehicleMap = new Map(
      vehicleDocs.map((v) => [
        v._id.toString(),
        {
          name: String(v.name ?? v.licensePlate ?? "Unknown"),
          maxCapacity: Number(v.maxCapacity ?? 0),
        },
      ]),
    );
    const driverMap = new Map(
      driverDocs.map((d) => [d._id.toString(), String(d.name ?? "Unknown")]),
    );

    const enrichedTrips = trips.map((t) => {
      const vId = String(t.vehicleId ?? "");
      const dId = String(t.driverId ?? "");
      const vehicle = vehicleMap.get(vId);
      return {
        _id: t._id.toString(),
        vehicleId: vId,
        driverId: dId,
        vehicleName: vehicle?.name ?? "Unknown",
        driverName: driverMap.get(dId) ?? "Unknown",
        cargoWeight: Number(t.cargoWeight ?? 0),
        maxCapacity: vehicle?.maxCapacity ?? 0,
        origin: String(t.origin ?? ""),
        destination: String(t.destination ?? ""),
        estimatedFuelCost: Number(t.estimatedFuelCost ?? 0),
        status: String(t.status ?? "Draft"),
        createdAt: t.createdAt as Date,
        updatedAt: t.updatedAt as Date,
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedTrips,
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
    const driverId = body.driverId as string | undefined;
    const cargoWeight = body.cargoWeight as number | undefined;
    const origin = body.origin as string | undefined;
    const destination = body.destination as string | undefined;
    const estimatedFuelCost = body.estimatedFuelCost as number | undefined;
    const distance = body.distance as number | null | undefined;

    if (
      !vehicleId ||
      !driverId ||
      !cargoWeight ||
      !origin ||
      !destination ||
      !estimatedFuelCost
    ) {
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 },
      );
    }

    const vehicleObjectId = new ObjectId(vehicleId);
    const driverObjectId = new ObjectId(driverId);

    const [vehicle, driver] = await Promise.all([
      db.collection("vehicles").findOne({ _id: vehicleObjectId }),
      db.collection("drivers").findOne({ _id: driverObjectId }),
    ]);

    if (!vehicle) {
      return NextResponse.json(
        { success: false, message: "Vehicle not found" },
        { status: 404 },
      );
    }

    if (!driver) {
      return NextResponse.json(
        { success: false, message: "Driver not found" },
        { status: 404 },
      );
    }

    // Check vehicle availability (support both casing conventions)
    const vStatus = String(vehicle.status ?? "");
    if (vStatus !== "available" && vStatus !== "Available") {
      return NextResponse.json(
        { success: false, message: "Vehicle is not available" },
        { status: 400 },
      );
    }

    // Check driver availability
    const dStatus = String(driver.status ?? "");
    if (dStatus !== "On Duty" && dStatus !== "on_duty") {
      return NextResponse.json(
        { success: false, message: "Driver is not available" },
        { status: 400 },
      );
    }

    // Validate cargo weight against vehicle capacity
    const maxCapacity = Number(vehicle.maxCapacity ?? 0);
    if (maxCapacity > 0 && Number(cargoWeight) > maxCapacity) {
      return NextResponse.json(
        {
          success: false,
          message: `Cargo weight (${cargoWeight}kg) exceeds vehicle max capacity (${maxCapacity}kg)`,
        },
        { status: 400 },
      );
    }

    const newTrip = {
      vehicleId: vehicleObjectId,
      driverId: driverObjectId,
      cargoWeight: Number(cargoWeight),
      origin,
      destination,
      estimatedFuelCost: Number(estimatedFuelCost),
      distance: distance != null ? Number(distance) : null,
      status: "Dispatched",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("trips").insertOne(newTrip);

    // Update vehicle and driver status
    await Promise.all([
      db
        .collection("vehicles")
        .updateOne(
          { _id: vehicleObjectId },
          { $set: { status: "on_trip", updatedAt: new Date() } },
        ),
      db
        .collection("drivers")
        .updateOne(
          { _id: driverObjectId },
          { $set: { status: "On Trip", updatedAt: new Date() } },
        ),
    ]);

    return NextResponse.json(
      {
        success: true,
        message: "Trip created successfully",
        data: { _id: result.insertedId, ...newTrip },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = await getDb();
    const body = (await req.json()) as Record<string, unknown>;

    const id = body.id as string | undefined;
    const status = body.status as string | undefined;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, message: "Trip ID and status required" },
        { status: 400 },
      );
    }

    const tripObjectId = new ObjectId(id);

    const trip = await db.collection("trips").findOne({ _id: tripObjectId });

    if (!trip) {
      return NextResponse.json(
        { success: false, message: "Trip not found" },
        { status: 404 },
      );
    }

    await db.collection("trips").updateOne(
      { _id: tripObjectId },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      },
    );

    // Release vehicle and driver when trip ends
    if (status === "Completed" || status === "Cancelled") {
      await Promise.all([
        db
          .collection("vehicles")
          .updateOne(
            { _id: trip.vehicleId as ObjectId },
            { $set: { status: "available", updatedAt: new Date() } },
          ),
        db
          .collection("drivers")
          .updateOne(
            { _id: trip.driverId as ObjectId },
            { $set: { status: "On Duty", updatedAt: new Date() } },
          ),
      ]);
    }

    return NextResponse.json({
      success: true,
      message: "Trip updated successfully",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
