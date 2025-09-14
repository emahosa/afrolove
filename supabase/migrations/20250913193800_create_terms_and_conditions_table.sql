CREATE TABLE terms_and_conditions (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER terms_and_conditions_updated_at
BEFORE UPDATE ON terms_and_conditions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


ALTER TABLE terms_and_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON terms_and_conditions FOR SELECT USING (true);
CREATE POLICY "Allow admin write access" ON terms_and_conditions FOR ALL USING (public.is_admin(auth.uid()));

INSERT INTO terms_and_conditions (content) VALUES ('Please write the terms and conditions here.');
