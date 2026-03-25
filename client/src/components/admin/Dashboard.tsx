import { useState, useEffect } from "react";
import { fetchAdminStats } from "../../hooks/useApi";
import type { AdminStats } from "../../hooks/useApi";
import { StatCard } from "./StatCard";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface DashboardProps {
  refreshKey: number;
}

export function Dashboard({ refreshKey }: DashboardProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchAdminStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "取得に失敗しました");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (loading) {
    return (
      <div data-testid="dashboard-loading" className="text-sm text-gray-500">
        読み込み中...
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="dashboard-error" className="text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div data-testid="dashboard">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">ダッシュボード</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="プロンプト" value={stats.promptCount} />
        <StatCard label="バンドル" value={stats.bundleCount} />
        <StatCard label="画像" value={stats.imageCount} />
        <StatCard
          label="ストレージ"
          value={formatBytes(stats.storageBytes.total)}
          sub={`画像 ${formatBytes(stats.storageBytes.images)} / DB ${formatBytes(stats.storageBytes.database)}`}
        />
      </div>
      {stats.lastUpdatedAt && (
        <p className="text-xs text-gray-400 mt-2">
          最終更新: {formatDate(stats.lastUpdatedAt)}
        </p>
      )}
    </div>
  );
}
