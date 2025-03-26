import { EntType } from '@/supabase/types';
import { SupabaseClient } from '@supabase/supabase-js';

interface User {
  id?: string;
  name?: string;
  email?: string;
  department?: string;
  role?: string;
  ent_access?: EntType[];
}

/**
 * Converts ENT format between database format (ENT-1) and auth format (ENT1)
 */
export const convertEntFormat = {
  /**
   * Converts ENT1 format to ENT-1 format
   * @param ent - ENT value in ENT1 format
   * @returns ENT value in ENT-1 format
   */
  toDb: (ent: string) => {
    return ent.replace(/^(ENT)(\d)$/, '$1-$2');
  },

  /**
   * Converts ENT-1 format to ENT1 format
   * @param ent - ENT value in ENT-1 format
   * @returns ENT value in ENT1 format
   */
  toAuth: (ent: string) => {
    return ent.replace(/^(ENT)-(\d)$/, '$1$2');
  },

  /**
   * Converts array of ENTs from ENT1 format to ENT-1 format
   * @param ents - Array of ENTs in ENT1 format
   * @returns Array of ENTs in ENT-1 format
   */
  arrayToDb: (ents: (EntType | string)[]) => {
    return ents.map(ent => convertEntFormat.toDb(ent as string));
  },

  /**
   * Converts array of ENTs from ENT-1 format to ENT1 format
   * @param ents - Array of ENTs in ENT-1 format
   * @returns Array of ENTs in ENT1 format
   */
  arrayToAuth: (ents: string[]) => {
    return ents.map(ent => convertEntFormat.toAuth(ent));
  },

  /**
   * Checks if a user has access to a specific ENT
   * @param user - User object containing ent_access
   * @param teamCode - Team code in ENT-1 format
   * @returns boolean indicating if user has access
   */
  hasEntAccess: (user: User | null | undefined, teamCode: string) => {
    if (!user?.ent_access || !teamCode) return false;
    const authFormat = convertEntFormat.toAuth(teamCode);
    return user.ent_access.includes(authFormat as EntType);
  },

  /**
   * Gets user's ENT access in database format
   * @param user - User object containing ent_access
   * @returns Array of ENTs in ENT-1 format, or empty array if no access
   */
  getUserEntAccess: (user: User | null | undefined) => {
    if (!user?.ent_access) return [];
    return convertEntFormat.arrayToDb(user.ent_access);
  },

  /**
   * Formats user details with ENT access information
   * @param user - User object
   * @returns Formatted user details string
   */
  formatUserDetails: (user: User | null | undefined) => {
    if (!user) return 'No user details available';
    
    const details = [
      user.name && `Name: ${user.name}`,
      user.email && `Email: ${user.email}`,
      user.department && `Department: ${user.department}`,
      user.role && `Role: ${user.role}`,
      user.ent_access && `ENT Access: ${convertEntFormat.getUserEntAccess(user).join(', ')}`
    ].filter(Boolean);

    return details.join(' | ');
  },

  /**
   * Creates a Supabase query builder with ENT access filter
   * @param supabase - Supabase client instance
   * @param table - Table name to query
   * @param user - User object containing ent_access
   * @returns Supabase query builder with ENT access filter
   */
  createEntFilteredQuery: (
    supabase: SupabaseClient,
    table: string,
    user: User | null | undefined
  ) => {
    const query = supabase.from(table).select('*');
    
    if (!user?.ent_access || user.ent_access.length === 0) {
      // If no ENT access, return empty result by using impossible condition
      return query.filter('id', 'eq', '-1');
    }

    const entAccessWithHyphens = convertEntFormat.getUserEntAccess(user);
    return query.in('team_code', entAccessWithHyphens);
  }
}; 