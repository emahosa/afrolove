
-- Create genre_templates table
CREATE TABLE IF NOT EXISTS public.genre_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  genre_id UUID REFERENCES public.genres(id) ON DELETE CASCADE NOT NULL,
  template_name TEXT NOT NULL,
  admin_prompt VARCHAR(100) NOT NULL,
  user_prompt_guide VARCHAR(99),
  audio_url TEXT,
  cover_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Add RLS policies for genre_templates
ALTER TABLE public.genre_templates ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
DROP POLICY IF EXISTS "Admins can manage genre templates" ON public.genre_templates;
CREATE POLICY "Admins can manage genre templates"
ON public.genre_templates
FOR ALL
USING (has_role('admin'::user_role));

-- Anyone can view active templates
DROP POLICY IF EXISTS "Anyone can view active genre templates" ON public.genre_templates;
CREATE POLICY "Anyone can view active genre templates"
ON public.genre_templates
FOR SELECT
USING (is_active = true);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_genre_templates_genre_id ON public.genre_templates(genre_id);
CREATE INDEX IF NOT EXISTS idx_genre_templates_active ON public.genre_templates(is_active);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS handle_updated_at_genre_templates ON public.genre_templates;
CREATE TRIGGER handle_updated_at_genre_templates
BEFORE UPDATE ON public.genre_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
