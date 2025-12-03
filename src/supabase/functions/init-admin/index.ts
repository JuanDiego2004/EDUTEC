import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'

Deno.serve(async (req) => {
  try {
    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const adminEmail = 'admin@gmail.com'
    const adminPassword = 'admin'

    // Check if admin user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const adminExists = existingUsers?.users.some(user => user.email === adminEmail)

    if (adminExists) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Usuario admin ya existe' 
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create admin user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    })

    if (authError) {
      throw authError
    }

    if (!authData.user) {
      throw new Error('No se pudo crear el usuario')
    }

    // Insert admin role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'admin'
      })

    if (roleError) {
      throw roleError
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: authData.user.id
      })

    if (profileError) {
      throw profileError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Usuario admin creado exitosamente',
        email: adminEmail,
        password: adminPassword
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        status: 400,
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  }
})
