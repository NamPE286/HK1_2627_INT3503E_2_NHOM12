import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useSession } from "../../lib/auth-client";

/** Chặn route khi chưa đăng nhập. Mỗi tài khoản = một workspace riêng. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { data, isPending } = useSession();
  const location = useLocation();
  if (isPending) return <div className="center muted">Đang tải phiên đăng nhập…</div>;
  if (!data) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
