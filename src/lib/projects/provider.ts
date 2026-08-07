import { getDataProvider } from "@/lib/data-provider";
import { LocalProjectRepository, SupabaseProjectRepository, type ProjectRepository } from "./repository";
export function createProjectRepository(kind = getDataProvider()): ProjectRepository { return kind === "supabase" ? new SupabaseProjectRepository() : new LocalProjectRepository(); }
let demo: LocalProjectRepository | undefined;
export function getProjectDemoRepository() { demo ??= new LocalProjectRepository(); return demo; }
export function resetProjectDemoRepository() { demo = new LocalProjectRepository(); return demo; }
