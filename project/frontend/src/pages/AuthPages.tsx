import { type FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { signIn, signUp, useSession } from "../lib/auth-client";

function AuthCard({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { refetch } = useSession();
  const isRegister = mode === "register";

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("password"));
    setBusy(true);
    setError(null);
    const { error } = isRegister
      ? await signUp.email({ email, password, name: String(f.get("name")) })
      : await signIn.email({ email, password });
    setBusy(false);
    if (error) {
      setError(
        error.status === 401 ? "Email hoặc mật khẩu không đúng."
        : error.status === 429 ? "Thử quá nhiều lần, vui lòng đợi một phút."
        : (error.message ?? "Không thể xử lý yêu cầu."),
      );
      return;
    }
    await refetch(); // cập nhật phiên trước khi vào route được bảo vệ (tránh RequireAuth đọc phiên cũ = null)
    navigate((location.state as { from?: string } | null)?.from ?? "/documents", { replace: true });
  };

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={onSubmit}>
        <div className="brand big">
          Traffic<span>Lex</span>
        </div>
        <p className="muted">
          {isRegister ? "Tạo tài khoản — bạn sẽ có một workspace riêng cho văn bản và lược đồ." : "Đăng nhập vào workspace của bạn."}
        </p>
        {isRegister && (
          <label>
            Tên hiển thị
            <input name="name" required maxLength={80} autoComplete="name" />
          </label>
        )}
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Mật khẩu
          <input name="password" type="password" required minLength={8} maxLength={128}
                 autoComplete={isRegister ? "new-password" : "current-password"} />
        </label>
        {error && <div className="alert" role="alert">{error}</div>}
        <button className="btn primary" disabled={busy}>
          {busy ? "Đang xử lý…" : isRegister ? "Đăng ký" : "Đăng nhập"}
        </button>
        <p className="muted small">
          {isRegister ? <>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></>
                      : <>Chưa có tài khoản? <Link to="/register">Đăng ký</Link></>}
        </p>
      </form>
    </div>
  );
}

export const LoginPage = () => <AuthCard mode="login" />;
export const RegisterPage = () => <AuthCard mode="register" />;
