import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cuisine pas à pas",
    short_name: "Cuisine",
    description:
      "Vos recettes, avec les ingrédients, les quantités et les étapes au même endroit.",
    lang: "fr",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f5f0",
    theme_color: "#1e6b47",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
