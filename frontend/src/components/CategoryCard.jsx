import React from 'react';
import { 
  Smartphone, 
  Shirt, 
  Home, 
  Watch, 
  Dumbbell, 
  Sparkles,
  ShoppingBag 
} from 'lucide-react';

const CategoryCard = ({ name, description, count, isActive, onClick }) => {
  // Get icon based on category name
  const getCategoryIcon = (categoryName) => {
    switch (categoryName) {
      case 'Electronics':
        return <Smartphone size={24} />;
      case 'Fashion':
        return <Shirt size={24} />;
      case 'Home appliances':
        return <Home size={24} />;
      case 'Accessories':
        return <Watch size={24} />;
      case 'Sports':
        return <Dumbbell size={24} />;
      case 'Beauty':
        return <Sparkles size={24} />;
      default:
        return <ShoppingBag size={24} />;
    }
  };

  // Get pastel color based on category
  const getCategoryColor = (categoryName) => {
    switch (categoryName) {
      case 'Electronics':
        return 'from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300';
      case 'Fashion':
        return 'from-pink-100 to-pink-200 hover:from-pink-200 hover:to-pink-300';
      case 'Home appliances':
        return 'from-green-100 to-green-200 hover:from-green-200 hover:to-green-300';
      case 'Accessories':
        return 'from-purple-100 to-purple-200 hover:from-purple-200 hover:to-purple-300';
      case 'Sports':
        return 'from-orange-100 to-orange-200 hover:from-orange-200 hover:to-orange-300';
      case 'Beauty':
        return 'from-rose-100 to-rose-200 hover:from-rose-200 hover:to-rose-300';
      default:
        return 'from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300';
    }
  };

  const activeColor = isActive ? 'ring-2 ring-indigo-500 ring-offset-2 scale-105 shadow-lg' : '';

  return (
    <div className="animate-fade-in">
      <button
        onClick={onClick}
        className={`
          relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 transform
          bg-gradient-to-br ${getCategoryColor(name)}
          hover:scale-105 hover:shadow-xl
          ${activeColor}
          min-h-[140px] w-full
        `}
      >
        <div className="relative z-10">
          {/* Icon */}
          <div className="mb-3 text-gray-700">
            {getCategoryIcon(name)}
          </div>
          
          {/* Category Name */}
          <h3 className="font-bold text-lg text-gray-800 mb-2">
            {name}
          </h3>
          
          {/* Description */}
          <p className="text-sm text-gray-600 leading-relaxed">
            {description}
          </p>
          
          {/* Product Count */}
          <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-white/50 text-xs font-semibold text-gray-700">
            {count} products
          </div>
        </div>
        
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/20 rounded-full -mr-10 -mt-10"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full -ml-8 -mb-8"></div>
      </button>
    </div>
  );
};

export default CategoryCard;
