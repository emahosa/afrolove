
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { ProfileData, UserProfile } from "@/types/auth";
import { toast } from "sonner";

export const enhanceUserWithProfileData = async (baseUser: User): Promise<UserProfile> => {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', baseUser.id)
      .single();
      
    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      return {
        ...baseUser,
        name: baseUser.user_metadata?.name || baseUser.user_metadata?.full_name,
        avatar: baseUser.user_metadata?.avatar_url,
        credits: 0,
        subscription: 'free'
      };
    }

    const { data: voiceProfilesData } = await supabase
      .from('voice_clones')
      .select('*')
      .eq('user_id', baseUser.id);

    return {
      ...baseUser,
      name: profileData.full_name || baseUser.user_metadata?.name,
      avatar: profileData.avatar_url || baseUser.user_metadata?.avatar_url,
      credits: profileData.credits || 0,
      subscription: 'free',
      voiceProfiles: voiceProfilesData || []
    };
  } catch (error) {
    console.error("Error in enhanceUserWithProfileData:", error);
    return {
      ...baseUser,
      name: baseUser.user_metadata?.name || baseUser.user_metadata?.full_name,
      avatar: baseUser.user_metadata?.avatar_url,
      credits: 0,
      subscription: 'free'
    };
  }
};

