import { supabase } from '@/lib/supabase';
export const fetchUserProfilePic = async (employeeCode: string) => {
    try {
      console.log('Fetching profile pic for employee code:', employeeCode);
      
      // First try exact match with employee_code
      let { data, error } = await supabase
        .from('users')
        .select('user_profile_pic')
        .eq('employee_code', employeeCode)
        .maybeSingle();
  
      if (error) {
        if (error.code === 'PGRST116') {
          // No results found with exact match, try without @domain.com
          const cleanEmployeeCode = employeeCode.split('@')[0];
          console.log('Trying with clean employee code:', cleanEmployeeCode);
          
          ({ data, error } = await supabase
            .from('users')
            .select('user_profile_pic')
            .eq('employee_code', cleanEmployeeCode)
            .maybeSingle());
            
          if (error) {
            console.error('Error fetching profile pic with clean code:', error);
            return null;
          }
        } else {
          console.error('Error fetching profile pic:', error);
          return null;
        }
      }
  console.log("data get image", data);
      return data?.user_profile_pic || null;
    } catch (error) {
      console.error('Error in fetchUserProfilePic:', error);
      return null;
    }
  };