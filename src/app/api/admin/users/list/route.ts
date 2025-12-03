import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export async function GET() {
    try {
        
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

      
        const { data, error } = await supabaseAdmin.auth.admin.listUsers();

        if (error) {
            console.error("Error listing users:", error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        
        return NextResponse.json({
            users: data.users.map(user => ({
                id: user.id,
                email: user.email,
                created_at: user.created_at
            }))
        });
    } catch (error: any) {
        console.error("Unexpected error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
