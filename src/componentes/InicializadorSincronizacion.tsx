/**
 * Inicializador de sincronización automática
 * 
 * Este archivo configura el callback que se ejecuta automáticamente
 * cuando se detecta que la base de datos primaria se ha recuperado
 */

'use client';

import { useEffect } from 'react';
import { registrarCallbackRecuperacion } from '@/servicios/base-datos/supabaseConRespaldo';

export function InicializadorSincronizacion() {
    useEffect(() => {
        // Registrar callback que se ejecuta cuando la primaria se recupera
        registrarCallbackRecuperacion(async (timestampFailover: Date) => {
            console.log('Ejecutando sincronización automática...');
            console.log(`⏰ Failover ocurrió en: ${timestampFailover.toISOString()}`);

            try {
                // Llamar al endpoint de sincronización
                const response = await fetch('/api/sync-recovery', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        desde: timestampFailover.toISOString()
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log(' Sincronización automática completada:', data);

                    // Opcional: Mostrar notificación al usuario
                    if (data.totalNuevos > 0) {
                        console.log(` ${data.totalNuevos} registros sincronizados desde secundaria`);
                    }
                } else {
                    console.error('Error en sincronización automática:', await response.text());
                }
            } catch (error) {
                console.error('Error ejecutando sincronización automática:', error);
            }
        });

        console.log(' Sistema de sincronización automática inicializado');
    }, []);

    return null; // Este componente no renderiza nada
}
