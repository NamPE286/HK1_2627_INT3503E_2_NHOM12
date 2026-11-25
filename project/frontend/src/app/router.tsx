import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "../components/Layout";
import { RequireAuth } from "../features/auth/RequireAuth";
import { LoginPage, RegisterPage } from "../pages/AuthPages";
import { DiagramsPage } from "../pages/DiagramsPage";
import { DocumentDetailPage } from "../pages/DocumentDetailPage";
import { DocumentsPage } from "../pages/DocumentsPage";
import { EditorPage } from "../pages/EditorPage";

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
      { index: true, element: <Navigate to="/documents" replace /> },
      { path: "/documents", element: <DocumentsPage /> },
      { path: "/documents/:documentId", element: <DocumentDetailPage /> },
      { path: "/documents/:documentId/editor", element: <EditorPage /> },
      { path: "/diagrams", element: <DiagramsPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
