import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { secret, paths } = await request.json();

    if (secret !== process.env.REVALIDATE_SECRET) {
      return NextResponse.json(
        { error: "Invalid secret" },
        { status: 401 }
      );
    }

    if (!Array.isArray(paths)) {
      return NextResponse.json(
        { error: "paths must be array" },
        { status: 400 }
      );
    }

    paths.forEach((path) => revalidatePath(path));

    return NextResponse.json({
      success: true,
      paths,
      time: Date.now(),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Revalidation failed" },
      { status: 500 }
    );
  }
}
