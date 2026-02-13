import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        // Initialize Supabase Admin Client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            console.error("Missing Supabase configuration");
            return NextResponse.json(
                { error: "Internal Server Error: Missing configuration" },
                { status: 500 }
            );
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // Verify the user is authenticated using the token from the request headers
        const headersList = await headers();
        const authorization = headersList.get("authorization");
        
        if (!authorization) {
            return NextResponse.json({ error: "Unauthorized: No token provided" }, { status: 401 });
        }

        // Extract token from "Bearer <token>"
        const token = authorization.replace('Bearer ', '').trim();
        
        // Use the admin client to verify the user token
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            console.error("Auth error:", authError);
            return NextResponse.json({ error: `Unauthorized: ${authError?.message || 'Invalid token'}` }, { status: 401 });
        }

        // Verify that the user is creating a patron for themselves
        // The body.email should match user.email
        if (body.email && body.email.toLowerCase() !== user.email?.toLowerCase()) {
             // Check if user is admin/librarian
             const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
                
             if (profile?.role !== 'admin' && profile?.role !== 'librarian') {
                return NextResponse.json(
                    { error: "Forbidden: You can only create a patron record for yourself." },
                    { status: 403 }
                );
             }
        }

        // Proceed to create patron using admin client (bypassing RLS)
        const { data, error } = await supabaseAdmin
            .from('patrons')
            .insert([body])
            .select()
            .single();

        if (error) {
            console.error("Supabase insert error:", error);
            return NextResponse.json(
                { error: error.message, details: error },
                { status: 400 }
            );
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error("API error:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
