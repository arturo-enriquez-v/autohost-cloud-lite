export interface Container {
  id: string
  name: string
  image: string
  /** "running" | "exited" | "paused" | "restarting" | ... */
  state: string
  /** Human-readable status, e.g. "Up 2 hours" or "Exited (0) 5 minutes ago" */
  status: string
}
