import AuthConfig from "@/app/models/AuthConfig";

const authCredentials: AuthConfig = {
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
};

export default authCredentials;
