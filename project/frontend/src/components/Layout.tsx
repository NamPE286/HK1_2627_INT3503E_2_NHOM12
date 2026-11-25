import { useQueryClient } from "@tanstack/react-query";
import { NavLink, Outlet, useNavigate } from "react-router";
import { signOut, useSession } from "../lib/auth-client";

export function Layout() {
  const { data } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const onSignOut = async () => {
    await signOut();
    queryClient.clear(); // không để dữ liệu workspace cũ lại trong cache
    navigate("/login");
  };

  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/documents" className="brand">
          Traffic<span>Lex</span>
        </NavLink>
        <nav>
          <NavLink to="/documents">Văn bản</NavLink>
          <NavLink to="/diagrams">Lược đồ</NavLink>
        </nav>
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
