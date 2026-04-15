require('dotenv').config();
const supabase = require('./config/supabase');

const sampleProducts = [
  // Electronics
  { name: 'Sony WH-1000XM5', description: 'Industry-leading noise-canceling headphones with 30-hour battery life and exceptional sound quality.', price: 349, category: 'Electronics', stock: 100, image_url: 'https://m.media-amazon.com/images/I/61+btxzpfDL._SX679_.jpg' },
  { name: 'Samsung Galaxy S24 Ultra', description: 'Android flagship with S Pen, incredible zoom, and premium design with titanium frame.', price: 1199, category: 'Electronics', stock: 60, image_url: 'https://m.media-amazon.com/images/I/71Sa3dq6XGL._SX679_.jpg' },
  { name: 'Apple MacBook Air M2', description: 'Thin, light, and powerful laptop with the M2 chip for everyday productivity.', price: 1199, category: 'Electronics', stock: 30, image_url: 'https://m.media-amazon.com/images/I/71f5Eu5lJSL._SX679_.jpg' },
  { name: 'boAt Airdopes 141', description: 'True wireless earbuds with 42 hours playback, ENx technology, and ASAP charge.', price: 49, category: 'Electronics', stock: 150, image_url: 'https://m.media-amazon.com/images/I/61KNJav3S9L._SX679_.jpg' },
  { name: 'Canon EOS 1500D DSLR', description: '24.1MP DSLR camera with 18-55mm lens, perfect for beginners and photography enthusiasts.', price: 499, category: 'Electronics', stock: 25, image_url: 'https://m.media-amazon.com/images/I/914hFeTU2-L._SX679_.jpg' },
  { name: 'Fastrack Reflex Beat Smartwatch', description: 'Smart fitness band with heart rate monitor, sleep tracking, and 10-day battery life.', price: 79, category: 'Electronics', stock: 85, image_url: 'https://m.media-amazon.com/images/I/61epn29QG0L._SX679_.jpg' },
  { name: 'Apple iPad Air 5', description: 'Supercharged by M1 chip. Perfect for creative professionals and productivity.', price: 699, category: 'Electronics', stock: 45, image_url: 'https://m.media-amazon.com/images/I/61XZQXFQeVL._SX679_.jpg' },
  { name: 'Kindle Paperwhite', description: 'Waterproof e-reader with 6.8-inch display, adjustable warm light, and weeks of battery life.', price: 139, category: 'Electronics', stock: 100, image_url: 'https://m.media-amazon.com/images/I/61k5r6z2hOL._SX679_.jpg' },

  // Fashion
  { name: 'Nike Air Max 270', description: 'Iconic lifestyle running shoes with Max Air cushioning for all-day comfort and style.', price: 129, category: 'Fashion', stock: 80, image_url: 'https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/air-max-270-shoes-KkLcGR.png' },
  { name: 'Adidas Ultraboost 22', description: 'Premium running shoes with Boost midsole technology for ultimate energy return.', price: 149, category: 'Fashion', stock: 65, image_url: 'https://assets.adidas.com/images/w_600,f_auto,q_auto/ultraboost-22-shoes.jpg' },
  { name: 'Premium Leather Jacket', description: 'Timeless style and superior craftmanship with high-quality lambskin leather.', price: 299, category: 'Fashion', stock: 40, image_url: 'https://images.unsplash.com/photo-1551698618-1d4ce0e2b923?w=800' },
  { name: 'Classic White Sneakers', description: 'Minimalist and versatile footwear designed for everyday comfort.', price: 89, category: 'Fashion', stock: 120, image_url: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800' },
  { name: 'Denim Trucker Jacket', description: 'The essential layer for any casual outfit. Durable and stylish.', price: 129, category: 'Fashion', stock: 65, image_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800' },
  { name: 'Slim-Fit Chinos', description: 'Versatile trousers that transition perfectly from office to evening.', price: 79, category: 'Fashion', stock: 80, image_url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800' },
  { name: 'Silk Floral Dress', description: 'Elegant and lightweight dress perfect for garden parties or summer nights.', price: 159, category: 'Fashion', stock: 35, image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800' },
  { name: 'Wool Winter Coat', description: 'Luxurious merino wool coat for ultimate warmth and sophisticated style.', price: 399, category: 'Fashion', stock: 30, image_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800' },

  // Accessories
  { name: 'Handcrafted Men\'s Watch', description: 'Mechanical timepiece with a sapphire crystal and premium leather strap.', price: 450, category: 'Accessories', stock: 25, image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800' },
  { name: 'Polarized Sunglasses', description: 'Classic aesthetic with modern lens technology for ultimate UV protection.', price: 120, category: 'Accessories', stock: 90, image_url: 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=800' },
  { name: 'Canvas Laptop Backpack', description: 'Weather-resistant and spacious backpack for the modern commuter.', price: 95, category: 'Accessories', stock: 110, image_url: 'https://images.unsplash.com/photo-1553062407-98eeb94c6a62?w=800' },
  { name: 'Minimalist Card Holder', description: 'Full-grain leather wallet for those who prefer to travel light.', price: 45, category: 'Accessories', stock: 150, image_url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800' },
  { name: 'Silver Cuff Bracelet', description: 'Understated elegance in sterling silver. A perfect everyday piece.', price: 110, category: 'Accessories', stock: 55, image_url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800' },
  { name: 'Leather Belt', description: 'Genuine leather belt with classic buckle for timeless style.', price: 75, category: 'Accessories', stock: 85, image_url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800' },
  { name: 'Wool Scarf', description: 'Premium merino wool scarf for cold weather elegance and comfort.', price: 65, category: 'Accessories', stock: 70, image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800' },
  { name: 'Silk Pocket Square', description: 'Luxurious silk pocket square with classic patterns for formal occasions.', price: 35, category: 'Accessories', stock: 120, image_url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800' },

  // Home Appliances
  { name: 'Instant Pot Duo', description: '7-in-1 multi-functional cooker with pressure cooking, slow cooking, and more.', price: 89, category: 'Home appliances', stock: 50, image_url: 'https://m.media-amazon.com/images/I/71WtwEvYDOS._SX679_.jpg' },
  { name: 'Smart Coffee Maker', description: 'Start your day with perfect brew controlled from your smartphone.', price: 199, category: 'Home appliances', stock: 45, image_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800' },
  { name: 'Air Purifier Pro', description: 'Advanced filtration system for a healthier and cleaner home environment.', price: 299, category: 'Home appliances', stock: 20, image_url: 'https://images.unsplash.com/photo-1585771724684-252702b6443e?w=800' },
  { name: 'Robot Vacuum Cleaner', description: 'Self-emptying and intelligent mapping for effortless floor cleaning.', price: 499, category: 'Home appliances', stock: 30, image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800' },
  { name: 'Vitamix Blender', description: 'High-performance blender for smoothies, soups, and more.', price: 399, category: 'Home appliances', stock: 60, image_url: 'https://images.unsplash.com/photo-1585233116534-1925359a9307?w=800' },
  { name: 'Dyson Airwrap', description: 'Complete hair styling tool for curls, waves, and smoothing without extreme heat.', price: 599, category: 'Home appliances', stock: 15, image_url: 'https://images.unsplash.com/photo-1522338140262-f46f5912034a?w=800' },
  { name: 'Smart Thermostat', description: 'WiFi-enabled thermostat for energy efficiency and remote control.', price: 249, category: 'Home appliances', stock: 40, image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800' },
  { name: 'Electric Kettle', description: 'Rapid-boil kettle with temperature control for perfect tea and coffee.', price: 79, category: 'Home appliances', stock: 80, image_url: 'https://images.unsplash.com/photo-1578662996442-39f463855e83?w=800' },

  // Sports & Fitness
  { name: 'Boldfit Yoga Mat', description: 'Extra-thick eco-friendly yoga mat with superior grip and cushioning.', price: 35, category: 'Sports', stock: 95, image_url: 'https://m.media-amazon.com/images/I/71z6Jc2nTAL._SX679_.jpg' },
  { name: 'Running Shoes Pro', description: 'Lightweight performance running shoes with advanced cushioning technology.', price: 129, category: 'Sports', stock: 70, image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800' },
  { name: 'Fitness Tracker', description: 'Advanced fitness band with heart rate monitoring and GPS tracking.', price: 99, category: 'Sports', stock: 85, image_url: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800' },
  { name: 'Dumbbells Set', description: 'Adjustable dumbbell set from 5 to 50 pounds for home workouts.', price: 199, category: 'Sports', stock: 35, image_url: 'https://images.unsplash.com/photo-1515347619252-e60f5d4108d3?w=800' },
  { name: 'Foam Roller', description: 'High-density foam roller for muscle recovery and flexibility training.', price: 29, category: 'Sports', stock: 110, image_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800' },
  { name: 'Resistance Bands Set', description: 'Professional-grade resistance bands for full-body strength training.', price: 39, category: 'Sports', stock: 125, image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800' },
  { name: 'Jump Rope Pro', description: 'Speed jump rope with ball bearings for cardio fitness.', price: 25, category: 'Sports', stock: 150, image_url: 'https://images.unsplash.com/photo-1576678927484-cc9089510b30?w=800' },
  { name: 'Exercise Ball', description: 'Anti-burst stability ball for core strengthening and balance training.', price: 35, category: 'Sports', stock: 95, image_url: 'https://images.unsplash.com/photo-1599901860903-17e6ed7083a0?w=800' },

  // Beauty & Personal Care
  { name: 'Lakme Absolute Matte Lipstick', description: 'Long-lasting matte lipstick with intense color payoff and creamy texture.', price: 25, category: 'Beauty', stock: 110, image_url: 'https://m.media-amazon.com/images/I/61cJ0fU6GLL._SX679_.jpg' },
  { name: 'Skincare Set Deluxe', description: 'Complete 5-piece skincare routine with natural ingredients for glowing skin.', price: 89, category: 'Beauty', stock: 65, image_url: 'https://images.unsplash.com/photo-1556228723-3a07f2c39e59?w=800' },
  { name: 'Perfume Collection', description: 'Set of 3 premium fragrances for different occasions and moods.', price: 149, category: 'Beauty', stock: 40, image_url: 'https://images.unsplash.com/photo-1522338140262-f46f5912034a?w=800' },
  { name: 'Hair Care Kit', description: 'Professional salon-quality hair care products for all hair types.', price: 69, category: 'Beauty', stock: 75, image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800' },
  { name: 'Makeup Brush Set', description: 'Professional 24-piece makeup brush set for flawless application.', price: 45, category: 'Beauty', stock: 90, image_url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800' },
  { name: 'Electric Toothbrush', description: 'Sonic toothbrush with multiple cleaning modes and pressure sensor.', price: 79, category: 'Beauty', stock: 80, image_url: 'https://images.unsplash.com/photo-1608614710744-3a1b1b3b5b1f?w=800' },
  { name: 'Face Serum Vitamin C', description: 'Brightening vitamin C serum for radiant and youthful skin.', price: 55, category: 'Beauty', stock: 110, image_url: 'https://images.unsplash.com/photo-1556228723-3a07f2c39e59?w=800' },
  { name: 'Hair Dryer Professional', description: 'Ionic hair dryer with multiple heat settings for salon results at home.', price: 89, category: 'Beauty', stock: 70, image_url: 'https://images.unsplash.com/photo-1620916566398-6f785f87b540?w=800' },

  // Books & Toys
  { name: 'Atomic Habits', description: 'Bestselling book by James Clear on building good habits and breaking bad ones.', price: 16, category: 'Books', stock: 200, image_url: 'https://m.media-amazon.com/images/I/81wgcld4wxL._SY522_.jpg' },
  { name: 'Lego Technic Porsche', description: 'Advanced LEGO set featuring detailed Porsche 911 RSR model with moving parts.', price: 179, category: 'Toys', stock: 30, image_url: 'https://m.media-amazon.com/images/I/81vR9h8vK5L._SX679_.jpg' }
];

async function seedProducts() {
  console.log('Seeding products...');
  
  // Clean sweep of products
  const { error: deleteError } = await supabase
    .from('products')
    .delete()
    .neq('name', 'DO_NOT_DELETE_ME'); 

  if (deleteError) {
    console.error('Error clearing products:', deleteError);
    return;
  }

  const { data, error } = await supabase
    .from('products')
    .insert(sampleProducts)
    .select();

  if (error) {
    console.error('Error seeding products:', error);
  } else {
    console.log(`Success! Inserted ${data.length} products.`);
  }
}

seedProducts();
