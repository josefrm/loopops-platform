import { useAuth } from '@/contexts/AuthContext';
import React from 'react';
import { Navigate } from 'react-router-dom';

interface PublicRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard for public pages (landing, login, signup, etc.)
 * Redirects authenticated users to the main app.
 * Uses `replace` to prevent back navigation to auth pages.
 */
export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { user, loading, isFullyAuthenticated } = useAuth();

  // Show loading while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen bg-workspace-gradient flex items-center justify-center">
        <div className="text-center animate-pulse">
          <img
            src="/lovable-uploads/loopops_logo.png"
            alt="LoopOps"
            className="h-loop-8 w-auto"
          />
        </div>
      </div>
    );
  }

  // If user is authenticated, redirect to main app
  // Using replace to prevent back navigation to public pages
  if (user && isFullyAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Allow access to public route
  return <>{children}</>;
};
