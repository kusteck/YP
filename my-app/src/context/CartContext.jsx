import { createContext, useReducer, useEffect } from "react";

export const CartContext = createContext();

const initialState = {
  items: JSON.parse(localStorage.getItem("cart") || "[]"),
};

function cartReducer(state, action) {
  switch (action.type) {
    case "add": {
      const existing = state.items.find((i) => i.service_id === action.payload.service_id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.service_id === action.payload.service_id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return { items: [...state.items, { ...action.payload, quantity: 1 }] };
    }
    case "inc":
      return {
        items: state.items.map((i, idx) =>
          idx === action.payload ? { ...i, quantity: i.quantity + 1 } : i
        ),
      };
    case "dec":
      return {
        items: state.items
          .map((i, idx) =>
            idx === action.payload ? { ...i, quantity: i.quantity - 1 } : i
          )
          .filter((i) => i.quantity > 0),
      };
    case "remove":
      return { items: state.items.filter((_, i) => i !== action.payload) };
    case "clear":
      return { items: [] };
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(state.items));
  }, [state.items]);

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
}