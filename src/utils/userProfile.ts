
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "@/types/auth";

export const enhanceUserWithProfileData = async (user: User): Promise<UserProfile> => {
  try {
    console.log("Enhancing user with profile data for:", user.id);
    
    // Instead of using .single() which throws an error when no row is found,
    // we'll use maybeSingle() and handle the case gracefully
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching user profile:", error);
    }
    
    // Create an enhanced user object with profile data if available
    const enhancedUser: UserProfile = {
      ...user,
      name: profile?.name || user.user_metadata?.name || user.user_metadata?.full_name || "User",
      avatar: profile?.avatar_url || user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.user_metadata?.name || "User")}&background=random`,
      credits: profile?.credits || 0,
      subscription: profile?.subscription || "free"
    };
    
    console.log("Enhanced user data:", enhancedUser);
    return enhancedUser;
  } catch (error) {
    console.error("Error enhancing user with profile data:", error);
    
    // Return a default enhanced user if there was an error
    return {
      ...user,
      name: user.user_metadata?.name || user.user_metadata?.full_name || "User",
      avatar: user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.user_metadata?.name || "User")}&background=random`,
      credits: 0,
      subscription: "free"
    };
  }
};
