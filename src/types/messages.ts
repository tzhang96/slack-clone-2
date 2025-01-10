import { User } from "@supabase/supabase-js";

export interface BaseMessage {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  user?: User;  // Joined user data
} 