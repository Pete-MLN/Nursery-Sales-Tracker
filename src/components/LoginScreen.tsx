import React, { useState } from 'react';
import { User as UserType } from '../types';
import { Sprout, User, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

interface LoginScreenProps {
  onLogin: (user: UserType, keepSignedIn: boolean) => void;
}

const DEMO_STAFF_ACCOUNTS: UserType[] = [
  {
    name: 'Pete',
    email: 'pete@maplelanenursery.com',
    role: 'General Manager',
    isLoggedIn: true
  },
  {
    name: 'Alex',
    email: 'alex@maplelanenursery.com',
    role: 'Operations Specialist',
    isLoggedIn: true
  },
  {
    name: 'Sarah',
    email: 'sarah@maplelanenursery.com',
    role: 'Nursery Manager',
    isLoggedIn: true
  },
  {
    name: 'Michael',
    email: 'michael@maplelanenursery.com',
    role: 'Inventory Lead',
    isLoggedIn: true
  }
];

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState<string>('pete@maplelanenursery.com');
  const [password, setPassword] = useState<string>('password123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [keepSignedIn, setKeepSignedIn] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim()) {
      setErrorMsg('Please enter your username or email.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const namePart = username.includes('@') ? username.split('@')[0] : username;
      const displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);

      onLogin({
        name: displayName || 'Nursery Staff',
        email: username.trim(),
        role: 'Operations Specialist',
        isLoggedIn: true
      }, keepSignedIn);

      setIsLoading(false);
    }, 400);
  };

  const handleQuickLogin = (staffUser: UserType) => {
    onLogin(staffUser, keepSignedIn);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user) {
        onLogin({
          name: user.displayName || user.email?.split('@')[0] || 'Nursery Staff',
          email: user.email || 'user@maplelanenursery.com',
          role: 'Nursery Manager',
          isLoggedIn: true
        }, keepSignedIn);
      }
    } catch (err: any) {
      console.warn('Google Auth popup warning or error:', err);
      // If popup blocked or cancelled in iframe environment, allow fallback toast message
      setErrorMsg(err.message?.includes('popup-closed') 
        ? 'Sign in popup was closed. Please try staff sign-in or standard login.' 
        : 'Google Sign-In unavailable in this preview environment. Use staff login below.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 bg-[#f9faf6] overflow-hidden font-sans">
      {/* Background Image Layer */}
      <div className="absolute inset-0 z-0">
        <div
          className="w-full h-full bg-cover bg-center opacity-30 mix-blend-multiply"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=80')`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#ffffff] via-[#f9faf6]/85 to-[#edeeea]/70" />
      </div>

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-md mx-auto my-auto">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-[#c1c8c2] p-6 md:p-8 flex flex-col gap-6 animate-fade-in">
          {/* Quick Staff Selectors (Instant Login for Nursery Personnel) - Placed at Top */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs md:text-sm font-extrabold text-[#0e6c4a] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4.5 h-4.5 text-[#0e6c4a]" />
                Quick Staff Switch / Tap Login
              </span>
              <span className="text-xs text-[#717973] font-semibold">1-Tap Access</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {DEMO_STAFF_ACCOUNTS.map((staff) => (
                <button
                  key={staff.email}
                  type="button"
                  onClick={() => handleQuickLogin(staff)}
                  className="p-3.5 bg-[#f3f4f0] hover:bg-[#a0f4c8]/40 active:scale-[0.98] border border-[#c1c8c2] hover:border-[#0e6c4a] rounded-xl text-left transition-all flex flex-col cursor-pointer group shadow-2xs"
                >
                  <span className="text-base font-extrabold text-[#012d1d] group-hover:text-[#0e6c4a] truncate">
                    {staff.name}
                  </span>
                  <span className="text-xs font-medium text-[#555d58] truncate">
                    {staff.role}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex items-center justify-center my-1">
            <div className="border-t border-[#e2e3df] w-full" />
            <span className="bg-white px-3 text-xs font-extrabold uppercase text-[#717973] tracking-wider absolute">
              OR EMAIL LOGIN
            </span>
          </div>

          {/* Brand Header */}
          <div className="flex flex-col items-center justify-center gap-2 pb-1">
            <div className="w-14 h-14 bg-[#a0f4c8] text-[#19724f] rounded-2xl flex items-center justify-center mb-0.5 shadow-xs border border-[#0e6c4a]/20">
              <Sprout className="w-8 h-8 text-[#0e6c4a]" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#012d1d] tracking-tight text-center">
              Maple Lane Nursery
            </h1>
            <p className="text-sm md:text-base text-[#414844] text-center font-semibold">
              Field Sales & Inventory Management
            </p>
          </div>

          {/* Error Message Alert */}
          {errorMsg && (
            <div className="p-3.5 bg-[#ffdad6] text-[#ba1a1a] rounded-xl text-sm font-semibold flex items-center gap-2 border border-[#ffb4ab]">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4.5">
            {/* Username/Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="username" className="text-sm font-bold text-[#1a1c1a] uppercase tracking-wider">
                Username or Email
              </label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#717973]" />
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. pete@maplelanenursery.com"
                  className="w-full bg-white border border-[#717973] rounded-xl pl-11 pr-3 py-3.5 text-base md:text-lg font-medium text-[#1a1c1a] placeholder:text-[#c1c8c2] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d] transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-sm font-bold text-[#1a1c1a] uppercase tracking-wider">
                  Password
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => { e.preventDefault(); alert('Password reset request sent to system administrator.'); }}
                  className="text-xs md:text-sm font-bold text-[#0e6c4a] hover:text-[#012d1d] hover:underline"
                >
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#717973]" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-[#717973] rounded-xl pl-11 pr-11 py-3.5 text-base md:text-lg font-medium text-[#1a1c1a] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#717973] hover:text-[#1a1c1a] cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Persistence Option */}
            <div className="flex items-center justify-between mt-1">
              <label htmlFor="remember" className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  id="remember"
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  className="w-5 h-5 rounded border-[#717973] text-[#012d1d] focus:ring-[#012d1d] cursor-pointer"
                />
                <span className="text-sm md:text-base text-[#414844] font-semibold">
                  Keep me signed in on this device
                </span>
              </label>
            </div>

            {/* Standard Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full bg-[#012d1d] hover:bg-[#0e6c4a] active:scale-[0.98] text-white font-extrabold py-4 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 text-base md:text-lg"
            >
              {isLoading ? (
                <span className="text-base">Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {/* Google Authentication Option */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full bg-white hover:bg-[#f3f4f0] active:scale-[0.98] text-[#1a1c1a] font-extrabold py-3.5 px-4 rounded-xl border border-[#c1c8c2] transition-all flex items-center justify-center gap-2.5 cursor-pointer text-base"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="mt-4 text-center text-xs font-extrabold text-[#717973] uppercase tracking-wider flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-[#0e6c4a]" />
          Session Persistence Active
        </div>
      </main>
    </div>
  );
};

