export interface DockerContainer {
  id: string
  name: string
  image: string
  /** "running" | "exited" | "paused" | "restarting" | ... */
  state: string
  /** Human-readable status, e.g. "Up 2 hours" or "Exited (0) 5 minutes ago" */
  status: string
  /** CPU usage percentage, e.g. "0.12%" — only present for running containers */
  cpu?: string
  /** Memory usage/limit, e.g. "128MiB / 2GiB" — only present for running containers */
  mem?: string
  /** Memory usage percentage, e.g. "1.60%" — only present for running containers */
  memPerc?: string
}
