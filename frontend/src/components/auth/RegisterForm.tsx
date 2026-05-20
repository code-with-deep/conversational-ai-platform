import axios from 'axios';
import { useState } from 'react';
import { Lock, Mail, Rocket, User, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import Button from '../ui/Button';
import Input from '../ui/Input';

const RegisterForm = () => {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const addToast = useUIStore((state) => state.addToast);

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    fullName: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLoading) return;

    if (formData.password !== formData.confirmPassword) {
      addToast({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setIsLoading(true);
    try {
      await register(
        formData.email,
        formData.username,
        formData.password,
        formData.fullName,
      );
      addToast({ type: 'success', message: 'Account created successfully!' });
      navigate('/dashboard');
    } catch (error: unknown) {
      let message = axios.isAxiosError(error)
        ? error.response?.data?.message || error.response?.data?.detail || 'An unknown error occurred during registration.'
        : error instanceof Error
        ? error.message
        : 'An unknown error occurred during registration.';
      
      if (
        message.toLowerCase().includes('email already exists') ||
        message.toLowerCase().includes('email already exist')
      ) {
        message = 'Account with this email already exists. Please sign in.';
      }
      
      addToast({ type: 'error', message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Full Name"
          type="text"
          placeholder="John Doe"
          icon={<User className="w-4 h-4" />}
          value={formData.fullName}
          onChange={(event) => setFormData({ ...formData, fullName: event.target.value })}
          required
          className="bg-bg-tertiary/50"
        />
        <Input
          label="Username"
          type="text"
          placeholder="johndoe"
          icon={<UserCircle className="w-4 h-4" />}
          value={formData.username}
          onChange={(event) => setFormData({ ...formData, username: event.target.value })}
          required
          className="bg-bg-tertiary/50"
        />
      </div>

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

      <Input
        label="Confirm Password"
        type="password"
        placeholder="••••••••"
        icon={<Lock className="w-4 h-4" />}
        value={formData.confirmPassword}
        onChange={(event) => setFormData({ ...formData, confirmPassword: event.target.value })}
        required
        className="bg-bg-tertiary/50"
      />

      <div className="pt-2">
        <Button
          type="submit"
          className="w-full py-3 h-auto text-base font-bold shadow-glow group"
          loading={isLoading}
          icon={<Rocket className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
        >
          Create Account
        </Button>
      </div>

      <p className="text-[10px] text-center text-text-muted px-4">
        By creating an account, you agree to our Terms of Service and Privacy Policy.
      </p>
    </form>
  );
};

export default RegisterForm;
