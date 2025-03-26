'use client';

import "../globals.css";





export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-black">
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
} 