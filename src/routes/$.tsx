import { createFileRoute } from "@tanstack/react-router";

import { InternSAApp } from "@/internsa/InternSAApp";

// Catch-all: the InternSA app handles its own client-side paths
// (/explore, /saved, /guides, /profile, /opportunities/:id, /admin/*, ...).
export const Route = createFileRoute("/$")({
  head: ({ params }) => {
    const page = (params._splat || "workspace")
      .split("/")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" · ");
    const title = `${page} — InternSA`;
    const description = `InternSA ${page.toLowerCase()} workspace for South African student opportunities and career resources.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: InternSAApp,
});
