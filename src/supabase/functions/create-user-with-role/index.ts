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
    const { email, password, role, profesor_id, estudiante_id } = await req.json()

    if (!email || !password || !role) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Email, contraseña y rol son requeridos' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Validate that profesor_id is provided for teacher role
    if (role === 'teacher' && !profesor_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Debe proporcionar un profesor_id para el rol de profesor' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Validate that estudiante_id is provided for student role
    if (role === 'student' && !estudiante_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Debe proporcionar un estudiante_id para el rol de estudiante' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate role
    const validRoles = ['admin', 'teacher', 'student']
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Rol inválido' 
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

    console.log('Creating user with email:', email, 'and role:', role)

    // Create user with admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      console.error('Auth error:', authError)
      throw authError
    }

    if (!authData.user) {
      throw new Error('No se pudo crear el usuario')
    }

    console.log('User created:', authData.user.id)

    // Insert user role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: role
      })

    if (roleError) {
      console.error('Role error:', roleError)
      throw roleError
    }

    console.log('Role assigned:', role)

    // Create profile with linked profesor_id or estudiante_id
    const profileData: any = {
      user_id: authData.user.id
    }
    
    if (role === 'teacher' && profesor_id) {
      profileData.profesor_id = profesor_id
    }
    
    if (role === 'student' && estudiante_id) {
      profileData.estudiante_id = estudiante_id
    }
    
    const { error: profileError } = await supabase
      .from('profiles')
      .insert(profileData)

    if (profileError) {
      console.error('Profile error:', profileError)
      throw profileError
    }

    console.log('Profile created with links:', profileData)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Usuario ${email} creado exitosamente como ${role}`,
        user_id: authData.user.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error creating user:', errorMessage)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        message: 'Error al crear usuario'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
