import type { MetadataRoute } from "next";
import { SITE_URL, TOOLS } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: SITE_URL, lastModified, changeFrequency: "monthly", priority: 1 },
    ...TOOLS.map((tool) => ({
      url: `${SITE_URL}${tool.href}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
  ];
}
