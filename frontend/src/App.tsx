import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Layout } from "./components/layout/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useEffect, useState } from "react";
import { api } from "./services/api";
import { useAuthStore } from "./store/authStore";

// Pages
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Ingest from "./pages/Ingest";
import Logs from "./pages/Logs";
import Login from "./pages/Login";
import Register from "./pages/Register";

function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    const publicPaths = new Set(["/login", "/register"]);
    if (publicPaths.has(window.location.pathname)) {
      setIsInitializing(false);
      return;
    }

    // Attempt to fetch current user on load
    // If we have an active session/refresh cookie, the interceptor will handle it
    api
      .getMe()
      .then(() => {
        // We need to store the user. If we got here, we have a token or the interceptor got one.
        // Wait, the interceptor sets the store if it refreshed.
        // If we already have a valid access_token, it's fine.
        // Just set the user if the token is already in the store, or rely on interceptor.
        // For simplicity, we just trigger the check. The interceptor updates the store.
        setIsInitializing(false);
      })
      .catch(() => {
        clearAuth();
        setIsInitializing(false);
      });
  }, [clearAuth]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="ingest" element={<Ingest />} />
              <Route path="logs" element={<Logs />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
