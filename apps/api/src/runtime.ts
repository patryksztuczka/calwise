import { ManagedRuntime } from "effect";
import { AppLayer } from "./layers.ts";

// Lazy: layers are built on first use, so importing this module
// does not open a database connection by itself.
export const runtime = ManagedRuntime.make(AppLayer);
