import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "../components/Layout";
import { RequireAuth } from "../features/auth/RequireAuth";
import { LoginPage, RegisterPage } from "../pages/AuthPages";
import { DiagramsPage } from "../pages/DiagramsPage";
import { DocumentDetailPage } from "../pages/DocumentDetailPage";
import { DocumentsPage } from "../pages/DocumentsPage";
import { EditorPage } from "../pages/EditorPage";
import { MembersPage } from "../pages/MembersPage";
import { WorkspaceHome } from "../pages/WorkspaceHome";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <WorkspaceHome /> },
      { path: "/w/:workspaceId", element: <DocumentsPage /> },
      { path: "/w/:workspaceId/members", element: <MembersPage /> },
      { path: "/w/:workspaceId/diagrams", element: <DiagramsPage /> },
      { path: "/documents/:documentId", element: <DocumentDetailPage /> },
      { path: "/documents/:documentId/editor", element: <EditorPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
