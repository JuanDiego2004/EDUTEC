import { NextRequest, NextResponse } from 'next/server';
import { crearUsuarioDual } from '@/servicios/autenticacion/usuarioDual';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, password, role, metadata } = body;

        
        if (!email || !password || !role) {
            return NextResponse.json(
                { error: 'Email, password y role son requeridos' },
                { status: 400 }
            );
        }

        
        const resultado = await crearUsuarioDual({
            email,
            password,
            role,
            metadata
        });

        if (!resultado.success) {
            return NextResponse.json(
                { error: resultado.error, detalles: resultado.detalles },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            userId: resultado.userId,
            message: 'Usuario creado en ambas bases de datos'
        });

    } catch (error) {
        console.error('Error en API crear-usuario-dual:', error);
        return NextResponse.json(
            { error: (error as Error).message },
            { status: 500 }
        );
    }
}
