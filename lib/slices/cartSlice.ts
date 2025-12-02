import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface CartItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  stock_quantity: number;
}

interface CartState {
  items: CartItem[];
  customerId?: number;
  discount: number;
  tax: number;
}

const initialState: CartState = {
  items: [],
  customerId: undefined,
  discount: 0,
  tax: 0,
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<CartItem>) => {
      const existingItemIndex = state.items.findIndex(
        (item) => item.product_id === action.payload.product_id
      );
      if (existingItemIndex !== -1) {
        // Item exists: update quantity and move to top
        const existingItem = state.items[existingItemIndex];
        existingItem.quantity += action.payload.quantity;
        // Remove from current position and add to beginning
        state.items.splice(existingItemIndex, 1);
        state.items.unshift(existingItem);
      } else {
        // New item: add to beginning (top of cart)
        state.items.unshift(action.payload);
      }
    },
    removeItem: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter(
        (item) => item.product_id !== action.payload
      );
    },
    updateQuantity: (
      state,
      action: PayloadAction<{ product_id: number; quantity: number }>
    ) => {
      const item = state.items.find(
        (item) => item.product_id === action.payload.product_id
      );
      if (item) {
        item.quantity = Math.max(0.01, action.payload.quantity); // Ensure minimum 0.01
      }
    },
    updatePrice: (
      state,
      action: PayloadAction<{ product_id: number; price: number }>
    ) => {
      const item = state.items.find(
        (item) => item.product_id === action.payload.product_id
      );
      if (item) {
        item.price = action.payload.price;
      }
    },
    setCustomer: (state, action: PayloadAction<number | undefined>) => {
      state.customerId = action.payload;
    },
    setDiscount: (state, action: PayloadAction<number>) => {
      state.discount = action.payload;
    },
    setTax: (state, action: PayloadAction<number>) => {
      state.tax = action.payload;
    },
    clearCart: (state) => {
      state.items = [];
      state.customerId = undefined;
      state.discount = 0;
      state.tax = 0;
    },
  },
});

export const {
  addItem,
  removeItem,
  updateQuantity,
  updatePrice,
  setCustomer,
  setDiscount,
  setTax,
  clearCart,
} = cartSlice.actions;

export default cartSlice.reducer;
