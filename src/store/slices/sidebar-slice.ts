import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

const sidebarSlice = createSlice({
  name: "sidebar",
  initialState: {
    collapsed: false,
    mobileOpen: false,
    /**
     * Groups the person opened or closed themselves, by title. A group they
     * have not touched is open only while it holds the current page, so the
     * sidebar shows where you are and stays short everywhere else.
     */
    groups: {} as Record<string, boolean>,
  },
  reducers: {
    toggleSidebar(state) {
      state.collapsed = !state.collapsed;
    },
    setMobileOpen(state, action: PayloadAction<boolean>) {
      state.mobileOpen = action.payload;
    },
    setGroupOpen(state, action: PayloadAction<{ readonly title: string; readonly open: boolean }>) {
      state.groups[action.payload.title] = action.payload.open;
    },
  },
});
export const { toggleSidebar, setMobileOpen, setGroupOpen } =
  sidebarSlice.actions;
export default sidebarSlice.reducer;
