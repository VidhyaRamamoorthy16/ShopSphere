import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { toast } from 'react-toastify';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();

  const handleAddToCart = (e) => {
    e.preventDefault();
    addToCart(product);
    toast.success(`${product.name} added to cart!`);
  };

  const productId = product.id || product._id;
  const imageSrc = product.image_url || product.image || `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80`;

  return (
    <Link
      to={`/product/${productId}`}
      className="group rounded-3xl shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full overflow-hidden border"
      style={{
        backgroundColor: 'var(--card-bg)',
        borderColor: 'var(--border-default)',
      }}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden" style={{ backgroundColor: 'var(--bg-muted)' }}>
        {product.image_url || product.image ? (
          <img
            src={imageSrc}
            alt={product.name}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm font-medium" style={{ color: 'var(--text-faint)' }}>
            No Image
          </div>
        )}

        {/* Sale Badge */}
        {product.price < 50 && (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
            Sale
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-bold text-indigo-500 bg-indigo-500/10 px-3 py-1 rounded-full uppercase tracking-wide">
            {product.category || 'general'}
          </span>
          <div className="flex items-center text-amber-400 text-xs font-bold gap-1">
            <Star size={14} fill="currentColor" />
            <span style={{ color: 'var(--text-muted)' }}>{product.rating || '4.5'}</span>
          </div>
        </div>

        <h3 className="font-bold text-lg mb-1 line-clamp-2" style={{ color: 'var(--text-primary)' }}>
          {product.name}
        </h3>

        <p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
          {product.description || 'A wonderful premium product crafted with excellence just for you.'}
        </p>

        <div className="mt-auto flex items-center justify-between border-t pt-4" style={{ borderColor: 'var(--border-default)' }}>
          <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            ${typeof product.price === 'number' ? product.price.toFixed(2) : product.price}
          </span>

          <button
            onClick={handleAddToCart}
            className="flex items-center justify-center btn-gradient w-10 h-10 p-0"
            title="Add to cart"
          >
            <ShoppingCart size={18} />
          </button>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
