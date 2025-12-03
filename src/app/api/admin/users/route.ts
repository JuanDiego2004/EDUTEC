import { NextResponse } from "next/server";
import { eliminarUsuarioDual } from "@/servicios/autenticacion/usuarioDual";

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("id");

        if (!userId) {
            return NextResponse.json(
                { error: "User ID is required" },
                { status: 400 }
            );
        }

        
        const resultado = await eliminarUsuarioDual(userId);

        if (!resultado.success) {
            return NextResponse.json(
                {
                    error: resultado.error || "Error al eliminar usuario",
                    detalles: resultado.detalles
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Usuario eliminado de ambas bases de datos"
        });
    } catch (error: any) {
        console.error("Unexpected error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
