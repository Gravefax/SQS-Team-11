import LoginResponse from "@/app/models/LoginResponse";
import { loginWithGoogle as loginWithGoogleApi } from "@/app/api/auth";

export async function loginWithGoogle(idToken: string): Promise<LoginResponse> {
  return loginWithGoogleApi(idToken);
}

