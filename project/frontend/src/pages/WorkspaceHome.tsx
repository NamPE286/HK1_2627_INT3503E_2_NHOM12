import { Navigate } from "react-router";
import { lastWorkspace, useWorkspaces } from "../features/workspaces/current";

/** "/" → workspace gần nhất, hoặc workspace của tôi. */
export function WorkspaceHome() {
  const { data, isPending, error } = useWorkspaces();
  if (isPending) return <p className="muted">Đang tải workspace…</p>;
  if (error) return <div className="alert">{error.message}</div>;
  const last = lastWorkspace();
  const target = data.data.find((w) => w.id === last) ?? data.data.find((w) => w.my_role === "OWNER") ?? data.data[0];
  if (!target) return <p className="muted">Bạn chưa có workspace nào.</p>;
  return <Navigate to={`/w/${target.id}`} replace />;
}
