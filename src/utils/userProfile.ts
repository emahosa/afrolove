
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "@/types/auth";

export const enhanceUserWithProfileData = async (user: User): Promise<UserProfile> => {
  try {
    console.log("Enhancing user with profile data for:", user.id);
    
    if (!user || !user.id) {
      console.error("Invalid user object provided to enhanceUserWithProfileData");
      throw new Error("Failed to fetch user profile");
    }
    
    // First, try to get the user profile
    let { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    
    // Check if we got the profile or need to create one
    if (error) {
      console.error("Error fetching user profile:", error);
      throw error;
    }
    
    // If profile doesn't exist, create one
    if (!profile) {
      console.log("Profile not found, creating a new one for user:", user.id);
      
      const newProfileData = {
        id: user.id,
        full_name: user.user_metadata?.name || user.user_metadata?.full_name || "User",
        username: user.email,
        avatar_url: user.user_metadata?.avatar_url,
        credits: 5 // Default starting credits
      };
      
      console.log("Inserting new profile with data:", newProfileData);
      
      const { data: newProfile, error: insertError } = await supabase
        .from("profiles")
        .insert(newProfileData)
        .select("*")
        .single();
        
      if (insertError) {
        console.error("Error creating profile:", insertError);
        throw new Error("Failed to create user profile");
      }
      
      console.log("Created new profile successfully:", newProfile);
      profile = newProfile;
    } else {
      console.log("Found existing profile for user:", user.id);
    }
    
    // Create an enhanced user object with profile data
    const enhancedUser: UserProfile = {
      ...user,
      // Map full_name to name since that's what's in the profiles table
      name: profile.full_name || user.user_metadata?.name || user.user_metadata?.full_name || "User",
      avatar: profile.avatar_url || user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.user_metadata?.name || "User")}&background=random`,
      credits: profile.credits || 0,
      subscription: "free" // Default to free since subscription isn't in the profile table
    };
    
    console.log("Enhanced user data:", enhancedUser);
    return enhancedUser;
  } catch (error) {
    console.error("Error enhancing user with profile data:", error);
    throw new Error("Failed to fetch user profile");
  }
};
