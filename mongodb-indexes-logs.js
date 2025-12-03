/**
 * Script de Configuración de Índices para Sistema de Logs
 * Base de datos: reyna_de_la_paz
 * Colección: logs
 * 
 * INSTRUCCIONES:
 * 1. Conectarse a MongoDB
 * 2. Seleccionar la base de datos: use reyna_de_la_paz
 * 3. Ejecutar este script completo
 */

// ============================================
// ÍNDICES COMPUESTOS OPTIMIZADOS
// ============================================

print(" Creando índices para la colección 'logs'...\n");

// 1. Índice principal: Búsqueda por rol + módulo + fecha
//    Uso: Queries más comunes del sistema
db.logs.createIndex(
  {
    "usuario.rol": 1,
    "accion.modulo": 1,
    "fechaHora": -1
  },
  {
    name: "idx_rol_modulo_fecha",
    background: true
  }
);
print("✓ Índice creado: rol + módulo + fecha");

// 2. Índice de usuario: Auditoría por usuario específico
//    Uso: Ver todas las acciones de un usuario
db.logs.createIndex(
  {
    "usuario.id": 1,
    "fechaHora": -1
  },
  {
    name: "idx_usuario_fecha",
    background: true
  }
);
print("✓ Índice creado: usuario + fecha");

// 3. Índice de módulo: Análisis por módulo
//    Uso: Estadísticas y reportes por módulo
db.logs.createIndex(
  {
    "accion.modulo": 1,
    "fechaHora": -1
  },
  {
    name: "idx_modulo_fecha",
    background: true
  }
);
print("✓ Índice creado: módulo + fecha");

// 4. Índice de errores: Detección de fallos
//    Uso: Monitoreo de errores del sistema
db.logs.createIndex(
  {
    "accion.exitoso": 1,
    "fechaHora": -1
  },
  {
    name: "idx_exitoso_fecha",
    background: true
  }
);
print("✓ Índice creado: exitoso + fecha");

// 5. Índice de tipo de acción: Análisis por operación
//    Uso: Estadísticas de CRUDs
db.logs.createIndex(
  {
    "accion.tipo": 1,
    "accion.modulo": 1,
    "fechaHora": -1
  },
  {
    name: "idx_tipo_modulo_fecha",
    background: true
  }
);
print("✓ Índice creado: tipo + módulo + fecha");

// ============================================
// ÍNDICE TTL (Time To Live)
// ============================================

// 6. TTL Index: Limpieza automática de logs antiguos
//    Configurado para eliminar logs después de 2 años (730 días)
//    Ajustar expireAfterSeconds según necesidades de retención
db.logs.createIndex(
  { "creadoEn": 1 },
  {
    name: "idx_ttl_limpieza",
    expireAfterSeconds: 63072000,  // 2 años = 730 días * 24h * 60m * 60s
    background: true
  }
);
print("✓ Índice TTL creado: limpieza automática después de 2 años");

// ============================================
// VERIFICACIÓN
// ============================================

print("\n📋 Índices creados en la colección 'logs':");
printjson(db.logs.getIndexes());

print("\n Estadísticas de la colección:");
printjson(db.logs.stats());

print("\n Configuración de índices completada exitosamente!");

// ============================================
// QUERIES DE EJEMPLO
// ============================================

print("\n📚 Ejemplos de queries optimizadas:\n");

print("1. Logs de administradores en módulo estudiantes (últimos 7 días):");
print(`
db.logs.find({
  "usuario.rol": "administrador",
  "accion.modulo": "estudiantes",
  "fechaHora": { $gte: new Date(Date.now() - 7*24*60*60*1000) }
}).sort({ fechaHora: -1 }).limit(50)
`);

print("\n2. Todas las acciones de un usuario:");
print(`
db.logs.find({
  "usuario.id": "uuid-del-usuario"
}).sort({ fechaHora: -1 })
`);

print("\n3. Errores en los últimos 30 días:");
print(`
db.logs.find({
  "accion.exitoso": false,
  "fechaHora": { $gte: new Date(Date.now() - 30*24*60*60*1000) }
}).sort({ fechaHora: -1 })
`);

print("\n4. Estadísticas por módulo:");
print(`
db.logs.aggregate([
  {
    $group: {
      _id: "$accion.modulo",
      total: { $sum: 1 },
      errores: {
        $sum: { $cond: [{ $eq: ["$accion.exitoso", false] }, 1, 0] }
      }
    }
  },
  { $sort: { total: -1 } }
])
`);

print("\n5. Actividad por usuario (top 10):");
print(`
db.logs.aggregate([
  {
    $group: {
      _id: "$usuario.correo",
      acciones: { $sum: 1 }
    }
  },
  { $sort: { acciones: -1 } },
  { $limit: 10 }
])
`);
