// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

import type { ContainerPort, DockerContainer } from "@/lib/features/nodes/types";

// Older agents send no `ports` and append them to the status instead: "Up 2 hours [8080:80/tcp, 53:53/udp]".
const STATUS_PORTS = /\s*\[((?:\d+:\d+\/[a-z]+(?:,\s*)?)+)\]\s*$/;

/** Ports the container publishes on the host. */
export function containerPorts(c: DockerContainer): ContainerPort[] {
  if (c.ports?.length) return c.ports;

  // TODO: remove the status fallback once every agent sends `ports`.
  const match = c.status?.match(STATUS_PORTS);
  if (!match) return [];
  return match[1].split(",").flatMap((entry) => {
    const m = entry.trim().match(/^(\d+):(\d+)\/([a-z]+)$/);
    return m ? [{ public: Number(m[1]), private: Number(m[2]), protocol: m[3] }] : [];
  });
}

/** The status text without the port list older agents append to it. */
export function statusWithoutPorts(status: string): string {
  return status.replace(STATUS_PORTS, "");
}

/** The first published host port, preferring TCP (the one a web UI or tunnel would use). */
export function firstPublicPort(c: DockerContainer): number | undefined {
  const ports = containerPorts(c);
  const port = ports.find((p) => p.protocol === "tcp") ?? ports[0];
  return port && port.public > 0 && port.public <= 65535 ? port.public : undefined;
}
