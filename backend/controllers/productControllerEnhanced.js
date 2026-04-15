const { supabase } = require('../config/supabase');

// Get products with advanced search
const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 8,
      search,
      category,
      minPrice,
      maxPrice,
      sortBy = 'created_at',
      order = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);

    let query = supabase
      .from('products')
      .select('*', { count: 'exact' });

    // Advanced search functionality
    if (search && search.trim()) {
      const searchTerm = search.trim();
      
      // Use different search strategies based on query length
      if (searchTerm.length < 3) {
        // For very short queries, use basic LIKE search
        query = query.or(`name.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`);
      } else if (searchTerm.length < 6) {
        // For medium queries, use trigram similarity
        const { data: trigramResults, error: trigramError } = await supabase
          .rpc('search_products_trigram', {
            search_query: searchTerm,
            category_filter: category || null,
            min_price: minPrice ? parseFloat(minPrice) : null,
            max_price: maxPrice ? parseFloat(maxPrice) : null,
            limit_count: limitNum,
            offset_count: offsetNum
          });
        
        if (!trigramError && trigramResults) {
          // Get total count for pagination
          const { count } = await supabase
            .rpc('search_products_trigram', {
              search_query: searchTerm,
              category_filter: category || null,
              min_price: minPrice ? parseFloat(minPrice) : null,
              max_price: maxPrice ? parseFloat(maxPrice) : null,
              limit_count: 999999, // Get all for counting
              offset_count: 0
            });

          return res.json({
            products: trigramResults,
            pagination: {
              page: parseInt(page),
              limit: limitNum,
              total: count || 0,
              totalPages: Math.ceil((count || 0) / limitNum)
            },
            search: {
              query: searchTerm,
              type: 'trigram',
              results: trigramResults.length
            }
          });
        }
      } else {
        // For longer queries, use full-text search
        const { data: searchResults, error: searchError } = await supabase
          .rpc('search_products', {
            search_query: searchTerm,
            category_filter: category || null,
            min_price: minPrice ? parseFloat(minPrice) : null,
            max_price: maxPrice ? parseFloat(maxPrice) : null,
            limit_count: limitNum,
            offset_count: offsetNum
          });
        
        if (!searchError && searchResults) {
          // Get total count for pagination
          const { count } = await supabase
            .rpc('search_products', {
              search_query: searchTerm,
              category_filter: category || null,
              min_price: minPrice ? parseFloat(minPrice) : null,
              max_price: maxPrice ? parseFloat(maxPrice) : null,
              limit_count: 999999, // Get all for counting
              offset_count: 0
            });

          return res.json({
            products: searchResults,
            pagination: {
              page: parseInt(page),
              limit: limitNum,
              total: count || 0,
              totalPages: Math.ceil((count || 0) / limitNum)
            },
            search: {
              query: searchTerm,
              type: 'fulltext',
              results: searchResults.length
            }
          });
        }
      }
      
      // Fallback to basic search if advanced search fails
      query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`);
    }

    // Apply category filter
    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    // Apply price range filter
    if (minPrice) {
      query = query.gte('price', parseFloat(minPrice));
    }
    if (maxPrice) {
      query = query.lte('price', parseFloat(maxPrice));
    }

    // Apply stock filter (only show products with stock)
    query = query.gt('stock', 0);

    // Apply sorting
    const validSortFields = ['name', 'price', 'created_at', 'category', 'stock'];
    const validOrder = ['asc', 'desc'];
    
    if (validSortFields.includes(sortBy) && validOrder.includes(order)) {
      query = query.order(sortBy, { ascending: order === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data: products, error, count } = await query;

    if (error) throw error;

    res.json({
      products: products || [],
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum)
      },
      filters: {
        search: search || null,
        category: category || null,
        minPrice: minPrice || null,
        maxPrice: maxPrice || null
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

// Get search suggestions
const getSearchSuggestions = async (req, res) => {
  try {
    const { q: query } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.json({ suggestions: [] });
    }

    const { data: suggestions, error } = await supabase
      .rpc('get_search_suggestions', {
        partial_query: query.trim(),
        limit_count: 10
      });

    if (error) throw error;

    res.json({
      suggestions: suggestions || [],
      query: query.trim()
    });

  } catch (error) {
    console.error('Get search suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
};

// Get product by ID (unchanged)
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Product not found' });
      }
      throw error;
    }

    // Also get related products (same category, excluding current product)
    const { data: relatedProducts, error: relatedError } = await supabase
      .from('products')
      .select('*')
      .eq('category', product.category)
      .neq('id', id)
      .gt('stock', 0)
      .limit(4);

    res.json({
      product,
      relatedProducts: relatedProducts || []
    });

  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

// Admin functions (unchanged but with stock validation)
const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock, image_url } = req.body;

    // Validation
    if (!name || !description || !price || !category || stock === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (price < 0 || stock < 0) {
      return res.status(400).json({ error: 'Price and stock must be non-negative' });
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        name,
        description,
        price: parseFloat(price),
        category,
        stock: parseInt(stock),
        image_url: image_url || null
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(product);

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove invalid fields
    delete updates.id;
    delete updates.created_at;

    // Convert numeric fields
    if (updates.price !== undefined) {
      updates.price = parseFloat(updates.price);
    }
    if (updates.stock !== undefined) {
      updates.stock = parseInt(updates.stock);
    }

    const { data: product, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Product not found' });
      }
      throw error;
    }

    res.json(product);

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Product not found' });
      }
      throw error;
    }

    res.json({ message: 'Product deleted successfully' });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

module.exports = {
  getProducts,
  getSearchSuggestions,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
