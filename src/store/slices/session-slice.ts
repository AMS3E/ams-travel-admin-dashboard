import { createSlice } from "@reduxjs/toolkit";

/**
 * Whether the back-office session has run out. Any call that answers 401 sets
 * it: the access token in the HttpOnly cookie is no longer accepted, so the
 * shell sends the person to sign in again and back to the page they were on,
 * rather than leaving every screen to fail on its own.
 *
 * Who is signed in is not kept here: `auth/me` (RTK Query) and the server
 * render that, from the token and Spring's `/users/me`.
 */
interface SessionState {
  readonly expired: boolean;
}

const initialState: SessionState = { expired: false };

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    sessionExpired() {
      return { expired: true };
    },
  },
  selectors: {
    selectSessionExpired: (state) => state.expired,
  },
});

export const { sessionExpired } = sessionSlice.actions;
export const { selectSessionExpired } = sessionSlice.selectors;
export default sessionSlice.reducer;
