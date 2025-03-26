// import { theme } from '../styles/theme'

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export const PageLayout = ({ children, title }: PageLayoutProps) => {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {title && (
        <div className="text-center py-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
            {title}
          </h1>
          <div className="flex items-center justify-center mt-2">
            <div className="h-1 w-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transform hover:scale-110 transition-transform duration-300"></div>
          </div>
        </div>
      )}
      {children}
    </div>
  )
} 