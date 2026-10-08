import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { User, UserAccount, AVATAR_ICON_OPTIONS, AVATAR_COLOR_OPTIONS } from '../types';
import { UserAvatar } from './UserAvatar';
import { 
  X, 
  Search, 
  Plus, 
  Crown, 
  ShieldCheck, 
  Shield, 
  UserPlus, 
  Key, 
  Edit3, 
  Trash2, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Eye, 
  EyeOff, 
  Mail, 
  Phone, 
  Building2, 
  Briefcase, 
  Filter, 
  Sparkles, 
  Palette,
  UserCheck,
  UserX
} from 'lucide-react';

interface UserManagementModalProps {
  currentUser: User;
  allUsers: UserAccount[];
  isOpen: boolean;
  onClose: () => void;
  onSaveUser: (user: UserAccount) => Promise<void> | void;
  onDeleteUser: (userId: string) => Promise<void> | void;
}

const ROLE_PRESETS = [
  'General Manager / Owner',
  'Nursery Manager',
  'Operations Lead',
  'Inventory Specialist',
  'Plant Care & Greenhouse Lead',
  'Sales Representative',
  'Order Fulfillment',
  'Yard & Equipment Lead'
];

const DEPARTMENT_PRESETS = [
  'Management',
  'Plant Care',
  'Warehouse & Inventory',
  'Logistics & Operations',
  'Sales & Delivery'
];

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  currentUser,
  allUsers,
  isOpen,
  onClose,
  onSaveUser,
  onDeleteUser
}) => {
  if (!isOpen) return null;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'active' | 'inactive'>('all');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [passwordResetUser, setPasswordResetUser] = useState<UserAccount | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserAccount | null>(null);

  // New User Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('password123');
  const [newRole, setNewRole] = useState('Nursery Manager');
  const [newDepartment, setNewDepartment] = useState('Management');
  const [newPhone, setNewPhone] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [newAvatarIcon, setNewAvatarIcon] = useState('sprout');
  const [newAvatarColor, setNewAvatarColor] = useState('#0e6c4a');
  const [showNewPasswordText, setShowNewPasswordText] = useState(false);

  // Notifications
  const [notification, setNotification] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (text: string, isError = false) => {
    setNotification({ text, isError });
    setTimeout(() => setNotification(null), 3500);
  };

  // Filtered Users List
  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterRole === 'admin') return u.isAdmin;
    if (filterRole === 'active') return u.status === 'active';
    if (filterRole === 'inactive') return u.status === 'inactive';
    return true;
  });

  const totalAdmins = allUsers.filter(u => u.isAdmin).length;
  const totalActive = allUsers.filter(u => u.status === 'active').length;

  const handleOpenCreate = () => {
    setNewName('');
    setNewEmail('');
    setNewPassword('password123');
    setNewRole('Nursery Manager');
    setNewDepartment('Management');
    setNewPhone('');
    setNewIsAdmin(false);
    setNewAvatarIcon('sprout');
    setNewAvatarColor('#0e6c4a');
    setIsCreatingNew(true);
    setEditingUser(null);
  };

  const handleOpenEdit = (user: UserAccount) => {
    setEditingUser(user);
    setNewName(user.name);
    setNewEmail(user.email);
    setNewPassword(user.password);
    setNewRole(user.role);
    setNewDepartment(user.department || 'Management');
    setNewPhone(user.phone || '');
    setNewIsAdmin(user.isAdmin);
    setNewAvatarIcon(user.avatarIcon || 'sprout');
    setNewAvatarColor(user.avatarColor || '#0e6c4a');
    setIsCreatingNew(false);
  };

  const handleSaveUserForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      showToast('Name and Email are required.', true);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUser) {
        // Editing existing user
        // Safety: Pete must always remain administrator
        const isPete = editingUser.email.toLowerCase() === 'pete@maplelanenursery.com';
        const finalIsAdmin = isPete ? true : newIsAdmin;

        const updated: UserAccount = {
          ...editingUser,
          name: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          password: newPassword.trim() || editingUser.password,
          role: newRole.trim(),
          department: newDepartment.trim(),
          phone: newPhone.trim(),
          isAdmin: finalIsAdmin,
          avatarIcon: newAvatarIcon,
          avatarColor: newAvatarColor
        };

        await onSaveUser(updated);
        showToast(`User "${updated.name}" updated successfully.`);
        setEditingUser(null);
      } else {
        // Creating brand new user
        // Check for duplicate email
        const exists = allUsers.some(u => u.email.toLowerCase() === newEmail.trim().toLowerCase());
        if (exists) {
          showToast(`An account with email "${newEmail}" already exists.`, true);
          setIsSubmitting(false);
          return;
        }

        const newUser: UserAccount = {
          id: `usr-${Date.now()}`,
          name: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          password: newPassword.trim() || 'password123',
          role: newRole.trim(),
          department: newDepartment.trim(),
          phone: newPhone.trim(),
          isAdmin: newIsAdmin,
          avatarIcon: newAvatarIcon,
          avatarColor: newAvatarColor,
          status: 'active',
          createdAt: new Date().toISOString()
        };

        await onSaveUser(newUser);
        showToast(`New user "${newUser.name}" created successfully.`);
        setIsCreatingNew(false);
      }
    } catch (err: any) {
      showToast(err?.message || 'Error saving user', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAdminStatus = async (user: UserAccount) => {
    // Safety checks:
    if (user.email.toLowerCase() === 'pete@maplelanenursery.com') {
      showToast('Pete is the primary system owner and must remain an administrator.', true);
      return;
    }

    if (user.isAdmin && totalAdmins <= 1) {
      showToast('At least one administrator must remain active in the system.', true);
      return;
    }

    const nextIsAdmin = !user.isAdmin;
    try {
      const updated: UserAccount = {
        ...user,
        isAdmin: nextIsAdmin
      };
      await onSaveUser(updated);
      showToast(
        nextIsAdmin 
          ? `Granted Administrator privileges to ${user.name}.` 
          : `Revoked Administrator privileges from ${user.name}.`
      );
    } catch (err: any) {
      showToast(err?.message || 'Error toggling admin privileges', true);
    }
  };

  const handleToggleStatus = async (user: UserAccount) => {
    if (user.email.toLowerCase() === 'pete@maplelanenursery.com') {
      showToast('Primary administrator account cannot be deactivated.', true);
      return;
    }

    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      const updated: UserAccount = {
        ...user,
        status: nextStatus
      };
      await onSaveUser(updated);
      showToast(`Account "${user.name}" is now ${nextStatus}.`);
    } catch (err: any) {
      showToast(err?.message || 'Error updating account status', true);
    }
  };

  const handleConfirmPasswordReset = async () => {
    if (!passwordResetUser) return;
    if (!resetNewPassword.trim() || resetNewPassword.length < 4) {
      showToast('Password must be at least 4 characters.', true);
      return;
    }

    try {
      const updated: UserAccount = {
        ...passwordResetUser,
        password: resetNewPassword.trim()
      };
      await onSaveUser(updated);
      showToast(`Password successfully reset for "${passwordResetUser.name}".`);
      setPasswordResetUser(null);
      setResetNewPassword('');
    } catch (err: any) {
      showToast(err?.message || 'Error resetting password', true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmUser) return;
    if (deleteConfirmUser.email.toLowerCase() === 'pete@maplelanenursery.com') {
      showToast('Pete is the master account and cannot be deleted.', true);
      setDeleteConfirmUser(null);
      return;
    }

    try {
      await onDeleteUser(deleteConfirmUser.id);
      showToast(`User "${deleteConfirmUser.name}" deleted.`);
      setDeleteConfirmUser(null);
    } catch (err: any) {
      showToast(err?.message || 'Error deleting user', true);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        tabIndex={-1}
        className="bg-white rounded-2xl sm:rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#c1c8c2] overflow-hidden my-auto outline-none animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#012d1d] text-white p-4 sm:p-5 flex items-center justify-between shrink-0 border-b border-[#0e6c4a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center shadow-md">
              <Crown className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-xl text-white">
                  User & Administrator Management
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full">
                  Admin Console
                </span>
              </div>
              <p className="text-xs text-[#a0f4c8]/80">
                Setup new accounts, assign administrator privileges, and update staff passwords.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications Toast */}
        {notification && (
          <div className={`mx-4 mt-3 p-3 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-2xs animate-fade-in ${
            notification.isError ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-[#e8f5e9] text-[#0e6c4a] border border-[#a0f4c8]'
          }`}>
            {notification.isError ? <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-[#0e6c4a] shrink-0" />}
            <span>{notification.text}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-4">
          {/* If Creating or Editing, Show Form */}
          {(isCreatingNew || editingUser) ? (
            <form onSubmit={handleSaveUserForm} className="bg-[#f9faf6] p-4 sm:p-5 rounded-2xl border border-[#c1c8c2] flex flex-col gap-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-[#e2e3df]">
                <h4 className="font-extrabold text-sm sm:text-base text-[#012d1d] flex items-center gap-2">
                  {isCreatingNew ? <UserPlus className="w-4 h-4 text-[#0e6c4a]" /> : <Edit3 className="w-4 h-4 text-[#0e6c4a]" />}
                  {isCreatingNew ? 'Create New Staff Account' : `Edit Account: ${editingUser?.name}`}
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingNew(false);
                    setEditingUser(null);
                  }}
                  className="text-xs font-bold text-[#717973] hover:text-[#1a1c1a]"
                >
                  Cancel
                </button>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1a1c1a] uppercase">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="bg-white border border-[#c1c8c2] rounded-xl px-3 py-2 text-sm font-semibold text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1a1c1a] uppercase">Email / Username *</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. john@maplelanenursery.com"
                    className="bg-white border border-[#c1c8c2] rounded-xl px-3 py-2 text-sm font-semibold text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1a1c1a] uppercase">
                    {isCreatingNew ? 'Initial Password *' : 'Password (leave as-is to keep)'}
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPasswordText ? 'text' : 'password'}
                      required={isCreatingNew}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white border border-[#c1c8c2] rounded-xl px-3 pr-9 py-2 text-sm font-semibold text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPasswordText(!showNewPasswordText)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#717973]"
                    >
                      {showNewPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1a1c1a] uppercase">Role / Title *</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="bg-white border border-[#c1c8c2] rounded-xl px-3 py-2 text-sm font-semibold text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
                  >
                    {ROLE_PRESETS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1a1c1a] uppercase">Department</label>
                  <select
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className="bg-white border border-[#c1c8c2] rounded-xl px-3 py-2 text-sm font-semibold text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
                  >
                    {DEPARTMENT_PRESETS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1a1c1a] uppercase">Phone Number</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="e.g. (555) 123-4567"
                    className="bg-white border border-[#c1c8c2] rounded-xl px-3 py-2 text-sm font-semibold text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
                  />
                </div>
              </div>

              {/* Avatar Icon & Color Picker */}
              <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-3 rounded-xl border border-[#c1c8c2]">
                <UserAvatar
                  icon={newAvatarIcon}
                  color={newAvatarColor}
                  name={newName || 'Staff'}
                  isAdmin={newIsAdmin}
                  size="lg"
                  showAdminBadge={true}
                />
                <div className="flex-1 flex flex-col gap-2 w-full">
                  <span className="text-xs font-bold text-[#012d1d] uppercase">Personal Icon</span>
                  <div className="grid grid-cols-8 gap-1.5">
                    {AVATAR_ICON_OPTIONS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setNewAvatarIcon(item.id)}
                        className={`p-1.5 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                          newAvatarIcon === item.id ? 'bg-[#012d1d] text-[#a0f4c8] border-[#012d1d]' : 'bg-[#f3f4f0] text-[#414844] hover:bg-white'
                        }`}
                        title={item.label}
                      >
                        <UserAvatar icon={item.id} color={newAvatarIcon === item.id ? newAvatarColor : '#717973'} size="xs" borderClass="border-transparent" />
                      </button>
                    ))}
                  </div>

                  <span className="text-xs font-bold text-[#012d1d] uppercase mt-1">Color Palette</span>
                  <div className="flex flex-wrap gap-1.5">
                    {AVATAR_COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setNewAvatarColor(c.hex)}
                        className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                          newAvatarColor === c.hex ? 'ring-2 ring-[#012d1d] scale-110' : 'opacity-85 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Administrator Toggle */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-700 shrink-0" />
                  <div>
                    <span className="text-xs font-extrabold text-amber-950 uppercase tracking-wider block">
                      Grant Administrator Privileges
                    </span>
                    <span className="text-[11px] text-amber-800">
                      Can create & manage other user accounts, reset passwords, and assign administrators.
                    </span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsAdmin}
                    onChange={(e) => setNewIsAdmin(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingNew(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-[#555d58] hover:text-[#1a1c1a] border border-[#c1c8c2] bg-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#012d1d] hover:bg-[#0e6c4a] text-white text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4 text-[#a0f4c8]" />
                  <span>{isSubmitting ? 'Saving...' : isCreatingNew ? 'Create Account' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Stat Cards & Quick Create Bar */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-[#f3f4f0] p-3 rounded-xl border border-[#c1c8c2] text-center">
                  <span className="text-[10px] font-extrabold text-[#717973] uppercase tracking-wider block">Total Users</span>
                  <span className="text-xl font-black text-[#012d1d]">{allUsers.length}</span>
                </div>

                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center">
                  <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block">Administrators</span>
                  <span className="text-xl font-black text-amber-900 flex items-center justify-center gap-1">
                    <Crown className="w-4 h-4 text-amber-600" />
                    {totalAdmins}
                  </span>
                </div>

                <div className="bg-[#e8f5e9] p-3 rounded-xl border border-[#a0f4c8] text-center">
                  <span className="text-[10px] font-extrabold text-[#0e6c4a] uppercase tracking-wider block">Active Accounts</span>
                  <span className="text-xl font-black text-[#012d1d]">{totalActive}</span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-col sm:flex-row gap-2.5 justify-between items-center">
                {/* Search */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#717973]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search staff, email, role..."
                    className="w-full bg-white border border-[#c1c8c2] rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
                  />
                </div>

                {/* Filter Chips + Add Button */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="flex bg-[#f3f4f0] p-1 rounded-xl border border-[#e2e3df] gap-0.5">
                    {(['all', 'admin', 'active', 'inactive'] as const).map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFilterRole(f)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all cursor-pointer ${
                          filterRole === f ? 'bg-[#012d1d] text-white' : 'text-[#555d58] hover:text-[#012d1d]'
                        }`}
                      >
                        {f === 'admin' ? 'Admins' : f}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="bg-[#012d1d] hover:bg-[#0e6c4a] active:scale-95 text-white text-xs font-extrabold px-3.5 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4 text-[#a0f4c8]" />
                    <span>New Account</span>
                  </button>
                </div>
              </div>

              {/* Users List */}
              <div className="flex flex-col gap-2.5">
                {filteredUsers.length === 0 ? (
                  <div className="p-8 text-center bg-[#f9faf6] rounded-2xl border border-dashed border-[#c1c8c2]">
                    <UserX className="w-8 h-8 text-[#717973] mx-auto mb-2" />
                    <p className="text-sm font-bold text-[#414844]">No staff accounts found</p>
                    <p className="text-xs text-[#717973] mt-0.5">Try adjusting your search or add a new account.</p>
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const isPete = user.email.toLowerCase() === 'pete@maplelanenursery.com';
                    const isCurrent = user.email.toLowerCase() === currentUser.email.toLowerCase();

                    return (
                      <div
                        key={user.id}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                          user.isAdmin 
                            ? 'bg-amber-50/40 border-amber-200/80 shadow-2xs' 
                            : 'bg-white border-[#c1c8c2]/80 hover:border-[#0e6c4a]/50 shadow-2xs'
                        } ${user.status === 'inactive' ? 'opacity-60 bg-gray-50' : ''}`}
                      >
                        {/* User Info Column */}
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar
                            icon={user.avatarIcon}
                            color={user.avatarColor}
                            name={user.name}
                            isAdmin={user.isAdmin}
                            size="md"
                            showAdminBadge={true}
                          />

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-extrabold text-sm sm:text-base text-[#012d1d] truncate">
                                {user.name}
                              </h4>

                              {user.isAdmin && (
                                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                                  <Crown className="w-3 h-3" />
                                  Admin
                                </span>
                              )}

                              {isCurrent && (
                                <span className="text-[10px] font-bold uppercase bg-[#0e6c4a] text-white px-2 py-0.5 rounded-full">
                                  You
                                </span>
                              )}

                              {user.status === 'inactive' && (
                                <span className="text-[10px] font-bold uppercase bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                                  Inactive
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-[#555d58] font-medium truncate flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-[#717973]" />
                              <span>{user.email}</span>
                              <span className="text-[#c1c8c2]">•</span>
                              <span className="font-bold text-[#012d1d]">{user.role}</span>
                            </p>

                            {user.department && (
                              <p className="text-[11px] text-[#717973] truncate flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-[#717973]" />
                                <span>{user.department}</span>
                                {user.phone && <span>• {user.phone}</span>}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons Column */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 flex-wrap">
                          {/* Toggle Admin Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleAdminStatus(user)}
                            disabled={isPete}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                              user.isAdmin
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                                : 'bg-white hover:bg-amber-50 text-[#555d58] hover:text-amber-900 border-[#c1c8c2]'
                            }`}
                            title={
                              isPete 
                                ? 'Primary master admin cannot be changed' 
                                : user.isAdmin ? 'Revoke Administrator' : 'Assign Administrator'
                            }
                          >
                            <Crown className={`w-3.5 h-3.5 ${user.isAdmin ? 'text-amber-700' : 'text-[#717973]'}`} />
                            <span className="hidden md:inline">
                              {user.isAdmin ? 'Admin' : 'Make Admin'}
                            </span>
                          </button>

                          {/* Reset Password Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setPasswordResetUser(user);
                              setResetNewPassword('');
                            }}
                            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-[#f3f4f0] text-[#012d1d] border border-[#c1c8c2] transition-colors flex items-center gap-1 cursor-pointer"
                            title="Reset password for this user"
                          >
                            <Key className="w-3.5 h-3.5 text-[#0e6c4a]" />
                            <span className="hidden md:inline">Reset PW</span>
                          </button>

                          {/* Edit Details */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-[#f3f4f0] text-[#012d1d] border border-[#c1c8c2] transition-colors flex items-center gap-1 cursor-pointer"
                            title="Edit user details"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#0e6c4a]" />
                            <span className="hidden md:inline">Edit</span>
                          </button>

                          {/* Toggle Active / Inactive */}
                          {!isPete && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(user)}
                              className={`p-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                                user.status === 'active' 
                                  ? 'bg-white hover:bg-gray-100 text-[#555d58] border-[#c1c8c2]' 
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              }`}
                              title={user.status === 'active' ? 'Deactivate account' : 'Activate account'}
                            >
                              {user.status === 'active' ? <UserCheck className="w-3.5 h-3.5 text-[#0e6c4a]" /> : <UserX className="w-3.5 h-3.5 text-gray-500" />}
                            </button>
                          )}

                          {/* Delete Account */}
                          {!isPete && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmUser(user)}
                              className="p-1.5 rounded-xl text-xs font-bold bg-white hover:bg-rose-50 text-rose-700 border border-[#c1c8c2] hover:border-rose-300 transition-colors cursor-pointer"
                              title="Delete account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* Quick Password Reset Dialog Modal */}
          {passwordResetUser && (
            <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-[#c1c8c2] animate-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-[#e2e3df]">
                  <h4 className="font-extrabold text-sm text-[#012d1d] flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-[#0e6c4a]" />
                    Reset Password
                  </h4>
                  <button onClick={() => setPasswordResetUser(null)} className="text-[#717973] hover:text-[#1a1c1a]">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-[#555d58] mt-2">
                  Set a new password for <span className="font-bold text-[#012d1d]">{passwordResetUser.name}</span> ({passwordResetUser.email}):
                </p>

                <div className="relative mt-3">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#717973]" />
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-white border border-[#c1c8c2] rounded-xl pl-9 pr-9 py-2 text-sm font-semibold text-[#1a1c1a] focus:outline-none focus:border-[#012d1d]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#717973]"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setPasswordResetUser(null)}
                    className="px-3 py-1.5 text-xs font-bold text-[#555d58] hover:text-[#1a1c1a]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPasswordReset}
                    className="bg-[#012d1d] hover:bg-[#0e6c4a] text-white text-xs font-extrabold px-4 py-2 rounded-xl shadow-xs"
                  >
                    Save New Password
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirm Modal */}
          {deleteConfirmUser && (
            <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-rose-200 animate-in zoom-in-95">
                <div className="flex items-center gap-2 text-rose-700 font-extrabold text-sm mb-2">
                  <Trash2 className="w-5 h-5" />
                  <span>Delete User Account?</span>
                </div>
                <p className="text-xs text-[#555d58]">
                  Are you sure you want to permanently delete account for <span className="font-bold text-[#012d1d]">{deleteConfirmUser.name}</span> ({deleteConfirmUser.email})? This action cannot be undone.
                </p>

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmUser(null)}
                    className="px-3 py-1.5 text-xs font-bold text-[#555d58]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className="bg-rose-700 hover:bg-rose-800 text-white text-xs font-extrabold px-4 py-2 rounded-xl shadow-xs"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
