export type NexBuildProject = {
  id: string
  title: string
  status: "planning" | "in_progress" | "completed" | "delayed"
  location?: string
  updatedAt?: string
}

export function createProject(input: NexBuildProject): NexBuildProject {
  return input
}
