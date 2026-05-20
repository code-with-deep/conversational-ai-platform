import axios from 'axios';
import { useState } from 'react';
import { ArrowLeft, BrainCircuit, Lock, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import api from '../lib/api';
import { useUIStore } from '../stores/uiStore';

const getResetPasswordErrorMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error)) {
    return 'Failed to reset password. The link may be invalid or expired.';
  }

  const responseData = error.response?.data as
    | { message?: unknown; detail?: unknown }
    | undefined;
  const message =
    (typeof responseData?.message === 'string' && responseData.message.trim()) ||
    (typeof responseData?.detail === 'string' && responseData.detail.trim()) ||
    '';

  if (!message) {
    return 'Failed to reset password. The link may be invalid or expired.';
  }

  if (message === 'Invalid or expired reset token') {
    return 'Invalid or expired reset token.';
  }

  if (message === 'Not a valid reset token') {
    return 'Invalid reset token.';
  }

  if (message === 'User no longer exists') {
    return 'This reset link is no longer valid. Please request a new one.';
  }

  return 'Failed to reset password. The link may be invalid or expired.';
};

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const addToast = useUIStore((state) => state.addToast);

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  const token = searchParams.get('token');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!token) {
      addToast({ type: 'error', message: 'Reset token is missing.' });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      addToast({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        password: formData.password,
      });
      addToast({ type: 'success', message: 'Password reset successfully!' });
      navigate('/auth');
    } catch (error: unknown) {
      const message = getResetPasswordErrorMessage(error);
      addToast({ type: 'error', message });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-bg-primary">
        <div className="glass-strong p-10 rounded-3xl max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-danger-subtle rounded-full flex-center mx-auto">
            <ShieldCheck className="w-8 h-8 text-danger" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-text-primary">Invalid Link</h2>
            <p className="text-text-secondary">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
          </div>
          <Link to="/auth">
            <Button variant="primary" className="w-full mt-4">Back to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-6 py-20">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px]" />

      <div className="max-w-md w-full">
        <div className="text-center mb-10 space-y-4">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent flex-center shadow-glow">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight">AetherMind</span>
          </Link>
          <h1 className="text-3xl font-black">Reset Password</h1>
          <p className="text-text-secondary">
            Set a strong new password to regain access to your workspace.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-3xl p-8 shadow-2xl"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="New Password"
              type="password"
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              value={formData.password}
              onChange={(event) => setFormData({ ...formData, password: event.target.value })}
              required
              className="bg-bg-tertiary/50"
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              value={formData.confirmPassword}
              onChange={(event) => setFormData({ ...formData, confirmPassword: event.target.value })}
              required
              className="bg-bg-tertiary/50"
            />

            <div className="space-y-4 pt-2">
              <Button
                type="submit"
                className="w-full py-3 h-auto text-base font-bold shadow-glow"
                loading={isLoading}
              >
                Update Password
              </Button>
              <Link
                to="/auth"
                className="flex items-center justify-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
