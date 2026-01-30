import { DocumentViewerWrapper } from '@/components/DocumentViewerWrapper';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PublicRoute } from '@/components/PublicRoute';
import { CurtainTransitionProvider } from '@/components/ui/CurtainTransition';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/contexts/AuthContext';
import { SSEConnectionProvider } from '@/contexts/SSEConnectionContext';
import { SidebarWidthProvider } from '@/contexts/SidebarWidthContext';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import {
  LandingPage,
  LogIn,
  RecoverPassword,
  SignUp,
} from './components/landing';
import ProjectContextPage from './components/projectContext/ProjectContext';
import { ReviewFiles } from './components/review-files/ReviewFiles';
import { DialogControlProvider } from './contexts/DialogControlContext';
import Index from './pages/Index';
import Integrations from './pages/Integrations';
import LoopsHistory from './pages/LoopsHistory';
import Mindspace from './pages/Mindspace';
import NotFound from './pages/NotFound';
import Onboarding from './pages/Onboarding';
import Profile from './pages/Profile';

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <AuthProvider>
        <DialogControlProvider>
          <SSEConnectionProvider>
            <SidebarWidthProvider>
              <DocumentViewerWrapper />
              <CurtainTransitionProvider duration={800}>
                <Routes>
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <ProjectContextPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/chat"
                    element={
                      <ProtectedRoute>
                        <Index />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/mindspace"
                    element={
                      <ProtectedRoute>
                        <Mindspace />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/loops"
                    element={
                      <ProtectedRoute>
                        <LoopsHistory />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/landing"
                    element={
                      <PublicRoute>
                        <LandingPage />
                      </PublicRoute>
                    }
                  />
                  <Route
                    path="/login"
                    element={
                      <PublicRoute>
                        <LogIn />
                      </PublicRoute>
                    }
                  />
                  <Route
                    path="/recover-password"
                    element={
                      <PublicRoute>
                        <RecoverPassword />
                      </PublicRoute>
                    }
                  />
                  <Route
                    path="/signup"
                    element={
                      <PublicRoute>
                        <SignUp />
                      </PublicRoute>
                    }
                  />
                  <Route
                    path="/onboarding"
                    element={
                      <ProtectedRoute>
                        <Onboarding />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/onboarding/flow"
                    element={
                      <ProtectedRoute>
                        <Onboarding />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/onboarding/step-1"
                    element={
                      <ProtectedRoute>
                        <Onboarding />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/onboarding/step-2"
                    element={
                      <ProtectedRoute>
                        <Onboarding />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/onboarding/step-3"
                    element={
                      <ProtectedRoute>
                        <Onboarding />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/integrations"
                    element={
                      <ProtectedRoute>
                        <Integrations />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/review-files"
                    element={
                      <ProtectedRoute>
                        <ReviewFiles />
                      </ProtectedRoute>
                    }
                  />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </CurtainTransitionProvider>
            </SidebarWidthProvider>
          </SSEConnectionProvider>
        </DialogControlProvider>
      </AuthProvider>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
