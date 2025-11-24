import { lazy, Suspense } from "react";

const Admin = lazy(() => import("@/pages/Admin"));

export function AdminPanel() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <Admin />
    </Suspense>
  );
}
