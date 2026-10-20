import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

const uiSlice = createSlice({
  name: "ui",
  initialState: { compactTables: false },
  reducers: {
    setCompactTables(state, action: PayloadAction<boolean>) {
      state.compactTables = action.payload;
    },
  },
});
export const { setCompactTables } = uiSlice.actions;
export default uiSlice.reducer;
