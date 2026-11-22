'use client';

/**
 * فاز ۱۲٫۲۰-E — کنترلر واحد همگام‌سازی فهرست سفارش‌ها.
 *
 * ⚠️ `ProjectList` و `OrdersWorkspace` دیگر subscriber جداگانه ندارند؛
 *    هر دو از این هوک استفاده می‌کنند. Toast سراسریهمچنین توسط
 *    `BusinessToastBridge` صادر می‌شود و در اینجا تکرار نمی‌شود.
 */

import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type { Project } from '@/lib/projects/api';
import { usePollLeader } from '@/lib/connectivity/poll-leader';
import { useRealtimeEvent } from '@/components/system/RealtimeProvider';
import {
  applyProjectStatus,
  claimRealtimeEventId,
} from '@/lib/realtime/core.mjs';
import {
  isStaleProjectListSnapshot,
  projectListEventVersion,
} from '@/lib/projects/list-sync.mjs';

interface ProjectListSnapshot {
  resourceKey: string;
  projects: Project[];
  dataVersion: number;
}

interface Options {
  resourceKey: string;
  setProjects: Dispatch<SetStateAction<Project[]>>;
  onRefresh: () => void;
  enabled?: boolean;
}

export function useProjectListController({
  resourceKey,
  setProjects,
  onRefresh,
  enabled = true,
}: Options) {
  const { isLeader, publish, subscribe } = usePollLeader();
  const latestVersionRef = useRef(0);
  const seenRef = useRef<Set<string>>(new Set());
  const dirtyRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;

  const versionAtRequest = useCallback(() => latestVersionRef.current, []);
  const isStaleResponse = useCallback(
    (versionWhenRequested: number) => latestVersionRef.current > versionWhenRequested,
    [],
  );

  const acceptServerRows = useCallback(
    (rows: Project[]) => {
      setProjects(rows);
      if (isLeader && latestVersionRef.current > 0) {
        publish('project-list', {
          resourceKey,
          projects: rows,
          dataVersion: latestVersionRef.current,
        } satisfies ProjectListSnapshot);
      }
    },
    [isLeader, publish, resourceKey, setProjects],
  );

  useRealtimeEvent(['project.created', 'project.status_changed'], (event) => {
    if (!enabled) return;
    if (!claimRealtimeEventId(seenRef.current, event.id)) return;
    const version = projectListEventVersion(event);
    if (version > latestVersionRef.current) latestVersionRef.current = version;
    if (event.type === 'project.status_changed') {
      setProjects((previous) => applyProjectStatus(previous, event));
    }
    if (!isLeader) return;
    // یک resource-key تنها یک بار در هر موج رویداد‌ها بازخوانی می‌شود.
    if (dirtyRef.current.has(resourceKey)) return;
    dirtyRef.current.add(resourceKey);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      dirtyRef.current.delete(resourceKey);
      refreshRef.current();
    }, 300);
  });

  /** تب‌های پیرو فهرست را بدون HTTP از رهبر می‌گیرند. */
  useEffect(() => {
    if (!enabled || !isLeader) return undefined;
    return subscribe((message) => {
      if (message.channel !== 'project-list' || isLeader) return;
      const snapshot = message.payload as ProjectListSnapshot | null;
      if (!snapshot || snapshot.resourceKey !== resourceKey || !Array.isArray(snapshot.projects)) return;
      const version = Number(snapshot.dataVersion ?? 0);
      if (isStaleProjectListSnapshot(version, latestVersionRef.current)) return;
      if (Number.isFinite(version) && version > latestVersionRef.current) {
        latestVersionRef.current = version;
      }
      setProjects(snapshot.projects);
    });
  }, [enabled, isLeader, resourceKey, setProjects, subscribe]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { versionAtRequest, isStaleResponse, acceptServerRows };
}
