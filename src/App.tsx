/**
 * ChronoWear AI - Main Application Component
 * 
 * Root component that sets up application-wide providers and routing.
 * Includes React Query for data fetching, routing, and UI toast notifications.
 * 
 * @module App
 */

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./components/AuthPage";
import Layout from "./components/Layout";
import Closet from "./pages/Closet";
import Stylist from "./pages/Stylist";
import OOTDDiary from "./pages/OOTDDiary";
import Settings from "./pages/Settings";
import SimpleDebug from "./pages/SimpleDebug";
import DatabaseTest from "./pages/DatabaseTest";
import LoginTest from "./pages/LoginTest";
import NotFound from "./pages/NotFound";

// Initialize React Query client for server state management
const queryClient = new QueryClient();

/**
 * Main application component with routing and global providers
 * 
 * Route Structure:
 * - /auth: Authentication page
 * - /debug, /db-test, /login-test: Development utilities
 * - /: Protected routes (requires authentication)
 *   - /closet: Wardrobe management
 *   - /stylist: AI styling assistant
 *   - /diary: Daily outfit diary (default route)
 *   - /settings: User preferences
 * 
 * @returns Application component tree
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {/* Toast notifications */}
      <Toaster />
      <Sonner />
      
      {/* Application routing */}
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/auth" element={<AuthPage />} />
          
          {/* Development/testing routes */}
          <Route path="/debug" element={<SimpleDebug />} />
          <Route path="/db-test" element={<DatabaseTest />} />
          <Route path="/login-test" element={<LoginTest />} />
          
          {/* Protected routes with authentication layout */}
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/diary" replace />} />
            <Route path="/closet" element={<Closet />} />
            <Route path="/stylist" element={<Stylist />} />
            <Route path="/diary" element={<OOTDDiary />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          
          {/* 404 fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
