import axios from 'axios';
import { useMemo, useState } from 'react';
import { CheckCircle2, Lock, LogOut, Mail, Save, Shield, Trash2, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, updateProfile, updatePassword, deleteAccount, logout } = useAuthStore();
  const addToast = useUIStore((state) => state.addToast);

  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', next: '', confirm: '' });
  const [fullName, setFullName] = useState(user?.full_name || '');

  const memberSince = useMemo(
    () => new Date(user?.created_at || '').toLocaleDateString(),
    [user?.created_at],
  );

  const handleProfileSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      await updateProfile({ full_name: fullName });
      addToast({ type: 'success', message: 'Profile updated successfully.' });
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.detail || 'Failed to update profile.'
        : error instanceof Error
        ? error.message
        : 'Failed to update profile.';
      addToast({ type: 'error', message });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passwordData.next !== passwordData.confirm) {
      addToast({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    setIsPasswordLoading(true);
    try {
      await updatePassword(passwordData.current, passwordData.next);
      addToast({ type: 'success', message: 'Password updated successfully. Please sign in again.' });
      setPasswordData({ current: '', next: '', confirm: '' });
      await logout();
      navigate('/auth');
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.detail || 'Failed to update password.'
        : error instanceof Error
        ? error.message
        : 'Failed to update password.';
      addToast({ type: 'error', message });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Delete your account and all conversations permanently?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAccount();
      addToast({ type: 'success', message: 'Account deleted successfully.' });
      navigate('/');
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.detail || 'Failed to delete account.'
        : error instanceof Error
        ? error.message
        : 'Failed to delete account.';
      addToast({ type: 'error', message });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-fade-in pb-20">
      <div className="flex items-center gap-6">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center text-3xl font-black text-white shadow-glow border-4 border-bg-primary">
          {user?.username?.[0].toUpperCase()}
        </div>
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight">{user?.full_name || user?.username}</h1>
          <div className="flex items-center gap-3">
            <Badge variant="primary" className="px-3 py-0.5 rounded-lg font-black uppercase tracking-widest text-[10px]">
              {user?.role || 'User'}
            </Badge>
            <span className="text-text-muted text-sm font-medium">Member since {memberSince}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-strong rounded-3xl p-8 border border-border/30 shadow-2xl">
          <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
            <User className="w-5 h-5 text-accent" />
            Account Details
          </h3>

          <form onSubmit={handleProfileSave} className="space-y-6">
            <Input
              label="Full Name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              icon={<User className="w-4 h-4" />}
              className="bg-bg-tertiary/50"
            />
            <Input
              label="Username"
              value={user?.username || ''}
              disabled
              icon={<Shield className="w-4 h-4" />}
              className="bg-bg-tertiary/30 cursor-not-allowed opacity-60"
            />
            <Input
              label="Email Address"
              value={user?.email || ''}
              disabled
              icon={<Mail className="w-4 h-4" />}
              className="bg-bg-tertiary/30 cursor-not-allowed opacity-60"
            />

            <div className="p-4 rounded-2xl bg-bg-tertiary/20 border border-border/20 flex gap-4 items-center">
              <div className="w-10 h-10 rounded-full bg-success-subtle flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs font-bold text-text-primary">Verified account</p>
                <p className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">Ready for secure access</p>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full py-4 rounded-2xl font-black uppercase tracking-widest shadow-glow"
              loading={isLoading}
              icon={<Save className="w-5 h-5" />}
            >
              Save Profile Changes
            </Button>
          </form>
        </div>

        <div className="space-y-8">
          <div className="glass-strong rounded-3xl p-8 border border-border/30 shadow-2xl">
            <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
              <Lock className="w-5 h-5 text-accent" />
              Security
            </h3>

            <form onSubmit={handlePasswordSave} className="space-y-6">
              <Input
                label="Current Password"
                type="password"
                required
                value={passwordData.current}
                onChange={(event) => setPasswordData({ ...passwordData, current: event.target.value })}
                icon={<Lock className="w-4 h-4" />}
                className="bg-bg-tertiary/50"
              />
              <Input
                label="New Password"
                type="password"
                required
                value={passwordData.next}
                onChange={(event) => setPasswordData({ ...passwordData, next: event.target.value })}
                icon={<Lock className="w-4 h-4" />}
                className="bg-bg-tertiary/50"
              />
              <Input
                label="Confirm New Password"
                type="password"
                required
                value={passwordData.confirm}
                onChange={(event) => setPasswordData({ ...passwordData, confirm: event.target.value })}
                icon={<Lock className="w-4 h-4" />}
                className="bg-bg-tertiary/50"
              />

              <Button
                type="submit"
                variant="outline"
                className="w-full py-4 rounded-2xl font-black uppercase tracking-widest"
                loading={isPasswordLoading}
                icon={<Shield className="w-5 h-5" />}
              >
                Update Password
              </Button>
            </form>
          </div>

          <div className="p-8 glass rounded-3xl border border-danger/20 space-y-6">
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-danger">Danger Zone</h4>
              <p className="text-xs text-text-secondary">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="ghost" className="sm:flex-1" onClick={logout} icon={<LogOut className="w-4 h-4" />}>
                Sign Out
              </Button>
              <Button
                variant="outline"
                className="sm:flex-1 text-danger border-danger/30 hover:bg-danger-subtle hover:border-danger font-bold rounded-xl px-6"
                onClick={handleDeleteAccount}
                loading={isDeleting}
                icon={<Trash2 className="w-4 h-4" />}
              >
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
