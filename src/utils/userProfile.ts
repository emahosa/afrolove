
import { supabase } from "@/integrations/supabase/client";

export const enhanceUserWithProfileData = async (user: any) => {
  try {
    console.log("Enhancing user with profile data for:", user.id);
    
    // First try to get existing profile
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
      
    if (fetchError) {
      console.error("Error fetching profile:", fetchError);
      // Don't throw here, try to create profile instead
      console.log("Profile fetch failed, attempting to create new profile");
    }
    
    if (existingProfile) {
      console.log("Profile found:", existingProfile);
      return {
        ...user,
        name: existingProfile.full_name || user.user_metadata?.name || 'User',
        avatar: existingProfile.avatar_url || user.user_metadata?.avatar_url || '',
        credits: existingProfile.credits || 0,
        subscription: 'free' as const
      };
    }
    
    // Profile doesn't exist, create it
    console.log("Profile not found, creating a new one for user:", user.id);
    
    const newProfile = {
      id: user.id,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.name || 'User',
      username: user.email || user.user_metadata?.email || '',
      avatar_url: user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.user_metadata?.name || 'User')}&background=random`,
      credits: 5
    };
    
    console.log("Inserting new profile with data:", newProfile);
    
    const { data: insertedProfile, error: insertError } = await supabase
      .from('profiles')
      .insert(newProfile)
      .select()
      .single();
      
    if (insertError) {
      console.error("Error creating profile:", insertError);
      // Return user data without profile if creation fails
      console.log("Profile creation failed, returning user without profile data");
      return {
        ...user,
        name: user.user_metadata?.name || 'User',
        avatar: user.user_metadata?.avatar_url || '',
        credits: 0,
        subscription: 'free' as const
      };
    }
    
    console.log("Profile created successfully:", insertedProfile);
    
    return {
      ...user,
      name: insertedProfile.full_name || 'User',
      avatar: insertedProfile.avatar_url || '',
      credits: insertedProfile.credits || 0,
      subscription: 'free' as const
    };
    
  } catch (error) {
    console.error("Error enhancing user with profile data:", error);
    // Return basic user data if everything fails
    return {
      ...user,
      name: user.user_metadata?.name || 'User',
      avatar: user.user_metadata?.avatar_url || '',
      credits: 0,
      subscription: 'free' as const
    };
  }
};
