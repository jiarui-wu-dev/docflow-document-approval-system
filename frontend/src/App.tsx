import {
  Component,
  lazy,
  Suspense,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { MotionConfig, motion } from "motion/react";
import { useAuth } from "./lib/auth";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { EmptyState, Loading } from "./components/common";
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const Documents = lazy(() =>
  import("./pages/Documents").then((m) => ({ default: m.Documents })),
);
const CreateDocument = lazy(() =>
  import("./pages/CreateDocument").then((m) => ({ default: m.CreateDocument })),
);
const DocumentDetails = lazy(() =>
  import("./pages/DocumentDetails").then((m) => ({
    default: m.DocumentDetails,
  })),
);
import type { Role } from "./lib/types";
function Protected({ roles }: { roles?: Role[] }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user)
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  if (roles && !roles.includes(user.role))
    return (
      <EmptyState
        title="This workspace belongs to another role"
        description="Use the navigation to return to your accessible documents."
      />
    );
  return <Outlet />;
}
function PageTransition() {
  const location = useLocation();
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
    >
      <Suspense fallback={<Loading />}>
        <Outlet />
      </Suspense>
    </motion.div>
  );
}
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    /* Do not log request context or credentials. */
  }
  render() {
    return this.state.failed ? (
      <div className="fatal-error">
        <h1>Unable to display this page</h1>
        <p>
          An unexpected interface error occurred. Reload to start a fresh
          session.
        </p>
        <button
          className="button button-primary"
          onClick={() => window.location.reload()}
        >
          Reload DOCFLOW
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Protected />}>
          <Route element={<Layout />}>
            <Route element={<PageTransition />}>
              <Route index element={<Dashboard />} />
              <Route path="documents" element={<Documents />} />
              <Route element={<Protected roles={["SUBMITTER", "ADMIN"]} />}>
                <Route path="documents/new" element={<CreateDocument />} />
              </Route>
              <Route path="documents/:id" element={<DocumentDetails />} />
              <Route element={<Protected roles={["REVIEWER", "ADMIN"]} />}>
                <Route path="reviews" element={<Documents mode="review" />} />
              </Route>
              <Route element={<Protected roles={["ADMIN"]} />}>
                <Route path="admin" element={<Documents mode="admin" />} />
              </Route>
              <Route
                path="*"
                element={
                  <EmptyState
                    title="Page not found"
                    description="Choose a workspace from the navigation to continue."
                  />
                }
              />
            </Route>
          </Route>
        </Route>
      </Routes>
    </MotionConfig>
  );
}
