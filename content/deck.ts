import type { Deck } from "./types";

/**
 * Texto del pitch de TilcAI para el jurado. Cambiar el texto no requiere tocar código.
 * Lo marcado con [[ ]] está por confirmar con el equipo antes de presentar.
 * Los estados técnicos salen de documentation/0-OFICIAL y 3-CONSTRUCCION (nov. 2026).
 */
const deck: Deck = {
  name: "TilcAI",
  url: "tilcai.com",
  event: "[[Nombre de la competencia]]",
  videos: { claude: "/video/claude-app.mp4", vaquita: "/video/vaquita.mp4" },
  slides: [
    {
      id: "portada",
      section: "TilcAI",
      layout: "cover",
      seconds: 15,
      title: "Tu agente compra. *Tú decides.*",
      lead: "Infraestructura de permisos y pagos para el comercio con agentes de IA.",
      stage: { act: "host", pose: "cover" },
      script:
        "Buenas. Somos TilcAI. Antes de explicarles qué hacemos, queremos contarles una historia de aniversario. Pongan atención a quién decide qué.",
    },
    {
      id: "sketch",
      section: "El aniversario olvidado",
      layout: "sketch",
      seconds: 90,
      title: "El aniversario olvidado",
      stage: { act: "sketch" },
      script:
        "Sketch de 90 segundos. Las voces se doblan en vivo: la vista de notas resalta cada línea en el momento justo. → salta a la escena siguiente; espacio pausa.",
    },
    {
      id: "problema",
      section: "El problema",
      layout: "statement",
      seconds: 30,
      title: "Los agentes ya saben elegir. *Todavía no saben pagar con permiso.*",
      items: [
        {
          icon: "wallet",
          title: "La persona",
          text: "Darle su tarjeta a un agente es darle control ilimitado. Por eso, la compra se queda a medias en el checkout.",
        },
        {
          icon: "store",
          title: "El negocio",
          text: "No sabe si el agente que le compra está autorizado, por cuánto ni a quién cobrarle.",
        },
        {
          icon: "receipt",
          title: "Los dos",
          text: "El pago, la orden y la entrega viven en sistemas distintos: nadie puede reconstruir qué pasó.",
        },
      ],
      stage: { act: "host", pose: "problem" },
      script:
        "El esposo del sketch es cualquiera de nosotros: llegó al checkout y no terminó. Hoy los agentes de IA ya saben buscar y elegir, pero cuando toca pagar hay dos malas opciones: o les das tu tarjeta sin límites, o la compra se queda a medias. Y el negocio, del otro lado, no tiene cómo saber si ese agente está autorizado.",
    },
    {
      id: "solucion",
      section: "La solución",
      layout: "cards",
      seconds: 30,
      title: "TilcAI pone *los permisos* entre el agente y el dinero",
      lead: "Ningún modelo de IA obtiene por sí mismo autoridad para mover fondos o inventar precios.",
      items: [
        { icon: "lock", title: "Mandato con límites", text: "Importe, activo, destinatario y vencimiento. Como los 50 dólares del sketch." },
        { icon: "check", title: "Aprobación exacta", text: "La persona aprueba condiciones concretas en una superficie segura, no en el chat." },
        { icon: "bolt", title: "Pago verificable", text: "USDC por un riel soportado: CCTP de Circle y liquidación en Stellar, sin gas para el agente." },
        { icon: "receipt", title: "Conciliación y recibo", text: "Orden, cotización y hashes de cada red unidos bajo un mismo identificador." },
      ],
      stage: { act: "host", pose: "solution" },
      script:
        "TilcAI es la capa que va entre el agente y el dinero. La persona define un mandato con límites, aprueba condiciones exactas y TilcAI coordina el pago por un riel verificable y lo concilia con la orden. Exactamente lo del sketch: Claude compró, pero dentro de 50 dólares que él aprobó.",
    },
    {
      id: "como",
      section: "Cómo funciona",
      layout: "flow",
      seconds: 30,
      title: "Una sola operación, *de punta a punta*",
      items: [
        { icon: "chat", title: "Intención", text: "El comprador pide por su asistente (MCP), WhatsApp o la API." },
        { icon: "quote", title: "Cotización", text: "El negocio responde con precio, vigencia y destino de cobro registrado." },
        { icon: "shield", title: "Reglas y aprobación", text: "Límites, identidad y aprobación exacta de la persona." },
        { icon: "link", title: "Pago", text: "USDC de Avalanche a Stellar por CCTP V2, gas patrocinado por el relayer." },
        { icon: "receipt", title: "Conciliación", text: "Ambos lados ven el mismo estado y las pruebas en cada red." },
      ],
      stage: { act: "host", pose: "flow" },
      script:
        "El flujo es uno solo. El comprador expresa una intención desde su asistente; el negocio cotiza con su fuente de verdad; TilcAI aplica reglas y pide la aprobación exacta; el pago viaja en USDC de Avalanche a Stellar por CCTP, sin que el agente pague gas; y al final ambos lados ven el mismo estado con pruebas verificables.",
    },
    {
      id: "demo",
      section: "MVP · Demo",
      layout: "demo",
      seconds: 40,
      title: "Claude paga con TilcAI y el depósito *llega a Vaquita*",
      items: [
        { title: "Claude cotiza", text: "Con el servidor tilcai-mcp: monto y destino en Stellar." },
        { title: "La persona aprueba", text: "Firma sin gas; el relayer paga en las dos redes." },
        { title: "CCTP V2", text: "USDC de Avalanche a Stellar: burn, atestación y mint." },
        { title: "Vaquita", text: "El USDC llega y se deposita en Vaquita Protocol." },
      ],
      stage: { act: "phones", pose: "hero" },
      script:
        "Este es nuestro MVP. A la izquierda, Claude con el servidor MCP de TilcAI: pide una cotización y prepara el pago. La persona aprueba y firma, sin gas. TilcAI mueve el USDC de Avalanche a Stellar con CCTP. A la derecha, el depósito llega a Vaquita Protocol. [[Narrar sobre el video real]]",
    },
    {
      id: "evidencia",
      section: "Dónde estamos",
      layout: "evidence",
      seconds: 25,
      title: "Lo que *ya funciona*, y lo que no prometemos todavía",
      items: [
        { status: "mainnet", title: "Avalanche → Stellar en mainnet", text: "Pagos reales de 0,01 y 1 USDC, y acreditación en Vaquita.", value: "1 USDC" },
        { status: "verificado", title: "Fuji → Stellar en testnet", text: "CCTP V2 sin gas, con API, worker y pruebas." },
        { status: "publicado", title: "tilcai-mcp y SDK", text: "Servidor MCP con credenciales rotables; SDK 0.4.0." },
        { status: "verificado", title: "Vault de desembolsos", text: "Seis desembolsos confirmados en la prueba con Optipagos." },
        { status: "laboratorio", title: "Otras redes CCTP", text: "Sepolia, Arbitrum y Base: en laboratorio, no habilitadas." },
        { status: "pendiente", title: "Comercio completo A2A", text: "Agente del negocio, catálogo y cotización integrados." },
      ],
      stage: { act: "host", pose: "evidence" },
      script:
        "Somos precisos con el estado. Ya movimos USDC real de Avalanche a Stellar en mainnet y lo acreditamos en Vaquita. La ruta de testnet está verificada, el MCP y el SDK están publicados. Lo que falta, y lo decimos claro, es el comercio completo entre el agente del comprador y el del negocio.",
    },
    {
      id: "negocio",
      section: "Modelo de negocio",
      layout: "cards",
      seconds: 20,
      title: "Cobramos cuando *la operación se completa*",
      items: [
        { icon: "bolt", title: "Comisión por operación", text: "[[x % por pago conciliado]]" },
        { icon: "store", title: "Plan para negocios", text: "[[Suscripción: agente vendedor, catálogo y recibos]]" },
        { icon: "agent", title: "Desarrolladores", text: "API, SDK y MCP con [[cuota gratuita y luego por volumen]]" },
      ],
      stage: { act: "host", pose: "solution" },
      script: "[[Confirmar con el equipo: precios, primer segmento y piloto. No inventar cifras de adopción.]]",
    },
    {
      id: "ruta",
      section: "Hoja de ruta",
      layout: "roadmap",
      seconds: 15,
      title: "Lo que sigue",
      items: [
        { value: "Hoy", title: "Pagos de agentes", text: "MCP, SDK y Avalanche → Stellar." },
        { value: "[[Q1]]", title: "Negocio piloto", text: "Agente vendedor, catálogo y cotización." },
        { value: "[[Q2]]", title: "x402 en Stellar", text: "Pago directo en USDC y más orígenes CCTP." },
        { value: "[[Q3]]", title: "Bolivia", text: "Rampa BOB ↔ USDC y facturación SIN." },
      ],
      stage: { act: "host", pose: "roadmap" },
      script:
        "Hoy los agentes ya pagan. Lo siguiente es un negocio piloto con su propio agente vendedor, después el pago directo con x402 en Stellar y, para Bolivia, la rampa a bolivianos y la facturación. [[Confirmar fechas]]",
    },
    {
      id: "equipo",
      section: "Equipo",
      layout: "team",
      seconds: 10,
      title: "El equipo",
      items: [
        { title: "[[Nombre]]", text: "[[Rol]]" },
        { title: "[[Nombre]]", text: "[[Rol]]" },
        { title: "[[Nombre]]", text: "[[Rol]]" },
        { title: "[[Nombre]]", text: "[[Rol]]" },
      ],
      stage: { act: "host", pose: "team" },
      script: "[[Presentación breve del equipo.]]",
    },
    {
      id: "cierre",
      section: "TilcAI",
      layout: "closing",
      seconds: 10,
      title: "Tu agente compra. *Tú decides.*",
      lead: "Comercio con agentes, con control humano.",
      stage: { act: "host", pose: "closing" },
      script: "Tu agente compra; tú decides. Somos TilcAI. Gracias.",
    },
  ],
};

export default deck;
