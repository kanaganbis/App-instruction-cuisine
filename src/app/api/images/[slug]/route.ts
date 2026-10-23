import { readFile } from "node:fs/promises";

import { getRecipeImage } from "@/lib/recipes/repository";

/** Serves the photo a recipe points to (`image:` in its front matter). */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/images/[slug]">,
) {
  const { slug } = await params;
  const image = await getRecipeImage(slug);
  if (!image) return new Response("Image introuvable", { status: 404 });
  const body = await readFile(image.file);
  return new Response(body, {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "private, max-age=60",
    },
  });
}
