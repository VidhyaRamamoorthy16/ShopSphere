-- Enable pg_trgm extension for trigram similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index for trigram search on products
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_description_trgm ON products USING GIN (description gin_trgm_ops);

-- Create tsvector column for full-text search
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector
CREATE TRIGGER update_product_search_vector_trigger
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

-- Create GIN index for tsvector search
CREATE INDEX IF NOT EXISTS idx_products_search_vector ON products USING GIN (search_vector);

-- Update existing products with search vectors
UPDATE products SET 
  name = name, 
  description = description, 
  category = category;

-- Create function for advanced product search
CREATE OR REPLACE FUNCTION search_products(
  search_query TEXT,
  category_filter TEXT DEFAULT NULL,
  min_price DECIMAL DEFAULT NULL,
  max_price DECIMAL DEFAULT NULL,
  limit_count INT DEFAULT 20,
  offset_count INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  price DECIMAL,
  category TEXT,
  stock INT,
  image_url TEXT,
  created_at TIMESTAMPTZ,
  search_rank REAL,
  similarity_score REAL
) AS $$
DECLARE
  ts_query_value tsvector;
BEGIN
  -- Convert search query to tsvector
  ts_query_value := to_tsvector('english', search_query);
  
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.category,
    p.stock,
    p.image_url,
    p.created_at,
    ts_rank(p.search_vector, ts_query_value) as search_rank,
    similarity(p.name, search_query) as similarity_score
  FROM products p
  WHERE 
    -- Full-text search on search_vector
    p.search_vector @@ ts_query_value
    
    -- Optional category filter
    AND (category_filter IS NULL OR p.category = category_filter)
    
    -- Optional price range filter
    AND (min_price IS NULL OR p.price >= min_price)
    AND (max_price IS NULL OR p.price <= max_price)
    
    -- Only show products with stock
    AND p.stock > 0
  ORDER BY 
    search_rank DESC,
    similarity_score DESC,
    p.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Create function for simple trigram search (faster for short queries)
CREATE OR REPLACE FUNCTION search_products_trigram(
  search_query TEXT,
  category_filter TEXT DEFAULT NULL,
  min_price DECIMAL DEFAULT NULL,
  max_price DECIMAL DEFAULT NULL,
  limit_count INT DEFAULT 20,
  offset_count INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  price DECIMAL,
  category TEXT,
  stock INT,
  image_url TEXT,
  created_at TIMESTAMPTZ,
  similarity_score REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.category,
    p.stock,
    p.image_url,
    p.created_at,
    GREATEST(
      similarity(p.name, search_query),
      similarity(p.description, search_query),
      similarity(p.category, search_query)
    ) as similarity_score
  FROM products p
  WHERE 
    -- Trigram similarity search (good for partial matches and typos)
    (similarity(p.name, search_query) > 0.1 OR 
     similarity(p.description, search_query) > 0.1 OR
     similarity(p.category, search_query) > 0.3)
    
    -- Optional category filter
    AND (category_filter IS NULL OR p.category = category_filter)
    
    -- Optional price range filter
    AND (min_price IS NULL OR p.price >= min_price)
    AND (max_price IS NULL OR p.price <= max_price)
    
    -- Only show products with stock
    AND p.stock > 0
  ORDER BY 
    similarity_score DESC,
    p.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Create function for auto-complete suggestions
CREATE OR REPLACE FUNCTION get_search_suggestions(
  partial_query TEXT,
  limit_count INT DEFAULT 10
)
RETURNS TABLE (
  suggestion TEXT,
  category TEXT,
  product_count INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DISTINCT 
    CASE 
      WHEN similarity(p.name, partial_query) > 0.3 THEN p.name
      WHEN similarity(p.category, partial_query) > 0.5 THEN p.category
      ELSE LEFT(p.name, LENGTH(partial_query) + 10)
    END as suggestion,
    p.category,
    COUNT(*) OVER (PARTITION BY p.category) as product_count
  FROM products p
  WHERE 
    (similarity(p.name, partial_query) > 0.1 OR 
     similarity(p.category, partial_query) > 0.3)
    AND p.stock > 0
  ORDER BY 
    similarity_score DESC,
    product_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
