import { ClientOnly } from "@tanstack/react-router";

import App from "./App";

// The app reads localStorage in a useState initializer, so it must only
// render after hydration to avoid SSR/client mismatches.
export function InternSAApp() {
  return (
    <ClientOnly fallback={null}>
      <App />
    </ClientOnly>
  );
}
