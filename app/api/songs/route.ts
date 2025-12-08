import clientPromise from "@/lib/mongo/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function GET() {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB!);   


  const songs = await db
    .collection("songs")
    .find({})
    .toArray();

  return NextResponse.json(songs);
}
