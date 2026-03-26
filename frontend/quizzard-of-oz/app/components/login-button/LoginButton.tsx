"use client";

import {GoogleCredentialResponse, GoogleLogin, GoogleOAuthProvider} from "@react-oauth/google";
import authConfig from "@/auth.config";


export default function LoginButton() {
    const clientId = authConfig.clientId;
    
    const handleLoginSuccess = (credentialResponse: GoogleCredentialResponse)=> {
        
    }
    
    const handleLoginError = ()=> {
    }
    
    return (
        <GoogleOAuthProvider clientId={clientId}>
            <GoogleLogin onSuccess={handleLoginSuccess} onError={handleLoginError}></GoogleLogin>
        </GoogleOAuthProvider>
    );
}