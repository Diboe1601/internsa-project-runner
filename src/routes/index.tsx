import { createFileRoute } from "@tanstack/react-router";

import { InternSAApp } from "@/internsa/InternSAApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InternSA — Your Next Step" },
      {
        name: "description",
        content:
          "InternSA helps South African students find internships, bursaries, learnerships and graduate programmes across all nine provinces.",
      },
      { property: "og:title", content: "InternSA — Your Next Step" },
      {
        property: "og:description",
        content:
          "Find internships, bursaries, learnerships and graduate programmes across South Africa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <InternSAApp />;
}
