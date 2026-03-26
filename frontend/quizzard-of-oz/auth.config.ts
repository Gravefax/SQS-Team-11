import AuthCredentials from "@/app/models/authCredentials";

const authCredentials: AuthCredentials = {
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
};

export default authCredentials;
