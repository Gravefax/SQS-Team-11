"use client";

import {GoogleCredentialResponse, GoogleLogin, GoogleOAuthProvider} from "@react-oauth/google";
import authConfig from "@/auth.config";
import {validateGoogleToken} from "@/app/api/auth";
import useAuthStore from "@/app/stores/authStore";


export default function LoginButton() {
    const clientId = authConfig.clientId;
    const authStore = useAuthStore();

    const handleLoginSuccess = async (credentialResponse: GoogleCredentialResponse) => {
        const token = credentialResponse.credential;
        
        if (!token) {
            console.error("No token provided");
            return;
        }

        try {
            const result = await validateGoogleToken(token);

            if (!result.valid) {
                console.error("Token invalid");
                return;
            }
            
            authStore.setCredential({
                sub: result.sub!,
                email: result.email!,
                credential: credentialResponse
            });
        } catch (err) {
            if (err instanceof Error && err.message === "UNAUTHORIZED") {
                console.error("Token ungueltig oder abgelaufen");
                return;
            }
            console.error("Validierung fehlgeschlagen", err);
        }
    };
    
    const handleLoginError = ()=> {
    }
    
    return (
        <GoogleOAuthProvider clientId={clientId}>
            <GoogleLogin onSuccess={handleLoginSuccess} onError={handleLoginError}></GoogleLogin>
        </GoogleOAuthProvider>
    );
}