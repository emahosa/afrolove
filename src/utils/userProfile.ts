
import { supabase } from "@/integrations/supabase/client";

console.log("✅ userProfile utility loaded - WILL ONLY USE: profiles table, NO USERS");

export const enhanceUserWithProfileData = async (user: any) => {
  try {
    console.log("🔄 userProfile: enhanceUserWithProfileData() - ONLY profiles table, NO USERS");
    console.log("UserProfile: Enhancing user with profile data for:", user.id);
    
    console.log('🔍 About to query supabase.from("profiles") - ABSOLUTELY NO USERS TABLE');
    
    // First try to get existing profile - PROFILES TABLE ONLY
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    console.log('✅ Successfully queried profiles table, no users table referenced');
      
    if (fetchError) {
      console.error("UserProfile: Error fetching profile:", fetchError);
    }
    
    if (existingProfile) {
      console.log("UserProfile: Profile found:", existingProfile);
      return {
        ...user,
        name: existingProfile.full_name || user.user_metadata?.name || 'User',
        avatar: existingProfile.avatar_url || user.user_metadata?.avatar_url || '',
        credits: existingProfile.credits || 0,
        subscription: 'free' as const
      };
    }
    
    // Profile doesn't exist, return basic user data
    console.log("UserProfile: No profile found, returning basic user data");
    return {
      ...user,
      name: user.user_metadata?.name || 'User',
      avatar: user.user_metadata?.avatar_url || '',
      credits: 0,
      subscription: 'free' as const
    };
    
  } catch (error) {
    console.error("UserProfile: Error enhancing user with profile data:", error);
    return {
      ...user,
      name: user.user_metadata?.name || 'User',
      avatar: user.user_metadata?.avatar_url || '',
      credits: 0,
      subscription: 'free' as const
    };
  }
};
