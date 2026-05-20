import axios from 'axios';
import { useState } from 'react';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import Button from '../ui/Button';
import Input from '../ui/Input';

const ACCOUNT_NOT_REGISTERED_MESSAGE = 'Account not registered. Please sign up first.';

const getLoginErrorMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error)) {
    return 'Unable to sign in right now. Please try again.';
  }

  const responseData = error.response?.data as
    | { message?: unknown; detail?: unknown }
    | undefined;
  const message =
    (typeof responseData?.message === 'string' && responseData.message.trim()) ||
    (typeof responseData?.detail === 'string' && responseData.detail.trim()) ||
    '';

  if (message === ACCOUNT_NOT_REGISTERED_MESSAGE) {
    return ACCOUNT_NOT_REGISTERED_MESSAGE;
  }

  if (message === 'Invalid email or password') {
    return 'Invalid email or password.';
  }

  if (message === 'This account has been deactivated') {
    return 'This account has been deactivated.';
  }

  return 'Unable to sign in right now. Please try again.';
};

const LoginForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const addToast = useUIStore((state) => state.addToast);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await login(formData.email, formData.password);
      addToast({ type: 'success', message: 'Welcome back!' });

      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (error: unknown) {
      const message = getLoginErrorMessage(error);
      setErrorMessage(message);
      addToast({
        type: message === ACCOUNT_NOT_REGISTERED_MESSAGE ? 'warning' : 'error',
        message,
      });

      if (message === ACCOUNT_NOT_REGISTERED_MESSAGE) {
        navigate('/auth?tab=register', { replace: true });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="Email Address"
        type="email"
        placeholder="name@example.com"
        icon={<Mail className="w-4 h-4" />}
        value={formData.email}
        onChange={(event) => setFormData({ ...formData, email: event.target.value })}
        required
        className="bg-bg-tertiary/50"
      />

      <div className="space-y-1">
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          icon={<Lock className="w-4 h-4" />}
          value={formData.password}
          onChange={(event) => setFormData({ ...formData, password: event.target.value })}
          required
          className="bg-bg-tertiary/50"
        />

      </div>

      {errorMessage && (
        <p className="text-sm text-danger font-medium">
          {errorMessage}
        </p>
      )}

      <Button
        type="submit"
        className="w-full py-3 h-auto text-base font-bold shadow-glow"
        loading={isLoading}
        icon={<ArrowRight className="w-5 h-5" />}
      >
        Sign In
      </Button>
    </form>
  );
};

export default LoginForm;
