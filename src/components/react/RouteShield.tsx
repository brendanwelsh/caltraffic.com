interface RouteShieldProps {
  route: string;
  className?: string;
}

export function RouteShield({ route, className = '' }: RouteShieldProps) {
  const shieldUrl = `https://shields.caltranscameras.app/${route}.svg`;

  return (
    <img
      src={shieldUrl}
      alt={`${route} shield`}
      className={`inline-block h-6 w-auto ${className}`}
      loading="lazy"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}
