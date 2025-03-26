interface BadgeProps {
  text: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md' | 'lg';
}

const Badge: React.FC<BadgeProps> = ({ text, variant = 'default', size = 'sm' }) => {
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-full";
  
  const variantClasses = {
    default: "bg-gray-500/10 text-gray-400",
    success: "bg-green-500/10 text-green-500",
    warning: "bg-yellow-500/10 text-yellow-500",
    danger: "bg-red-500/10 text-red-500",
    info: "bg-blue-500/10 text-blue-500",
    purple: "bg-purple-500/10 text-purple-500"
  };

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-2.5 py-1.5 text-sm",
    lg: "px-3 py-2 text-base"
  };

  return (
    <span className={`
      ${baseClasses} 
      ${variantClasses[variant]} 
      ${sizeClasses[size]}
    `}>
      {text}
    </span>
  );
}; 