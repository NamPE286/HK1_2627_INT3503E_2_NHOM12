/** Better Auth client — đăng ký / đăng nhập / phiên (cookie httpOnly, cùng origin qua proxy). */
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({ baseURL: window.location.origin });
export const { useSession, signIn, signUp, signOut } = authClient;
