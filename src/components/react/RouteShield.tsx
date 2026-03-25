import { getShieldUrlFromString } from '@/lib/shields';

interface RouteShieldProps {
  route: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-5 w-auto',
  md: 'h-8 w-auto',
  lg: 'h-10 w-auto',
};

export function RouteShield({ route, size = 'md', className = '' }: RouteShieldProps) {
  const shieldUrl = getShieldUrlFromString(route);

  if (!shieldUrl) return null;

  return (
    <img
      src={shieldUrl}
      alt={`${route} shield`}
      className={`inline-block flex-shrink-0 ${sizeClasses[size]} ${className}`}
      loading="lazy"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}
