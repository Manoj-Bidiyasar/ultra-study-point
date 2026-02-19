import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { secret, paths, tags } = await request.json();
    const expectedSecret = process.env.REVALIDATE_SECRET;

    if (!expectedSecret || secret !== expectedSecret) {
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

    paths.forEach((path) => revalidatePath(path, "page"));

    if (Array.isArray(tags)) {
      tags
        .filter((tag) => typeof tag === "string" && tag.trim())
        .forEach((tag) => revalidateTag(tag.trim()));
    }

    return NextResponse.json({
      success: true,
      paths,
      tags: Array.isArray(tags) ? tags : [],
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
