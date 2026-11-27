// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

/**
 * Docker reports 0 B of memory for every container when the host kernel has no memory cgroup controller
 * (common on Raspberry Pi OS until `cgroup_enable=memory cgroup_memory=1` is set). A container that
 * runs never uses 0 bytes, so a zero is "not measured", not a value.
 */
export function memoryNotMeasured(mem?: string): boolean {
  if (!mem) return false
  return /^\s*0(\.0+)?\s*([KMGT]i?)?B\s*(\/|$)/i.test(mem)
}

export const MEMORY_NOT_MEASURED_HINT =
  "This host does not measure memory per container (the kernel's memory cgroup is disabled). " +
  "On a Raspberry Pi, add cgroup_enable=memory cgroup_memory=1 to cmdline.txt and reboot."
