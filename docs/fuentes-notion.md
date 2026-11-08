# Fuentes de Notion del pitch

El modelo de negocio, el go-to-market, la hoja de ruta y los roles del equipo del pitch salen de la
sección de Notion **«Instawards · Paso 2 · Borradores TilcAI»** (espacio *Negocios*). Esa información
va a cambiar: cuando cambie allí, actualiza `content/deck.ts` siguiendo esta tabla.

Última lectura: **2026-11-08**.

| Diapositiva (`id` en `content/deck.ts`) | Página de Notion | Qué se toma |
| --- | --- | --- |
| `evidencia` (ítem «Fuji y Monad → Stellar») | 01 Modelo de negocio · 03 Roadmap | CCTP configurado desde Avalanche Fuji y Monad Testnet hacia Stellar Testnet |
| `negocio` | 01 Modelo de negocio | Segmentos (comercio con checkout, integrador), quién paga (la empresa), modalidades (implementación + suscripción con volumen incluido frente a cobro por uso), precio separado de comisiones de red y terceros |
| `gtm` | 02 GTM y validación comercial | Perfil de cliente inicial (Bolivia, comercios digitales e integradores), canales, eventos y alianzas, embudo y criterio para seguir con un segmento |
| `ruta` | 03 Roadmap de producto y sprint | Punto de partida, entregables D1/D2/D3 del sprint de 30 días, fases posteriores (piloto comercial, liquidez prefondeada por red) |
| `equipo` | 03 Roadmap (Pendientes de capacidad) · 06 Respuestas del Paso 2 | Roles: Saúl fundador/CEO, Omar negocio/growth, José desarrollo/técnica, Jhamil producto/diseño |

## Reglas al actualizar

- No inventar cifras de adopción, clientes, contratos ni ingresos. Notion indica que aún no hay tarifa
  aprobada, contratos ni volumen comercial acreditado.
- No poner fechas de calendario en la hoja de ruta: el sprint se cuenta desde T0 (fecha de inicio
  acordada), en semanas.
- No mencionar presupuesto, Chapter Lead ni pendientes internos de la postulación en las diapositivas.
- Excluido del sprint según Notion (no prometerlo como siguiente paso inmediato): Monad Mainnet,
  facturación, QR en bolivianos, identidad agéntica, ZK, entrega física, módulos empresariales completos.
- El mismo contenido, en versión pública y bilingüe, vive en `tilcai-web` →
  `src/lib/content/strategy.ts` (página `/demo`). Mantener ambos alineados.
