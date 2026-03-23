/**
 * useQueryStore
 * Single source of truth for query/prompt history persisted in-memory per session.
 * On future iterations, this can be replaced with Supabase persistence.
 */

import { useState, useCallback, useRef } from "react";

export type DbType = "postgresql" | "mongodb";
export type AIActionType = "generate" | "explain" | "optimize" | "analyze" | "debug";

export interface QueryRecord {
  id: string;
  query: string;
  dbType: DbType;
  connectionName: string;
  schema: string;
  table: string;
  executedAt: string;
  durationMs: number;
  rowCount: number;
  status: "success" | "error";
  error?: string;
}

export interface PromptRecord {
  id: string;
  prompt: string;
  action: AIActionType;
  model: string;
  inputTokens: number;
  outputTokens: number;
  executedAt: string;
  durationMs: number;
  resultPreview: string;
  linkedQuery?: string;
  status: "success" | "error";
}

// Module-level stores so they survive re-renders and are shared across components
let _queryHistory: QueryRecord[] = [];
let _promptHistory: PromptRecord[] = [];
let _queryListeners: Array<() => void> = [];
let _promptListeners: Array<() => void> = [];

function notifyQueryListeners() {
  _queryListeners.forEach((fn) => fn());
}
function notifyPromptListeners() {
  _promptListeners.forEach((fn) => fn());
}

export function addQueryRecord(record: Omit<QueryRecord, "id">) {
  const entry: QueryRecord = { ...record, id: `qh-${Date.now()}-${Math.random().toString(36).slice(2)}` };
  _queryHistory = [entry, ..._queryHistory].slice(0, 500);
  notifyQueryListeners();
  return entry;
}

export function addPromptRecord(record: Omit<PromptRecord, "id">) {
  const entry: PromptRecord = { ...record, id: `ph-${Date.now()}-${Math.random().toString(36).slice(2)}` };
  _promptHistory = [entry, ..._promptHistory].slice(0, 500);
  notifyPromptListeners();
  return entry;
}

export function useQueryHistory() {
  const [, forceUpdate] = useState(0);
  const listenerRef = useRef<() => void>(() => forceUpdate((n) => n + 1));

  // Register listener on mount
  useState(() => {
    _queryListeners.push(listenerRef.current);
    return () => {
      _queryListeners = _queryListeners.filter((fn) => fn !== listenerRef.current);
    };
  });

  return _queryHistory;
}

export function usePromptHistory() {
  const [, forceUpdate] = useState(0);
  const listenerRef = useRef<() => void>(() => forceUpdate((n) => n + 1));

  useState(() => {
    _promptListeners.push(listenerRef.current);
    return () => {
      _promptListeners = _promptListeners.filter((fn) => fn !== listenerRef.current);
    };
  });

  return _promptHistory;
}
