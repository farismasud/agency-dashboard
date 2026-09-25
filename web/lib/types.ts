export interface RoadmapModule {
  title: string;
  progress: number;
}

export interface RoadmapData {
  modules: RoadmapModule[];
}

export interface AgentState {
  subagent_type: string;
  display_name: string;
  status: "working" | "idle";
  last_action: string;
  last_event_at: string;
}

export interface FeedEvent {
  subagent_type: string;
  event_type: string;
  tool_name: string;
  summary: string;
  timestamp: string;
}

export interface RoomState {
  project: string;
  agents: Record<string, AgentState>;
  feed: FeedEvent[];
  roadmap: RoadmapData | null;
}
