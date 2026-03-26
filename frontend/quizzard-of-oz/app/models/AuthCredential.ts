import {GoogleCredentialResponse} from "@react-oauth/google";

export default interface AuthCredential {
    sub: string;
    email: string;
    credential: GoogleCredentialResponse;
}