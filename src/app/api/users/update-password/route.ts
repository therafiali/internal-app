import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
}

export async function POST(request: Request) {
  try {
    const { userId, newPassword } = await request.json();
    console.log('Received request to update password for user:', userId);

    // Validate input
    if (!userId || !newPassword) {
      console.log('Missing required fields:', { userId: !!userId, newPassword: !!newPassword });
      return NextResponse.json(
        { error: 'User ID and new password are required' },
        { status: 400 }
      );
    }

    // Initialize Supabase client for authentication
    const cookieStore = await cookies();
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('Invalid or missing authorization header');
      return NextResponse.json(
        { error: 'Invalid authorization header' },
        { status: 401 }
      );
    }

    // Client for authentication and user verification
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: { expires?: Date }) {
            cookieStore.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: { expires?: Date }) {
            cookieStore.delete(name);
          },
        },
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Verify the requester is an admin
    const {
      data: { user: currentUser },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Authentication failed: ' + authError.message },
        { status: 401 }
      );
    }

    if (!currentUser) {
      console.log('No current user found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the requester's role from the users table
    const { data: userData, error: userError } = await authClient
      .from('users')
      .select('department, role')
      .eq('id', currentUser.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json(
        { error: 'Failed to verify user permissions: ' + userError.message },
        { status: 403 }
      );
    }

    if (!userData) {
      console.log('No user data found for ID:', currentUser.id);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if the user is an admin
    if (userData.department !== 'Admin') {
      console.log('User is not an admin:', userData.department);
      return NextResponse.json(
        { error: 'Only administrators can update passwords' },
        { status: 403 }
      );
    }

    // Create admin client with service role key for password update
    const adminClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: { expires?: Date }) {
            cookieStore.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: { expires?: Date }) {
            cookieStore.delete(name);
          },
        },
      }
    );

    // Update the user's password using the admin client
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update password: ' + updateError.message },
        { status: 500 }
      );
    }

    console.log('Password updated successfully for user:', userId);
    return NextResponse.json(
      { message: 'Password updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in password update:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 