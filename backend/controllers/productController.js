const supabase = require('../config/supabase');

// 1. GET /products (with Pagination, Search, Filter, Sort)
exports.getProducts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      category = '', 
      sortBy = 'created_at', 
      order = 'desc' 
    } = req.query;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('products')
      .select('*', { count: 'exact' });

    // --- Search ---
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // --- Filter ---
    if (category) {
      query = query.eq('category', category);
    }

    // --- Sort ---
    query = query.order(sortBy, { ascending: order === 'asc' });

    // --- Pagination ---
    const { data, count, error } = await query.range(from, to);

    if (error) throw error;

    res.json({
      products: data,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. GET /products/:id
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. POST /products (Admin only - handled by middleware later)
exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, category, image_url, stock } = req.body;
    const { data, error } = await supabase
      .from('products')
      .insert([{ name, description, price, category, image_url, stock }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. PUT /products/:id (Admin only)
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, image_url, stock } = req.body;
    
    const { data, error } = await supabase
      .from('products')
      .update({ name, description, price, category, image_url, stock })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 5. DELETE /products/:id (Admin only)
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
