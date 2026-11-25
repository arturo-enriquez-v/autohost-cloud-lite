// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

import {
  fetchConnectorRuns,
  fetchConnectors,
  fetchCreateConnector,
  fetchDeleteConnector,
  fetchRunConnector,
  fetchTestConnector,
  fetchUpdateConnector,
} from "../fetch/connectors.client";
import type {
  Connector,
  ConnectorInput,
  ConnectorParamValues,
  ConnectorResult,
  ConnectorRun,
  ConnectorTestInput,
} from "../interfaces/connector";

async function errorMessage(res: Response, fallback: string) {
  const err = await res.json().catch(() => ({}));
  return (err as { error?: string }).error || fallback;
}

async function expect<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) throw new Error(await errorMessage(res, fallback));
  return res.json() as Promise<T>;
}

export const ConnectorsService = {
  async list(projectId?: string): Promise<Connector[]> {
    return (await expect<Connector[] | null>(await fetchConnectors(projectId), "Failed to load connectors")) ?? [];
  },

  async create(input: ConnectorInput): Promise<Connector> {
    return expect(await fetchCreateConnector(input), "Failed to create connector");
  },

  async update(id: string, input: ConnectorInput): Promise<Connector> {
    return expect(await fetchUpdateConnector(id, input), "Failed to update connector");
  },

  async remove(id: string): Promise<void> {
    const res = await fetchDeleteConnector(id);
    if (!res.ok) throw new Error(await errorMessage(res, "Failed to delete connector"));
  },

  async run(id: string, params: ConnectorParamValues = {}): Promise<ConnectorResult> {
    return expect(await fetchRunConnector(id, params), "Failed to run connector");
  },

  async test(input: ConnectorTestInput): Promise<ConnectorResult> {
    return expect(await fetchTestConnector(input), "Failed to test connector");
  },

  async runs(id: string): Promise<ConnectorRun[]> {
    return (await expect<ConnectorRun[] | null>(await fetchConnectorRuns(id), "Failed to load runs")) ?? [];
  },
};
