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
      const existingItem = state.items.find(
        (item) => item.product_id === action.payload.product_id
      );
      if (existingItem) {
        existingItem.quantity += action.payload.quantity;
      } else {
        state.items.push(action.payload);
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
        item.quantity = action.payload.quantity;
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
  setCustomer,
  setDiscount,
  setTax,
  clearCart,
} = cartSlice.actions;

export default cartSlice.reducer;

