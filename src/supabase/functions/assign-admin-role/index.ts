import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Email es requerido' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Find user by email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers()
    
    if (userError) {
      throw userError
    }

    const user = userData.users.find(u => u.email === email)

    if (!user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Usuario con email ${email} no encontrado. Por favor regístrate primero.` 
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user already has admin role
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (existingRole) {
      // Update existing role to admin
      const { error: updateError } = await supabase
        .from('user_roles')
        .update({ role: 'admin' })
        .eq('user_id', user.id)

      if (updateError) {
        throw updateError
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Rol actualizado a admin para ${email}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Insert new admin role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'admin'
        })

      if (insertError) {
        throw insertError
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Rol de admin asignado a ${email}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error:', errorMessage)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
