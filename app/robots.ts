import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/services", "/about", "/contact", "/faq"],
        disallow: ["/admin/", "/api/", "/book/", "/manage-booking/"],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
