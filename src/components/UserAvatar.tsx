import React from 'react';
import { 
  Crown, 
  Sprout, 
  Trees, 
  Flower2, 
  Leaf, 
  ShieldCheck, 
  Sun, 
  Tractor, 
  Truck, 
  Wrench, 
  Scissors, 
  Droplets, 
  Compass, 
  Star, 
  Heart, 
  User as UserIcon,
  Shield
} from 'lucide-react';

interface UserAvatarProps {
  icon?: string;
  color?: string;
  name?: string;
  isAdmin?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showAdminBadge?: boolean;
  className?: string;
  borderClass?: string;
}

export const renderAvatarIconElement = (iconKey?: string, iconSizeClass = 'w-4 h-4') => {
  switch (iconKey) {
    case 'crown':
      return <Crown className={iconSizeClass} />;
    case 'sprout':
      return <Sprout className={iconSizeClass} />;
    case 'tree':
      return <Trees className={iconSizeClass} />;
    case 'flower':
      return <Flower2 className={iconSizeClass} />;
    case 'leaf':
      return <Leaf className={iconSizeClass} />;
    case 'shield':
      return <ShieldCheck className={iconSizeClass} />;
    case 'sun':
      return <Sun className={iconSizeClass} />;
    case 'tractor':
      return <Tractor className={iconSizeClass} />;
    case 'truck':
      return <Truck className={iconSizeClass} />;
    case 'wrench':
      return <Wrench className={iconSizeClass} />;
    case 'scissors':
      return <Scissors className={iconSizeClass} />;
    case 'droplets':
      return <Droplets className={iconSizeClass} />;
    case 'compass':
      return <Compass className={iconSizeClass} />;
    case 'star':
      return <Star className={iconSizeClass} />;
    case 'heart':
      return <Heart className={iconSizeClass} />;
    case 'user':
    default:
      return <UserIcon className={iconSizeClass} />;
  }
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  icon = 'sprout',
  color = '#0e6c4a',
  name = 'Staff',
  isAdmin = false,
  size = 'md',
  showAdminBadge = false,
  className = '',
  borderClass = 'border-white/20'
}) => {
  const sizeMap = {
    xs: { box: 'w-6 h-6', icon: 'w-3.5 h-3.5', text: 'text-[10px]', badge: 'w-2.5 h-2.5' },
    sm: { box: 'w-8 h-8', icon: 'w-4 h-4', text: 'text-xs', badge: 'w-3 h-3' },
    md: { box: 'w-10 h-10', icon: 'w-5 h-5', text: 'text-sm', badge: 'w-3.5 h-3.5' },
    lg: { box: 'w-14 h-14', icon: 'w-7 h-7', text: 'text-lg', badge: 'w-4.5 h-4.5' },
    xl: { box: 'w-20 h-20', icon: 'w-10 h-10', text: 'text-2xl', badge: 'w-6 h-6' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  // Fallback initial if icon is not defined
  const initials = name
    .split(' ')
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div
        className={`${currentSize.box} rounded-full flex items-center justify-center text-white font-extrabold shadow-sm border ${borderClass} transition-transform select-none`}
        style={{ backgroundColor: color || '#0e6c4a' }}
        title={`${name}${isAdmin ? ' (Administrator)' : ''}`}
      >
        {icon ? renderAvatarIconElement(icon, currentSize.icon) : <span>{initials}</span>}
      </div>

      {showAdminBadge && isAdmin && (
        <span 
          className="absolute -top-1 -right-1 bg-amber-400 text-amber-950 rounded-full p-0.5 shadow-xs border border-white flex items-center justify-center"
          title="System Administrator"
        >
          <Crown className={currentSize.badge} />
        </span>
      )}
    </div>
  );
};
