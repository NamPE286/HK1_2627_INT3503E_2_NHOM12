import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router";
import { lastWorkspace, rememberWorkspace, useWorkspaces } from "../features/workspaces/current";
import { signOut, useSession } from "../lib/auth-client";

export function Layout() {
  const { data } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = useParams();
  const workspaces = useWorkspaces();
  const currentId = params.workspaceId ?? lastWorkspace() ?? undefined;
  useEffect(() => {
    if (params.workspaceId) rememberWorkspace(params.workspaceId);
  }, [params.workspaceId]);

  const onSignOut = async () => {
    await signOut();
    queryClient.clear(); // không để dữ liệu workspace cũ lại trong cache
    navigate("/login");
  };

  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          Lex<span>Impact</span>
        </NavLink>
        {workspaces.data && (
          <select
            className="ws-select"
            aria-label="Chọn workspace"
            value={currentId ?? ""}
            onChange={(e) => navigate(`/w/${e.target.value}`)}
          >
            {workspaces.data.data.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
                {w.my_role === "VIEWER" ? ` (chỉ xem · ${w.owner.display_name})` : ""}
              </option>
            ))}
          </select>
        )}
        {currentId && (
          <nav>
            <NavLink to={`/w/${currentId}`} end>Văn bản</NavLink>
            <NavLink to={`/w/${currentId}/members`}>Chia sẻ</NavLink>
            <NavLink to={`/w/${currentId}/diagrams`}>Lược đồ</NavLink>
          </nav>
        )}
        <div className="user">
          <span title={data?.user.email}>{data?.user.name}</span>
          <button type="button" className="btn ghost" onClick={onSignOut}>
            Đăng xuất
          </button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
