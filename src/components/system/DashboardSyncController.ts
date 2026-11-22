'use client';

/**
 * فاز ۱۲٫۲۰-F — کنترلر بخشبندیشده داشبورد.
 *
 * ⚠️ endpoint کامل بدون تغییر برای بار نخست باقی می‌ماند؛ رویداد‌ها تنها بخش آلوده
 *    را از endpoint جداسازیشده می‌خوانند. فقط Leader شبکه مصرف می‌کند.
 */

import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { usePollLeader } from '@/lib/connectivity/poll-leader';
import { useRealtimeEvent } from '@/components/system/RealtimeProvider';
import {
  dashboardDataVersion,
  dashboardSectionsForEvent,
  isStaleDashboardSnapshot,
} from '@/lib/dashboard/sync.mjs';

interface SectionResult {
  data: unknown;
  dataVersion: number;
}

interface Snapshot {
  role: 'customer' | 'admin';
  section: string;
  data: unknown;
  dataVersion: number;
}

interface Options<TView> {
  role: 'customer' | 'admin';
  enabled?: boolean;
  view: TView;
  setView: Dispatch<SetStateAction<TView>>;
  fetchSection: (section: string) => Promise<SectionResult>;
  mergeSection: (view: TView, section: string, data: unknown) => TView;
}

export function useDashboardSyncController<TView>({
  role,
  enabled = true,
  view,
  setView,
  fetchSection,
  mergeSection,
}: Options<TView>) {
  const { isLeader, publish, subscribe } = usePollLeader();
  const latestVersionRef = useRef(0);
  const dirtyRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionSeqRef = useRef<Record<string, number>>({});
  const fetchRef = useRef(fetchSection);
  const mergeRef = useRef(mergeSection);
  const viewRef = useRef(view);
  fetchRef.current = fetchSection;
  mergeRef.current = mergeSection;
  viewRef.current = view;

  const versionAtRequest = useCallback(() => latestVersionRef.current, []);
  const isStaleResponse = useCallback(
    (versionWhenRequested: number) => latestVersionRef.current > versionWhenRequested,
    [],
  );

  const applySection = useCallback((section: string, result: SectionResult, fromLeader = false) => {
    const version = Number(result.dataVersion ?? 0);
    if (isStaleDashboardSnapshot(version, latestVersionRef.current)) return;
    if (Number.isFinite(version) && version > latestVersionRef.current) {
      latestVersionRef.current = version;
    }
    setView((previous) => mergeRef.current(previous, section, result.data));
    if (fromLeader && isLeader && latestVersionRef.current > 0) {
      publish('dashboard', { role, section, data: result.data, dataVersion: latestVersionRef.current } satisfies Snapshot);
    }
  }, [isLeader, publish, role, setView]);

  const flush = useCallback(async () => {
    const sections = [...dirtyRef.current];
    dirtyRef.current.clear();
    await Promise.all(sections.map(async (section) => {
      const requestId = (sectionSeqRef.current[section] ?? 0) + 1;
      sectionSeqRef.current[section] = requestId;
      try {
        const result = await fetchRef.current(section);
        if (requestId !== sectionSeqRef.current[section]) return;
        applySection(section, result, true);
      } catch {
        /* next event, visibility or reconnect retries the section */
      }
    }));
  }, [applySection]);

  useRealtimeEvent(
    ['project.created', 'project.status_changed', 'finance.updated', 'delivery.updated',
      'activity.created', 'chat.message.created', 'chat.message.read'],
    (event) => {
      if (!enabled) return;
      const sections = dashboardSectionsForEvent(event, role);
      if (sections.length === 0) return;
      const version = dashboardDataVersion(event);
      if (Number.isFinite(version) && version > latestVersionRef.current) {
        latestVersionRef.current = version;
      }
      if (!isLeader) return;
      for (const section of sections) dirtyRef.current.add(section);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void flush();
      }, 300);
    },
  );

  useEffect(() => {
    if (!enabled || isLeader) return undefined;
    return subscribe((message) => {
      if (message.channel !== 'dashboard') return;
      const snapshot = message.payload as Snapshot | null;
      if (!snapshot || snapshot.role !== role || typeof snapshot.section !== 'string') return;
      applySection(snapshot.section, {
        data: snapshot.data,
        dataVersion: snapshot.dataVersion,
      });
    });
  }, [applySection, enabled, isLeader, role, subscribe]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { versionAtRequest, isStaleResponse, applySection };
}
