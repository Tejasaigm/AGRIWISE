// src/context/ProductsContext.jsx
// Shared product store used by both Farmer (CRUD) and Buyer (browse) pages.
import { createContext, useContext, useState } from 'react';

const ProductsContext = createContext(null);

const SEED_PRODUCTS = [
  { id: '1', name: 'Tomato', category: 'vegetables', price: 15, quantity: 500, location: 'Nizamabad, TG', description: 'Fresh farm tomatoes, Grade A quality. Grown without pesticides.', grade: 'A', qualityScore: 8.4, delivery: true, organic: true, farmerId: 'demo', farmerName: 'Raju Farmer', image: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=400&q=70', createdAt: Date.now() - 86400000 },
  { id: '2', name: 'Potato',  category: 'vegetables', price: 18, quantity: 1000, location: 'Agra, UP', description: 'Premium quality potatoes. Ideal for all culinary uses.', grade: 'B', qualityScore: 7.2, delivery: false, organic: false, farmerId: 'demo2', farmerName: 'Suresh Kumar', image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=70', createdAt: Date.now() - 172800000 },
  { id: '3', name: 'Onion',   category: 'vegetables', price: 22, quantity: 800, location: 'Nashik, MH', description: 'Red onions, freshly harvested. Strong aroma and flavor.', grade: 'A', qualityScore: 9.1, delivery: true, organic: false, farmerId: 'demo3', farmerName: 'Priya Devi', image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400&q=70', createdAt: Date.now() - 3600000 },
  { id: '4', name: 'Rice',    category: 'grains',     price: 35, quantity: 2000, location: 'Ludhiana, PB', description: 'Basmati rice, long grain, aromatic. Premium quality.', grade: 'A', qualityScore: 9.5, delivery: true, organic: true, farmerId: 'demo4', farmerName: 'Gurpreet Singh', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=70', createdAt: Date.now() - 7200000 },
  { id: '5', name: 'Wheat',   category: 'grains',     price: 25, quantity: 5000, location: 'Amritsar, PB', description: 'Hard wheat variety, ideal for chapati and bread.', grade: 'B', qualityScore: 8.0, delivery: true, organic: false, farmerId: 'demo5', farmerName: 'Harjit Kaur', image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=70', createdAt: Date.now() - 10800000 },
  { id: '6', name: 'Banana',  category: 'fruits',     price: 32, quantity: 300, location: 'Hyderabad, TG', description: 'Robusta bananas, ripe and sweet. Ready to eat.', grade: 'A', qualityScore: 8.8, delivery: true, organic: true, farmerId: 'demo6', farmerName: 'Lakshmi Reddy', image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&q=70', createdAt: Date.now() - 14400000 },
];

export function ProductsProvider({ children }) {
  const [products, setProducts] = useState(() => {
    try { const s = localStorage.getItem('agriwise_products'); return s ? JSON.parse(s) : SEED_PRODUCTS; }
    catch { return SEED_PRODUCTS; }
  });

  const save = (updated) => {
    setProducts(updated);
    localStorage.setItem('agriwise_products', JSON.stringify(updated));
  };

  const addProduct = (product) => {
    const next = [{ ...product, id: Date.now().toString(), createdAt: Date.now() }, ...products];
    save(next);
  };

  const updateProduct = (id, changes) => {
    save(products.map(p => p.id === id ? { ...p, ...changes } : p));
  };

  const deleteProduct = (id) => save(products.filter(p => p.id !== id));

  const getByFarmer = (farmerId) => products.filter(p => p.farmerId === farmerId);

  return (
    <ProductsContext.Provider value={{ products, addProduct, updateProduct, deleteProduct, getByFarmer }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error('useProducts must be inside <ProductsProvider>');
  return ctx;
}
