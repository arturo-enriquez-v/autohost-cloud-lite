import { generateEnrollmentTokenBackend } from "@/lib/features/enrollments/fetch/enrollment.server";
import { getAccessTokenFromCookie } from "@/lib/cookies";
import { EnrollmentTokenResponse } from "@/lib/types/enrollment";
import { NextResponse } from "next/server";


export async function POST(req: Request) {
    const accessToken = await getAccessTokenFromCookie();

    if (!accessToken) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }
    try {
        const res = await generateEnrollmentTokenBackend(accessToken);

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ error: "Unknown error" }));   
            return NextResponse.json(errorData, { status: res.status });
        }

        const enrollmentTokenResponse: EnrollmentTokenResponse = await res.json();
        console.log("[ENROLLMENT TOKEN] Generated token:", enrollmentTokenResponse.token.substring(0, 20) + "...");
        return NextResponse.json(enrollmentTokenResponse, { status: 200 });

    } catch (error) {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
