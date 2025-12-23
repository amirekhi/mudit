import { NextRequest, NextResponse } from "next/server";


export async function POST(req: NextRequest) {
    const response  = NextResponse.json({messege : "logged out successfylly"})
    response.cookies.set({
    name: "token",
    value : "",
    httpOnly: true,
    path : "/",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}