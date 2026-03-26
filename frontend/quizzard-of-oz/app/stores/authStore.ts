import { create } from "zustand";
import AuthStoreState from "@/app/models/AuthStoreState";

const useAuthStore = create<AuthStoreState>((set, get) => ({
    credential: null,
    setCredential: (authCredential) => set({ credential: authCredential }),
    getCredential: () => get().credential,
}));

export default useAuthStore;
