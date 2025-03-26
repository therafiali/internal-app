import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtDecode } from "jwt-decode";
import { createClient } from '@supabase/supabase-js';

interface DecodedToken {
  role: string;
  department: string;
  exp: number;
  sub: string; // user id
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const path = request.nextUrl.pathname
  
  const isPublicPath = path === '/login' || path === '/logout'

  // Special handling for logout path
  if (path === '/logout') {
    // Always allow access to logout path
    return NextResponse.next()
  }

  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
 
  if (token) {
    try {
      const decoded = jwtDecode<DecodedToken>(token)
      
      // Check if token is expired
      if (decoded.exp * 1000 < Date.now()) {
        // Clear token cookie
        const response = NextResponse.redirect(new URL('/login', request.url))
        response.cookies.delete('token')
        
        return response
      }

      // Check user activity status
      const { data: userData, error } = await supabase
        .from('users')
        .select('user_activity')
        .eq('id', decoded.sub)
        .single();

      if (error || !userData?.user_activity) {
        // If there's an error or user is not active, clear token and redirect to login
        const response = NextResponse.redirect(new URL('/login', request.url))
        response.cookies.delete('token')
        return response
      }

      // Allow Admin users to access all paths
      if (decoded.department === 'Admin') {
        return NextResponse.next()
      }

      // For non-admin users, restrict access to their department paths
      const departmentPaths = {
        'Finance': '/main/finance',
        'Operations': '/main/operations',
        'Verification': '/main/verification',
        'Support': '/main/support'
      }

      const userDepartmentPath = departmentPaths[decoded.department as keyof typeof departmentPaths]
      
      // If user tries to access a path outside their department
      if (userDepartmentPath && !path.startsWith(userDepartmentPath)) {
        // Redirect to their department's default page
        return NextResponse.redirect(new URL(userDepartmentPath, request.url))
      }
    } catch (error) {
      // If token is invalid, clear it and redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('token')
      return response
    }
  }

  return NextResponse.next()
}

// Configure which paths the middleware will run on
export const config = {
  matcher: [
    '/main',
    '/login',
    '/logout',
    '/main/:path*',
    '/main/finance/:path*',
    '/main/verification/:path*',
    '/main/support/:path*'
  ]
} 