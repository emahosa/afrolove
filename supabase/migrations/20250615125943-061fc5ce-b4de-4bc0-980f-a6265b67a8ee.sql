
-- Create a table for error logging
CREATE TABLE public.error_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    level TEXT NOT NULL DEFAULT 'error',
    message TEXT NOT NULL,
    stack_trace TEXT,
    context TEXT,
    details JSONB,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Add comments to describe the columns
COMMENT ON COLUMN public.error_logs.level IS 'Log level, e.g., ''error'', ''warning'', ''info''.';
COMMENT ON COLUMN public.error_logs.context IS 'The location where the error occurred, e.g., Edge Function name or Component name.';
COMMENT ON COLUMN public.error_logs.details IS 'A JSON object for additional structured data about the error.';
COMMENT ON COLUMN public.error_logs.user_id IS 'The ID of the user associated with the error, if any.';

-- Enable Row Level Security
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Create policy that allows anyone to insert logs.
CREATE POLICY "Allow public insert for error logs"
ON public.error_logs
FOR INSERT
WITH CHECK (true);

-- Create policy for admins to see all logs.
CREATE POLICY "Admins can view all error logs"
ON public.error_logs
FOR SELECT
USING (public.is_current_user_admin());

-- Create policy for users to see their own logs.
CREATE POLICY "Users can view their own error logs"
ON public.error_logs
FOR SELECT
USING (auth.uid() = user_id);
