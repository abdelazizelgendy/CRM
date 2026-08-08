import { getDataProvider } from "@/lib/data-provider";
import { LocalInventoryRepository, SupabaseInventoryRepository, type InventoryRepository } from "./repository";
export function createInventoryRepository(kind = getDataProvider()): InventoryRepository { return kind === "supabase" ? new SupabaseInventoryRepository() : new LocalInventoryRepository(); }
let demo: LocalInventoryRepository | undefined;
export function getInventoryDemoRepository() { demo ??= new LocalInventoryRepository(); return demo; }
export function resetInventoryDemoRepository() { demo = new LocalInventoryRepository(); return demo; }
