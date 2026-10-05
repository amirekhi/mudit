import { authFetch } from "@/lib/TanStackQuery/authQueries/authFetch";
import type { Track } from "@/store/useAudioStore";
import type { SerializedProject } from "./projectTypes";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface ProjectSummary {
  _id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
  slateCount: number;
}

export interface LoadedProject {
  project: {
    _id: string;
    name: string;
    rev: number;
    data: SerializedProject;
    createdAt: string;
    updatedAt: string;
  };
  tracks: Track[];
  missingTrackIds: string[];
}

async function parse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data?.message || data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const projectApi = {
  list: async () => parse<ProjectSummary[]>(await authFetch("/api/projects")),

  create: async (input: { name: string; data: SerializedProject }) =>
    parse<{ _id: string; name: string; rev: number; updatedAt: string }>(
      await authFetch("/api/projects", jsonInit("POST", input))
    ),

  get: async (id: string) => parse<LoadedProject>(await authFetch(`/api/projects/${id}`)),

  update: async (id: string, input: { name: string; data: SerializedProject; baseRev: number }) =>
    parse<{ rev: number; updatedAt: string }>(
      await authFetch(`/api/projects/${id}`, jsonInit("PUT", input))
    ),

  remove: async (id: string) =>
    parse<{ message: string }>(await authFetch(`/api/projects/${id}`, { method: "DELETE" })),
};
