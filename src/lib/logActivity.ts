import Cookies from 'js-cookie';
import { ActivityLogPayload } from '@/types/activity';

export const logActivity = async (data: ActivityLogPayload) => {
  try {
    const token = Cookies.get('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Ensure we have the complete API URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      throw new Error('API URL is not configured');
    }

    // Ensure the URL ends with a slash before appending the endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/logs/activity`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,

        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Activity log response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Failed to log activity: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error logging activity:', {
      error,
      data,
      apiUrl: process.env.NEXT_PUBLIC_API_URL
    });
    throw error;
  }
}; 