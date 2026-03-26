import ValidateTokenResponse from "@/app/models/ValidateTokenResponse";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function validateGoogleToken(token: string): Promise<ValidateTokenResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/validate`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (res.status === 401) {
        throw new Error("UNAUTHORIZED");
    }

    if (!res.ok) {
        throw new Error(`VALIDATION_FAILED_${res.status}`);
    }

    return (await res.json()) as ValidateTokenResponse;
}