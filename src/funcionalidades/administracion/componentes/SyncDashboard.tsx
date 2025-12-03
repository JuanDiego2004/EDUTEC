import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { RefreshCw, CheckCircle2, AlertTriangle, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";

export function SyncDashboard() {
    const [syncing, setSyncing] = useState(false);
    const [lastSyncResult, setLastSyncResult] = useState<any[] | null>(null);

    const handleSync = async () => {
        try {
            setSyncing(true);
            toast.info("Iniciando sincronización de datos...");

            const response = await fetch('/api/admin/sync', { method: 'POST' });
            const data = await response.json();

            if (data.ok) {
                setLastSyncResult(data.detalles);
                toast.success("Sincronización completada exitosamente");
            } else {
                toast.error(`Error en sincronización: ${data.error}`);
            }
        } catch (error) {
            console.error("Error calling sync API:", error);
            toast.error("Error de conexión al intentar sincronizar");
        } finally {
            setSyncing(false);
        }
    };

    return (
        <Card className="w-full border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm mb-6">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-blue-100/50 dark:bg-blue-900/20">
                            <ArrowRightLeft className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                                Sincronización de Datos
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Sincroniza manualmente datos de Secundaria → Primaria tras recuperación
                            </p>
                        </div>
                    </div>

                    <Button
                        onClick={handleSync}
                        disabled={syncing}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {syncing ? (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Sincronizando...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Sincronizar Ahora
                            </>
                        )}
                    </Button>
                </div>
            </CardHeader>

            {lastSyncResult && (
                <CardContent>
                    <div className="mt-4 space-y-2">
                        <h4 className="text-sm font-medium mb-2">Resultados de última sincronización:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {lastSyncResult.map((res: any, idx: number) => (
                                <div key={idx} className={`p-2 rounded border text-xs flex justify-between items-center ${res.estado === 'ok'
                                    ? 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30'
                                    : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'
                                    }`}>
                                    <span className="font-medium capitalize">{res.tabla.replace('_', ' ')}</span>
                                    <div className="flex items-center gap-1">
                                        {res.estado === 'ok' ? (
                                            <>
                                                <span className="text-green-600 dark:text-green-400">{res.count} regs</span>
                                                <CheckCircle2 className="w-3 h-3 text-green-600" />
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-red-600 truncate max-w-[100px]" title={res.error}>Error</span>
                                                <AlertTriangle className="w-3 h-3 text-red-600" />
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
