// F-008 barrel: composes all foerdermittel sub-routers into a single
// Hono app so the mount point in worker/src/index.ts stays unchanged.
import { Hono } from "hono";
import type { Bindings, Variables } from "../../types";
import { favoriten } from "./favoriten";
import { katalog } from "./katalog";
import { match } from "./match";
import { chat } from "./chat";
import { cases } from "./cases";
import { notifications } from "./notifications";

export const foerdermittel = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .route("/", favoriten)
  .route("/", katalog)
  .route("/", match)
  .route("/", chat)
  .route("/", cases)
  .route("/", notifications);
