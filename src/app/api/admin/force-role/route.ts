import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
    try {
        const { email, fullName } = await request.json();
        const targetEmail = typeof email === "string" ? email.trim() : "";
        const targetFullName = typeof fullName === "string" ? fullName.trim() : "";
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
        const allowedEmail = (
            process.env.ADMIN_BOOTSTRAP_EMAIL ||
            process.env.NEXT_PUBLIC_ADMIN_BOOTSTRAP_EMAIL ||
            process.env.NEXT_PUBLIC_ADMIN_EMAIL ||
            ""
        ).trim();

        const missingConfig: string[] = [];
        if (!supabaseUrl) missingConfig.push("NEXT_PUBLIC_SUPABASE_URL");
        if (!serviceRoleKey) missingConfig.push("SUPABASE_SERVICE_ROLE_KEY");
        if (!allowedEmail) missingConfig.push("ADMIN_BOOTSTRAP_EMAIL / NEXT_PUBLIC_ADMIN_BOOTSTRAP_EMAIL / NEXT_PUBLIC_ADMIN_EMAIL");

        if (missingConfig.length > 0) {
            return NextResponse.json(
                { error: "Missing bootstrap configuration.", missing: missingConfig },
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
        if (listError) {
            return NextResponse.json(
                { error: listError.message || "Failed to list users." },
                { status: 500 }
            );
        }

        let user = listData?.users?.find(
            (item) => item.email?.toLowerCase() === targetEmail.toLowerCase()
        );
        let tempPassword: string | null = null;

        if (!user) {
            tempPassword = randomBytes(12).toString("base64url");
            const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
                email: targetEmail,
                password: tempPassword,
                email_confirm: true,
                user_metadata: targetFullName ? { full_name: targetFullName } : {}
            });

            if (createError || !createData?.user) {
                return NextResponse.json(
                    { error: createError?.message || "Failed to create auth user." },
                    { status: 500 }
                );
            }

            user = createData.user;
        }

        const displayName =
            targetFullName ||
            user.user_metadata?.full_name ||
            user.user_metadata?.display_name ||
            "";

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

        // Ensure they have a record in the staff table (as required for library administration)
        const staffId = "ST" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + Math.floor(Math.random() * 1000).toString().padStart(3, "0");
        const firstName = displayName.split(" ")[0] || "";
        const lastName = displayName.split(" ").slice(1).join(" ") || "";

        await adminClient
            .from("staff")
            .upsert(
                {
                    id: user.id,
                    staff_id: staffId,
                    email: user.email,
                    first_name: firstName,
                    last_name: lastName
                },
                { onConflict: "id" }
            );

        // Remove any patron duplicate records for the bootstrapped user
        await adminClient
            .from("patrons")
            .delete()
            .eq("email", targetEmail);

        await adminClient
            .from("profiles")
            .delete()
            .eq("email", targetEmail)
            .neq("id", user.id);

        return NextResponse.json({
            success: true,
            userId: user.id,
            created: !!tempPassword,
            tempPassword: tempPassword || undefined
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
