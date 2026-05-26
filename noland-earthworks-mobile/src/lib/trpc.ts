import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../noland-earthworks/server/types";

export const trpc = createTRPCReact<AppRouter>();

// Production API base — update this to your live domain after publishing
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "https://nolandearthworks.com";
