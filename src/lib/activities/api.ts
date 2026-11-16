/**
 * Typed client for the phase 9.5 project-activity API.
 *
 * All calls go through the authenticated request bound to the current
 * session. Every response is treated as untrusted: arrays are checked
 * before they reach a component, and ids are always URL-encoded.
 */

export type ActorKind = 'system' | 'customer' | 'admin' | 'typist';
export type ActivityKind = 'note' | 'dispute' | 'dispute_reply';

export interface ActivityItem {
  id: string;
  projectId: string;
  actorKind: ActorKind;
  actorUserId: string | null;
  eventType: string;
  title: string;
  body: string | null;
  seq: number;
  statusFrom: string | null;
  statusTo: string | null;
  amount: number | null;
  metadata: Record<string, unknown>;
  replyToActivityId: string | null;
  correlationId: string | null;
  createdAt: string;
  seenAt: string | null;
  code: string | null;
  name: string | null;
}

export interface UnseenGroup {
  projectId: string;
  code: string | null;
  name: string | null;
  unseenCount: number;
  latestAt: string | null;
  items: ActivityItem[];
}

export interface ActivityProjectSummary {
  id: string;
  code: string;
  name: string;
  status: string;
}

export interface ActivityPage {
  activities: ActivityItem[];
  hasMore: boolean;
  unseenTotal: number;
  project: ActivityProjectSummary;
  serverTime: string;
}

export interface CreateActivityBody {
  text: string;
  kind: ActivityKind;
  replyToActivityId?: string;
  fileIds?: string[];
  linkIds?: string[];
  clientNonce?: string;
}

export interface CreateActivityResult {
  activity: ActivityItem | null;
  activityId: string;
  serverTime: string;
}

export type AuthedRequest = <T>(
  path: string,
  options?: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown },
) => Promise<T>;

function pathFor(projectId: string): string {
  return `/projects/${encodeURIComponent(projectId)}/activities`;
}

export interface ActivitiesApi {
  list(projectId: string, limit?: number, offset?: number): Promise<ActivityPage>;
  unseen(): Promise<{ groups: UnseenGroup[]; total: number; items: ActivityItem[] }>;
  markSeen(activityIds: string[], projectId?: string): Promise<number>;
  markAllSeen(projectId?: string): Promise<number>;
  create(projectId: string, body: CreateActivityBody): Promise<CreateActivityResult>;
}

export function createActivitiesApi(request: AuthedRequest): ActivitiesApi {
  return {
    async list(projectId, limit = 20, offset = 0) {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });
      const data = await request<ActivityPage>(`${pathFor(projectId)}?${params.toString()}`);
      return {
        activities: Array.isArray(data.activities) ? data.activities : [],
        hasMore: Boolean(data.hasMore),
        unseenTotal: Number(data.unseenTotal ?? 0) || 0,
        project: data.project,
        serverTime: data.serverTime,
      };
    },

    async unseen() {
      const data = await request<{
        groups: UnseenGroup[];
        total: number;
        items: ActivityItem[];
      }>('/activities/unseen');
      return {
        groups: Array.isArray(data.groups) ? data.groups : [],
        total: Number(data.total ?? 0) || 0,
        items: Array.isArray(data.items) ? data.items : [],
      };
    },

    async markSeen(activityIds, projectId) {
      const body: Record<string, unknown> = { activityIds };
      if (projectId) body.projectId = projectId;
      const data = await request<{ marked: number }>('/activities/seen', {
        method: 'POST',
        body,
      });
      return Number(data.marked ?? 0) || 0;
    },

    async markAllSeen(projectId) {
      const body: Record<string, unknown> = { all: true };
      if (projectId) body.projectId = projectId;
      const data = await request<{ marked: number }>('/activities/seen', {
        method: 'POST',
        body,
      });
      return Number(data.marked ?? 0) || 0;
    },

    async create(projectId, body) {
      const data = await request<CreateActivityResult>(pathFor(projectId), {
        method: 'POST',
        body,
      });
      return {
        activity: data.activity ?? null,
        activityId: data.activityId,
        serverTime: data.serverTime,
      };
    },
  };
}

export type { ActivityItem as ProjectActivity };
