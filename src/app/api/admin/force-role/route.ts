import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
    try {
        const { email } = await request.json();
        const targetEmail = typeof email === "string" ? email.trim() : "";
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
        const allowedEmail = process.env.ADMIN_BOOTSTRAP_EMAIL || "";

        if (!supabaseUrl || !serviceRoleKey || !allowedEmail) {
            return NextResponse.json(
                { error: "Missing bootstrap configuration." },
                { status: 500 }
            );
        }

        if (!targetEmail || targetEmail.toLowerCase() !== allowedEmail.toLowerCase()) {
            return NextResponse.json(
                { error: "Email not allowed for bootstrap." },
                { status: 403 }
            );
        }

        const adminClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const { data: listData, error: listError } = await adminClient.auth.admin.listUsers({
            page: 1,
            perPage: 1000
        });
        if (listError || !listData?.users?.length) {
            return NextResponse.json(
                { error: "Auth user not found." },
                { status: 404 }
            );
        }

        const user = listData.users.find(
            (item) => item.email?.toLowerCase() === targetEmail.toLowerCase()
        );
        if (!user) {
            return NextResponse.json(
                { error: "Auth user not found." },
                { status: 404 }
            );
        }
        const displayName = user.user_metadata?.full_name || user.user_metadata?.display_name || "";

        const { error: upsertError } = await adminClient
            .from("profiles")
            .upsert(
                {
                    id: user.id,
                    email: user.email,
                    display_name: displayName,
                    role: "admin"
                },
                { onConflict: "id" }
            );

        if (upsertError) {
            return NextResponse.json(
                { error: upsertError.message },
                { status: 500 }
            );
        }

        await adminClient
            .from("profiles")
            .delete()
            .eq("email", targetEmail)
            .neq("id", user.id);

        return NextResponse.json({ success: true, userId: user.id });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
