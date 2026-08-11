import React, { useState } from 'react';
import { User as UserType } from '../types';
import { Sprout, User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: UserType) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState<string>('staff@greenhouse.com');
  const [password, setPassword] = useState<string>('password123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [keepSignedIn, setKeepSignedIn] = useState<boolean>(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const namePart = username.includes('@') ? username.split('@')[0] : username;
    const displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    
    onLogin({
      name: displayName || 'Alex',
      email: username,
      role: 'Operations Specialist',
      isLoggedIn: true
    });
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 bg-[#f9faf6] overflow-hidden">
      {/* Background Image Layer */}
      <div className="absolute inset-0 z-0">
        <div
          className="w-full h-full bg-cover bg-center opacity-30 mix-blend-multiply"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=80')`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#ffffff] via-[#f9faf6]/80 to-[#edeeea]/60" />
      </div>

      {/* Main Glassmorphic Card Container */}
      <main className="relative z-10 w-full max-w-md mx-auto">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-[#c1c8c2] p-6 md:p-8 flex flex-col gap-6 animate-fade-in">
          {/* Brand Logo & Greeting */}
          <div className="flex flex-col items-center justify-center gap-2 pb-4 border-b border-[#e2e3df]">
            <div className="w-14 h-14 bg-[#a0f4c8] text-[#19724f] rounded-full flex items-center justify-center mb-1 shadow-sm">
              <Sprout className="w-8 h-8 text-[#0e6c4a]" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#012d1d] tracking-tight text-center">
              Nursery Manager
            </h1>
            <p className="text-xs md:text-sm text-[#414844] text-center">
              Welcome back. Please log in to your account.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Username/Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="username" className="text-xs font-bold text-[#1a1c1a] uppercase tracking-wider">
                Username or Email
              </label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[#717973]" />
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g., staff@greenhouse.com"
                  className="w-full bg-white border border-[#717973] rounded-lg pl-10 pr-3 py-3 text-sm text-[#1a1c1a] placeholder:text-[#c1c8c2] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d] transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-xs font-bold text-[#1a1c1a] uppercase tracking-wider">
                  Password
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => { e.preventDefault(); alert('Password reset link sent to admin.'); }}
                  className="text-xs font-semibold text-[#0e6c4a] hover:text-[#012d1d] hover:underline"
                >
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[#717973]" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-[#717973] rounded-lg pl-10 pr-10 py-3 text-sm text-[#1a1c1a] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#717973] hover:text-[#1a1c1a]"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Keep Signed In */}
            <div className="flex items-center gap-2 mt-1">
              <input
                id="remember"
                type="checkbox"
                checked={keepSignedIn}
                onChange={(e) => setKeepSignedIn(e.target.checked)}
                className="w-4 h-4 rounded border-[#717973] text-[#012d1d] focus:ring-[#012d1d]"
              />
              <label htmlFor="remember" className="text-xs text-[#414844] font-medium cursor-pointer">
                Keep me signed in
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="mt-3 w-full bg-[#461702] hover:bg-[#622c13] active:scale-[0.98] text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Contact Administrator */}
            <div className="text-center mt-3 text-xs text-[#414844]">
              Need access?{' '}
              <a
                href="#admin"
                onClick={(e) => { e.preventDefault(); alert('Please contact administrator at admin@maplelanenursery.com'); }}
                className="font-bold text-[#012d1d] hover:underline"
              >
                Contact Administrator
              </a>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs font-bold text-[#717973]/80 uppercase tracking-wider">
          Secure System • Authorized Personnel Only
        </div>
      </main>
    </div>
  );
};
