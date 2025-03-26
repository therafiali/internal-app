import { theme } from '../styles/theme'

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card = ({ children, className = '' }: CardProps) => {
  return (
    <div className={`${theme.colors.background.card} ${theme.effects.glassmorphism} shadow-2xl rounded-lg border ${theme.colors.border.primary} ${className}`}>
      {children}
    </div>
  )
} 