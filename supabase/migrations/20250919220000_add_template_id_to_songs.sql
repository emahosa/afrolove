ALTER TABLE songs
ADD COLUMN template_id UUID REFERENCES genre_templates(id) ON DELETE SET NULL;
