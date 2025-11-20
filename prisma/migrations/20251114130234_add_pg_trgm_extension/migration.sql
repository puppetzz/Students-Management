DO $$
BEGIN
    -- Create extensions if not exists
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    CREATE EXTENSION IF NOT EXISTS unaccent;
    
    -- Create function if not exists
    CREATE OR REPLACE FUNCTION vietnamese_unaccent(text)
    RETURNS text AS $func$
    BEGIN
        RETURN lower(unaccent($1));
    END;
    $func$ LANGUAGE plpgsql IMMUTABLE;
    
    RAISE NOTICE 'Vietnamese search setup complete!';
END;
$$;