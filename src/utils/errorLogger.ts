
import { supabase } from '@/integrations/supabase/client';

interface LogErrorOptions {
  message: string;
  context: string;
  error?: Error | unknown;
  details?: Record<string, unknown>;
}

export const logErrorToSupabase = async ({ message, context, error, details }: LogErrorOptions) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    let stack_trace;
    if (error instanceof Error) {
        stack_trace = error.stack;
    }

    // Also log to console for immediate debugging during development
    console.error(`[ERROR] Context: ${context} | Message: ${message}`, { error, details });

    const { error: logError } = await supabase.from('error_logs').insert({
      message,
      context,
      stack_trace,
      details,
      user_id: user?.id,
      level: 'error',
    });

    if (logError) {
      console.error('Failed to log error to Supabase:', logError);
    }
  } catch (e) {
    console.error('CRITICAL: Failed to execute logErrorToSupabase function itself.', e);
  }
};
