import { createContext, useContext } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  return (
    <CartContext.Provider value={{}}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);