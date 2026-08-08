'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { fetchCloudData, pushCloudData, CloudSnapshot } from './api';

export type SyncStatus = 'disabled' | 'syncing' | 'synced' | 'error' | 'conflict';

export interface SyncConflict {
  local: CloudSnapshot;
  remote: CloudSnapshot;
}

interface UseSyncEngineArgs extends CloudSnapshot {
  ready: boolean;
  applySnapshot: (snapshot: CloudSnapshot) => void;
}

function snapshotHasData(s: CloudSnapshot): boolean {
  return (
    s.counters.length > 0 ||
    s.trainings.length > 0 ||
    s.equipment.length > 0 ||
    s.logs.length > 0
  );
}

function snapshotsRoughlyEqual(a: CloudSnapshot, b: CloudSnapshot): boolean {
  const norm = (s: CloudSnapshot) =>
    JSON.stringify({
      counters: [...s.counters].sort((x, y) => x.id.localeCompare(y.id)),
      trainings: [...s.trainings].sort((x, y) => x.id.localeCompare(y.id)),
      equipment: [...s.equipment].sort((x, y) => x.id.localeCompare(y.id)),
    });
  return norm(a) === norm(b);
}

export function useSyncEngine({
  ready,
  applySnapshot,
  ...snapshot
}: UseSyncEngineArgs) {
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState<SyncStatus>('disabled');
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<SyncConflict | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const initialSyncDoneRef = useRef(false);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const runInitialSync = useCallback(async () => {
    setStatus('syncing');
    setError(null);
    try {
      const remote = await fetchCloudData();
      const local = snapshotRef.current;
      const remoteHasData = snapshotHasData(remote);
      const localHasData = snapshotHasData(local);

      if (!remoteHasData) {
        if (localHasData) await pushCloudData(local);
        setStatus('synced');
        setLastSyncedAt(Date.now());
      } else if (!localHasData) {
        applySnapshot(remote);
        setStatus('synced');
        setLastSyncedAt(Date.now());
      } else if (snapshotsRoughlyEqual(local, remote)) {
        setStatus('synced');
        setLastSyncedAt(Date.now());
      } else {
        setConflict({ local, remote });
        setStatus('conflict');
        // Don't mark initial sync done yet — wait for the user's choice.
        return;
      }
      initialSyncDoneRef.current = true;
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Sync failed.');
      // Allow background pushes to proceed even if the initial pull failed,
      // so the user's local work still attempts to save.
      initialSyncDoneRef.current = true;
    }
  }, [applySnapshot]);

  // Kick off (or reset) sync when auth state changes.
  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) {
      initialSyncDoneRef.current = false;
      setStatus('disabled');
      setConflict(null);
      setLastSyncedAt(null);
      return;
    }
    if (!initialSyncDoneRef.current) {
      runInitialSync();
    }
  }, [ready, isAuthenticated, runInitialSync]);

  const resolveConflict = useCallback(
    async (choice: 'local' | 'remote') => {
      if (!conflict) return;
      setStatus('syncing');
      try {
        if (choice === 'remote') {
          applySnapshot(conflict.remote);
        } else {
          await pushCloudData(conflict.local);
        }
        setConflict(null);
        initialSyncDoneRef.current = true;
        setStatus('synced');
        setLastSyncedAt(Date.now());
      } catch (e) {
        setStatus('error');
        setError(e instanceof Error ? e.message : 'Sync failed.');
      }
    },
    [conflict, applySnapshot],
  );

  // Debounced background push whenever local data changes after initial sync.
  useEffect(() => {
    if (!ready || !isAuthenticated || !initialSyncDoneRef.current || conflict) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(async () => {
      setStatus('syncing');
      try {
        await pushCloudData(snapshotRef.current);
        setStatus('synced');
        setLastSyncedAt(Date.now());
        setError(null);
      } catch (e) {
        setStatus('error');
        setError(e instanceof Error ? e.message : 'Sync failed.');
      }
    }, 1500);
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ready,
    isAuthenticated,
    conflict,
    snapshot.counters,
    snapshot.settings,
    snapshot.logs,
    snapshot.trainings,
    snapshot.equipment,
  ]);

  return { status, error, conflict, resolveConflict, lastSyncedAt };
}
