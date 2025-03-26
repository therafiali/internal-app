import { theme } from '../styles/theme'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: 'primary' | 'secondary';
}

export const Button = ({ children, loading, variant = 'primary', className = '', ...props }: ButtonProps) => {
  const baseClasses = 'flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed'
  const variantClasses = variant === 'primary' 
    ? `bg-gradient-to-r ${theme.colors.button.primary} ${theme.effects.hover}`
    : 'bg-gray-600 hover:bg-gray-500'

  return (
    <button
      className={`${baseClasses} ${variantClasses} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-gray-100">Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  )
} 