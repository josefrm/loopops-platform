import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { EditableProfileSection } from '@/components/user/EditableProfileSection';
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useNotifications } from '@/hooks/useNotifications';
import { ArrowLeft, Bell, Building, LogOut, User } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user, signOut } = useAuth();
  const { profile, loading, refreshProfile } = useUserProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { permission, requestPermission, isSupported, canShow } = useNotifications();

  useEffect(() => {
    if (!user) {
      navigate('/landing');
      return;
    }
  }, [user, navigate]);

  const handleSignOut = async () => {
    try {
      await signOut();
      // Note: signOut() will handle the redirect to /landing
      toast({
        title: 'Signed out successfully',
        description: 'You have been logged out of your account.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description:
          'Failed to sign out. Please try again.' +
          (error instanceof Error ? ` ${error.message}` : ''),
        variant: 'destructive',
      });
    }
  };

  const handleRequestNotificationPermission = async () => {
    const granted = await requestPermission();
    if (granted) {
      toast({
        title: 'Notifications enabled',
        description: 'You will receive desktop notifications when runs complete.',
      });
    } else {
      toast({
        title: 'Notifications disabled',
        description:
          permission === 'denied'
            ? 'Notifications were denied. Please enable them in your browser settings.'
            : 'Notification permission was not granted.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
            <User className="w-5 h-5 text-white animate-pulse" />
          </div>
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img
                src="/lovable-uploads/5ebdf873-109e-4da2-822a-dbe1e81bf6e0.png"
                alt="LoopOps"
                className="h-loop-10 w-auto"
              />
              <div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">
                  Profile
                </h1>
                <p className="text-slate-600">
                  Manage your account information and preferences
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              onClick={handleSignOut}
              className="flex items-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Personal Information</span>
              </CardTitle>
              <CardDescription>Your basic account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {profile?.name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {profile?.name || 'User'}
                  </h3>
                  <p className="text-slate-600">
                    {profile?.email || user?.email || 'No email'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Role Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="w-5 h-5" />
                <span>Role</span>
              </CardTitle>
              <CardDescription>Your role in the organization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="font-medium text-slate-700">Role</span>
                  <span className="text-slate-600">
                    {profile?.role || 'Not specified'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Editable Role & Team Section */}
          {profile && (
            <EditableProfileSection
              profile={profile}
              onProfileUpdate={refreshProfile}
            />
          )}

          {/* Workspaces */}
          <WorkspaceSwitcher />

          {/* Notification Settings */}
          {isSupported && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="w-5 h-5" />
                  <span>Notifications</span>
                </CardTitle>
                <CardDescription>
                  Get desktop notifications when your agent runs complete
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-700">
                      Desktop Notifications
                    </p>
                    <p className="text-sm text-slate-600">
                      {canShow
                        ? 'Notifications are enabled'
                        : permission === 'denied'
                          ? 'Notifications are blocked. Enable them in your browser settings.'
                          : 'Click to enable desktop notifications'}
                    </p>
                  </div>
                  {!canShow && permission !== 'denied' && (
                    <Button onClick={handleRequestNotificationPermission}>
                      Enable Notifications
                    </Button>
                  )}
                  {canShow && (
                    <div className="flex items-center space-x-2 text-green-600">
                      <Bell className="w-4 h-4" />
                      <span className="text-sm font-medium">Enabled</span>
                    </div>
                  )}
                  {permission === 'denied' && (
                    <div className="flex items-center space-x-2 text-red-600">
                      <Bell className="w-4 h-4" />
                      <span className="text-sm font-medium">Blocked</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
