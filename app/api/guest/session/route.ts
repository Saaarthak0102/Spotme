import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Guest sessions are created only after OTP verification." },
    { status: 403 }
  );
}
