CREATE TABLE IF NOT EXISTS public.content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    author_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add a trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_content_updated_at
BEFORE UPDATE ON public.content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to published content
CREATE POLICY "Allow public read access for published content"
ON public.content
FOR SELECT
USING (status = 'published');

-- Policy: Allow admin users to manage all content
CREATE POLICY "Allow admins full access to content"
ON public.content
FOR ALL
USING (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
))
WITH CHECK (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
));

-- Add comments to the table and columns for clarity
COMMENT ON TABLE public.content IS 'Stores content for the CMS, like articles, tutorials, and announcements.';
COMMENT ON COLUMN public.content.author_id IS 'The user ID of the admin who authored the content.';
