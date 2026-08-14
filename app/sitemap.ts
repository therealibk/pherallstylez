import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: appUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${appUrl}/services`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${appUrl}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${appUrl}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${appUrl}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${appUrl}/cancellation-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${appUrl}/privacy-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${appUrl}/refund-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${appUrl}/terms-and-conditions`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${appUrl}/appointment-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${appUrl}/booking-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  let serviceRoutes: MetadataRoute.Sitemap = [];
  try {
    const services = await db.service.findMany({
      where: { active: true },
      select: { slug: true, updatedAt: true },
    });
    serviceRoutes = services.map((s) => ({
      url: `${appUrl}/services/${s.slug}`,
      lastModified: s.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
  } catch {
    // DB unavailable during build — skip dynamic routes
  }

  return [...staticRoutes, ...serviceRoutes];
}
