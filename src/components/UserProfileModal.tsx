import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { User, UserAccount, AVATAR_ICON_OPTIONS, AVATAR_COLOR_OPTIONS } from '../types';
import { UserAvatar } from './UserAvatar';
import { 
  X, 
  Check, 
  Lock, 
  Key, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Crown, 
  User as UserIcon, 
  Phone, 
  Mail, 
  Briefcase, 
  Building2, 
  Calendar, 
  Clock, 
  LogOut, 
  Palette, 
  Sparkles,
  Users,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface UserProfileModalProps {
  currentUser: User;
  allUsers: UserAccount[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateCurrentUser: (updatedUser: Partial<User>) => Promise<void> | void;
  onUpdateUserAccount: (updatedAccount: UserAccount) => Promise<void> | void;
  onOpenAdminConsole?: () => void;
  onLogout: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  currentUser,
  allUsers,
  isOpen,
  onClose,
  onUpdateCurrentUser,
  onUpdateUserAccount,
  onOpenAdminConsole,
  onLogout
}) => {
  if (!isOpen) return null;

  // Find corresponding UserAccount from synced list for full credentials
  const currentAccount = allUsers.find(
    u => (currentUser.id && u.id === currentUser.id) || (u.email.toLowerCase() === currentUser.email.toLowerCase())
  );

  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'activity'>('profile');

  // Profile Form States
  const [selectedIcon, setSelectedIcon] = useState<string>(
    currentUser.avatarIcon || currentAccount?.avatarIcon || 'sprout'
  );
  const [selectedColor, setSelectedColor] = useState<string>(
    currentUser.avatarColor || currentAccount?.avatarColor || '#0e6c4a'
  );
  const [name, setName] = useState<string>(currentUser.name || currentAccount?.name || '');
  const [phone, setPhone] = useState<string>(currentUser.phone || currentAccount?.phone || '');
  const [department, setDepartment] = useState<string>(currentUser.department || currentAccount?.department || '');

  // Password States
  const [currentPasswordInput, setCurrentPasswordInput] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Status feedback
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const showNotification = (msg: string, isErr = false) => {
    if (isErr) {
      setErrorMessage(msg);
      setSuccessMessage(null);
    } else {
      setSuccessMessage(msg);
      setErrorMessage(null);
    }
    setTimeout(() => {
      setSuccessMessage(null);
      setErrorMessage(null);
    }, 3500);
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      showNotification('Display name cannot be blank', true);
      return;
    }

    setIsSaving(true);
    try {
      const updatedUserPayload: Partial<User> = {
        name: name.trim(),
        avatarIcon: selectedIcon,
        avatarColor: selectedColor,
        phone: phone.trim(),
        department: department.trim()
      };

      await onUpdateCurrentUser(updatedUserPayload);

      if (currentAccount) {
        const updatedAccount: UserAccount = {
          ...currentAccount,
          name: name.trim(),
          avatarIcon: selectedIcon,
          avatarColor: selectedColor,
          phone: phone.trim(),
          department: department.trim()
        };
        await onUpdateUserAccount(updatedAccount);
      }

      showNotification('Profile & icon updated successfully!');
    } catch (err: any) {
      showNotification(err?.message || 'Error updating profile', true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Verify current password if account has one
    if (currentAccount && currentAccount.password) {
      if (currentPasswordInput !== currentAccount.password && !currentUser.isAdmin) {
        showNotification('Current password does not match.', true);
        return;
      }
    }

    if (!newPassword || newPassword.length < 4) {
      showNotification('New password must be at least 4 characters.', true);
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotification('New passwords do not match.', true);
      return;
    }

    setIsSaving(true);
    try {
      if (currentAccount) {
        const updatedAccount: UserAccount = {
          ...currentAccount,
          password: newPassword
        };
        await onUpdateUserAccount(updatedAccount);
      }

      await onUpdateCurrentUser({ password: newPassword });

      setCurrentPasswordInput('');
      setNewPassword('');
      setConfirmPassword('');
      showNotification('Password successfully changed!');
    } catch (err: any) {
      showNotification(err?.message || 'Failed to update password', true);
    } finally {
      setIsSaving(false);
    }
  };

  const isAdmin = currentUser.isAdmin || currentAccount?.isAdmin || currentUser.email === 'pete@maplelanenursery.com';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        tabIndex={-1}
        className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#c1c8c2] overflow-hidden my-auto outline-none animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="bg-[#012d1d] text-white p-4 sm:p-5 flex items-center justify-between shrink-0 border-b border-[#0e6c4a]">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar
              icon={selectedIcon}
              color={selectedColor}
              name={name || currentUser.name}
              isAdmin={isAdmin}
              size="md"
              showAdminBadge={true}
              borderClass="border-[#a0f4c8]/40"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base sm:text-lg text-white truncate">
                  {name || currentUser.name}
                </h3>
                {isAdmin ? (
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                    <Crown className="w-3 h-3" />
                    Administrator
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-[#a0f4c8]/20 text-[#a0f4c8] border border-[#a0f4c8]/30 px-2 py-0.5 rounded-full">
                    Staff Account
                  </span>
                )}
              </div>
              <p className="text-xs text-[#a0f4c8]/80 truncate">{currentUser.email}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close profile modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#e2e3df] bg-[#f9faf6] px-3 pt-2 gap-1.5 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-3.5 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-white text-[#012d1d] border-[#012d1d] shadow-2xs'
                : 'text-[#555d58] hover:text-[#012d1d] border-transparent hover:bg-white/60'
            }`}
          >
            <Palette className="w-4 h-4 text-[#0e6c4a]" />
            <span>Profile & Icon</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`px-3.5 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'password'
                ? 'bg-white text-[#012d1d] border-[#012d1d] shadow-2xs'
                : 'text-[#555d58] hover:text-[#012d1d] border-transparent hover:bg-white/60'
            }`}
          >
            <Lock className="w-4 h-4 text-[#0e6c4a]" />
            <span>Password</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`px-3.5 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'activity'
                ? 'bg-white text-[#012d1d] border-[#012d1d] shadow-2xs'
                : 'text-[#555d58] hover:text-[#012d1d] border-transparent hover:bg-white/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[#0e6c4a]" />
            <span>Account Details</span>
          </button>
        </div>

        {/* Notification Banners */}
        {successMessage && (
          <div className="mx-4 mt-3 p-3 bg-[#e8f5e9] text-[#0e6c4a] rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 border border-[#a0f4c8] shadow-2xs animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-[#0e6c4a] shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mx-4 mt-3 p-3 bg-rose-50 text-rose-800 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 border border-rose-200 shadow-2xs animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab Contents */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-5">
          {/* TAB 1: Profile & Icon Selector */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
              {/* Live Avatar Preview Card */}
              <div className="bg-[#f3f4f0] border border-[#c1c8c2] rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 justify-between">
                <div className="flex items-center gap-4">
                  <UserAvatar
                    icon={selectedIcon}
                    color={selectedColor}
                    name={name || currentUser.name}
                    isAdmin={isAdmin}
                    size="xl"
                    showAdminBadge={true}
                    borderClass="border-white shadow-md ring-2 ring-[#012d1d]/20"
                  />
                  <div>
                    <span className="text-[11px] font-extrabold uppercase text-[#0e6c4a] tracking-wider block">
                      Live Avatar Preview
                    </span>
                    <h4 className="font-extrabold text-base sm:text-lg text-[#012d1d]">
                      {name || currentUser.name}
                    </h4>
                    <p className="text-xs text-[#555d58] font-medium">
                      Icon: <span className="font-bold text-[#012d1d] capitalize">{selectedIcon}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-[#717973] font-medium block">Role</span>
                  <span className="text-xs font-bold text-[#012d1d] bg-white px-2.5 py-1 rounded-lg border border-[#c1c8c2] inline-block">
                    {currentUser.role}
                  </span>
                </div>
              </div>

              {/* 1. Icon Selection Grid */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-[#012d1d] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#0e6c4a]" />
                    Choose Your Personal Icon
                  </label>
                  <span className="text-[11px] text-[#717973] font-semibold">16 Options Available</span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 bg-[#f9faf6] p-2.5 rounded-2xl border border-[#e2e3df]">
                  {AVATAR_ICON_OPTIONS.map((item) => {
                    const isSelected = selectedIcon === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedIcon(item.id)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-[#012d1d] text-[#a0f4c8] shadow-md ring-2 ring-[#012d1d]'
                            : 'bg-white text-[#414844] hover:bg-[#e8f5e9] border border-[#c1c8c2]/60 hover:border-[#0e6c4a]'
                        }`}
                        title={item.label}
                      >
                        <UserAvatar
                          icon={item.id}
                          color={isSelected ? selectedColor : '#717973'}
                          name=""
                          size="xs"
                          borderClass="border-transparent"
                        />
                        <span className={`text-[10px] font-bold mt-1 truncate max-w-full ${isSelected ? 'text-[#a0f4c8]' : 'text-[#414844]'}`}>
                          {item.id}
                        </span>
                        {isSelected && (
                          <span className="absolute -top-1 -right-1 bg-[#a0f4c8] text-[#012d1d] rounded-full p-0.5 shadow-2xs">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Color Palette */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-extrabold text-[#012d1d] uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-[#0e6c4a]" />
                  Choose Avatar Background Color
                </label>

                <div className="flex flex-wrap items-center gap-2 bg-[#f9faf6] p-2.5 rounded-2xl border border-[#e2e3df]">
                  {AVATAR_COLOR_OPTIONS.map((c) => {
                    const isSelected = selectedColor === c.hex;
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setSelectedColor(c.hex)}
                        className={`w-8 h-8 rounded-full transition-all cursor-pointer flex items-center justify-center shadow-xs ${
                          isSelected ? 'ring-3 ring-[#012d1d] scale-110' : 'hover:scale-105 opacity-90 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.label}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Display Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="displayName" className="text-xs font-extrabold text-[#1a1c1a] uppercase tracking-wider">
                    Your Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#717973]" />
                    <input
                      id="displayName"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Pete"
                      className="w-full bg-white border border-[#c1c8c2] rounded-xl pl-9 pr-3 py-2.5 text-sm font-semibold text-[#1a1c1a] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="phoneNum" className="text-xs font-extrabold text-[#1a1c1a] uppercase tracking-wider">
                    Phone / Field Mobile
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#717973]" />
                    <input
                      id="phoneNum"
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 518-227-1235"
                      className="w-full bg-white border border-[#c1c8c2] rounded-xl pl-9 pr-3 py-2.5 text-sm font-semibold text-[#1a1c1a] focus:outline-none focus:border-[#012d1d] focus:ring-1 focus:ring-[#012d1d]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#012d1d] hover:bg-[#0e6c4a] active:scale-95 text-white font-extrabold text-sm px-6 py-3 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4 text-[#a0f4c8]" />
                  <span>{isSaving ? 'Saving...' : 'Save Profile & Icon'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Change Password */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <div className="bg-[#f9faf6] p-3.5 rounded-xl border border-[#e2e3df]">
                <h4 className="text-xs font-extrabold text-[#012d1d] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#0e6c4a]" />
                  Update Your Login Password
                </h4>
                <p className="text-xs text-[#555d58]">
                  Set a secure password for your Maple Lane account to log in across nursery devices and tablets.
                </p>
              </div>

              {/* Current Password (if not administrator override) */}
              {!isAdmin && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-[#1a1c1a] uppercase tracking-wider">
                    Current Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#717973]" />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={currentPasswordInput}
                      onChange={(e) => setCurrentPasswordInput(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full bg-white border border-[#c1c8c2] rounded-xl pl-9 pr-10 py-2.5 text-sm font-medium text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#717973] hover:text-[#1a1c1a]"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* New Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-[#1a1c1a] uppercase tracking-wider">
                  New Password
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#717973]" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 4 characters"
                    className="w-full bg-white border border-[#c1c8c2] rounded-xl pl-9 pr-10 py-2.5 text-sm font-medium text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#717973] hover:text-[#1a1c1a]"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-[#1a1c1a] uppercase tracking-wider">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#717973]" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full bg-white border border-[#c1c8c2] rounded-xl pl-9 pr-10 py-2.5 text-sm font-medium text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#717973] hover:text-[#1a1c1a]"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#012d1d] hover:bg-[#0e6c4a] active:scale-95 text-white font-extrabold text-sm px-6 py-3 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-4 h-4 text-[#a0f4c8]" />
                  <span>{isSaving ? 'Updating...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Account Details & Activities */}
          {activeTab === 'activity' && (
            <div className="flex flex-col gap-4">
              <div className="bg-[#f9faf6] p-4 rounded-2xl border border-[#e2e3df] flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#e2e3df]">
                  <span className="text-xs font-bold text-[#717973] uppercase">Email / Username</span>
                  <span className="text-xs font-bold text-[#012d1d]">{currentUser.email}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-[#e2e3df]">
                  <span className="text-xs font-bold text-[#717973] uppercase">Assigned Role</span>
                  <span className="text-xs font-bold text-[#012d1d]">{currentUser.role}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-[#e2e3df]">
                  <span className="text-xs font-bold text-[#717973] uppercase">Administrator Privileges</span>
                  <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full ${
                    isAdmin ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {isAdmin ? 'System Administrator' : 'Standard User'}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-[#e2e3df]">
                  <span className="text-xs font-bold text-[#717973] uppercase">Account Status</span>
                  <span className="text-xs font-bold text-[#0e6c4a] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#00a86b] animate-pulse" />
                    Active / Synchronized
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#717973] uppercase">Account Created</span>
                  <span className="text-xs text-[#555d58] font-medium">
                    {currentAccount?.createdAt ? new Date(currentAccount.createdAt).toLocaleDateString() : 'System Default'}
                  </span>
                </div>
              </div>

              {/* Admin Console Shortcut for Administrators */}
              {isAdmin && onOpenAdminConsole && (
                <div className="bg-gradient-to-r from-[#012d1d] to-[#0e6c4a] text-white p-4 rounded-2xl shadow-md border border-[#a0f4c8]/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-amber-300" />
                      <h4 className="font-extrabold text-sm text-white">Administrator Console</h4>
                    </div>
                    <p className="text-xs text-[#a0f4c8] mt-0.5">
                      Setup new staff accounts, manage passwords, and assign other administrators.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAdminConsole();
                    }}
                    className="bg-[#a0f4c8] text-[#012d1d] hover:bg-white active:scale-95 font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Users className="w-3.5 h-3.5 text-[#012d1d]" />
                    <span>Manage All Accounts</span>
                  </button>
                </div>
              )}

              {/* Sign Out Action */}
              <div className="pt-2 flex justify-between items-center">
                <span className="text-xs text-[#717973]">Need to switch account or device?</span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out of Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
