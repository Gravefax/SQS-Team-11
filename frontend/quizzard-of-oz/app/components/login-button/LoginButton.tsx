"use client";

import {GoogleCredentialResponse, GoogleLogin, GoogleOAuthProvider} from "@react-oauth/google";
import authConfig from "@/auth.config";
import { loginWithGoogle } from "@/app/lib/auth/authActions";
import useAuthStore from "@/app/stores/authStore";
import AuthCredential from "@/app/models/AuthCredential";


export default function LoginButton() {
    const clientId = authConfig.clientId;
    const authStore = useAuthStore();

    const toCredential = (result: { email?: string; username?: string; expires_at?: number }): AuthCredential => ({
        email: result.email,
        username: result.username ?? result.email,
        expiresAt: result.expires_at,
    });

    const handleLoginSuccess = async (credentialResponse: GoogleCredentialResponse) => {
        const idToken = credentialResponse.credential;

        if (!idToken) {
            console.error("No token provided");
            return;
        }

        try {
            const result = await loginWithGoogle(idToken);
            authStore.setCredential(toCredential(result));
        } catch (err) {
            if (err instanceof Error && err.message === "UNAUTHORIZED") {
                console.error("Token ungueltig oder abgelaufen");
                return;
            }

            console.error("Login fehlgeschlagen", err);
        }
    };
    
    const handleLoginError = () => {
        console.error("Google Login fehlgeschlagen");
    };
    
    return (
        <GoogleOAuthProvider clientId={clientId}>
            <GoogleLogin onSuccess={handleLoginSuccess} onError={handleLoginError}></GoogleLogin>
        </GoogleOAuthProvider>
    );
}