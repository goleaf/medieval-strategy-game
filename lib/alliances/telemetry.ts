export type AllianceTelemetryEventName =
  | "alliance.created"
  | "alliance.member_state_changed"
  | "alliance.rank_changed"
  | "alliance.announcement.sent"
  | "alliance.audit.logged";

export interface AllianceTelemetryEventPayload {
  name: AllianceTelemetryEventName;
  allianceId: string;
  actorId?: string;
  data: Record<string, unknown>;
  sampled?: boolean;
}

export interface TelemetryClient {
  send(event: AllianceTelemetryEventPayload): Promise<void>;
}

class ConsoleTelemetryClient implements TelemetryClient {
  async send(event: AllianceTelemetryEventPayload) {
    if (process.env.NODE_ENV === "test") return;
    console.log("[alliances-telemetry]", JSON.stringify(event));
  }
}

let client: TelemetryClient = new ConsoleTelemetryClient();

export function registerTelemetryClient(customClient: TelemetryClient) {
  client = customClient;
}

export async function emitAllianceEvent(event: AllianceTelemetryEventPayload) {
  if (!event.name) {
    throw new Error("Telemetry event name missing");
  }
  await client.send({ ...event, sampled: event.sampled ?? false });
}
