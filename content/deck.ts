import type { Deck } from "./types";

/**
 * Texto del pitch de TilcAI para el jurado. Cambiar el texto no requiere tocar código.
 * Lo marcado con [[ ]] está por confirmar con el equipo antes de presentar.
 * Los estados técnicos salen de documentation/0-OFICIAL y 3-CONSTRUCCION (nov. 2026).
 * Modelo de negocio, GTM, hoja de ruta y roles del equipo salen de la sección de Notion
 * «Instawards · Paso 2 · Borradores TilcAI» (leída el 2026-11-08); ver docs/fuentes-notion.md.
 */
const deck: Deck = {
  name: "TilcAI",
  url: "tilcai.com",
  event: "Stellar Instawards LATAM",
  videos: { claude: "/video/claude-app.mp4", vaquita: "/video/vaquita.mp4" },
  slides: [
    {
      id: "sketch-1",
      section: "El aniversario olvidado",
      layout: "sketch",
      seconds: 78,
      title: "El aniversario olvidado",
      stage: { act: "sketch" },
      film: { from: 0, to: 78 },
      script:
        "Arrancamos sin presentarnos: el sketch hasta el «¡Ahhh… claro!» del esposo (escena 9). Ahí cortamos y recién revelamos TilcAI. Las voces se doblan en vivo con la vista de notas. → salta de escena; espacio pausa.",
    },
    {
      id: "portada",
      section: "TilcAI",
      layout: "cover",
      seconds: 15,
      title: "Tu agente compra. *Tú decides.*",
      lead: "Infraestructura de permisos y pagos para el comercio con agentes de IA.",
      stage: { act: "host", pose: "cover" },
      script:
        "Corte. Lo que acaban de ver tiene nombre: TilcAI. Claude no compró por su cuenta: compró dentro de un permiso que el esposo aprobó. Esa capa de permisos y pagos es lo que construimos.",
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
        { status: "verificado", title: "Fuji y Monad → Stellar en testnet", text: "CCTP V2 configurado desde Avalanche Fuji y Monad Testnet, sin gas." },
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
      seconds: 25,
      title: "La empresa paga por *integrar y operar* los cobros de agentes",
      lead: "La empresa contrata e integra; el comprador usa su asistente y autoriza el gasto.",
      items: [
        { icon: "store", title: "Comercios con checkout", text: "Reciben pagos de agentes, los asocian a pedidos y concilian." },
        { icon: "agent", title: "Integradores", text: "Reutilizan una integración de pagos para todos sus clientes." },
        { icon: "bolt", title: "Implementación + operación", text: "Tarifa de implementación y suscripción con volumen incluido, frente a cobro por uso." },
        { icon: "receipt", title: "Precio separado", text: "La tarifa de TilcAI va aparte de comisiones de red y costes de terceros." },
      ],
      stage: { act: "host", pose: "solution" },
      script:
        "¿Quién nos paga? La empresa, no el comprador. Nuestros clientes son comercios con checkout integrable e integradores que quieren reutilizar una integración de pagos. Cobramos implementación cuando hay trabajo específico y una suscripción de operación con volumen incluido, y lo comparamos contra cobro por uso. El precio lo fijamos midiendo tiempo hasta el primer cobro conciliado, incidencias por integración y disposición a pagar.",
    },
    {
      id: "gtm",
      section: "Go-to-market",
      layout: "flow",
      seconds: 25,
      title: "Del primer contacto *al primer cobro conciliado*",
      lead: "Empezamos en Bolivia con comercios digitales e integradores que controlan su checkout.",
      items: [
        { icon: "chat", title: "Entrevistas", text: "Comunidad Stellar y red del equipo: el problema real de cobro." },
        { icon: "users", title: "Eventos", text: "Hackathons, talleres y demos con universidades, cámaras e integradores." },
        { icon: "agent", title: "Sesión técnica", text: "Demo reproducible, SDK, MCP y documentación." },
        { icon: "shield", title: "Piloto", text: "Un comercio prueba e integra el cobro en un caso delimitado." },
        { icon: "receipt", title: "Pago comercial", text: "Empresas únicas, denominadores y causas de abandono en cada paso." },
      ],
      stage: { act: "host", pose: "flow" },
      script:
        "Para llegar al mercado no vendemos una integración que no existe: empezamos con entrevistas de problema en la comunidad Stellar y la red del equipo, y con hackathons, talleres y demos junto a universidades, cámaras empresariales e integradores. El objetivo es una decisión verificable: una sesión técnica, un piloto y el primer cobro conciliado. Seguimos con un segmento solo si hay un problema repetido, un comprador identificable y un compromiso de integración.",
    },
    {
      id: "ruta",
      section: "Hoja de ruta",
      layout: "roadmap",
      seconds: 25,
      title: "Una v1 en Stellar Mainnet *en 30 días*",
      items: [
        { value: "Hoy", title: "Base probada", text: "1 USDC real Avalanche → Stellar; CCTP desde Fuji y Monad Testnet; SDK x402 y MCP." },
        { value: "Semanas 1–2", title: "D1 · Cobro x402", text: "Endpoint en Stellar con orden, intento, estado y comprobante." },
        { value: "Semanas 2–3", title: "D2 · SDK y MCP", text: "Pago autorizado con límites, reintentos e idempotencia." },
        { value: "Semanas 3–4", title: "D3 · Fondeo CCTP", text: "Avalanche C-Chain → Stellar Mainnet, trazable aparte del cobro." },
        { value: "Después", title: "Piloto y liquidez", text: "Piloto comercial y vaults prefondeados con reposición por lotes." },
      ],
      stage: { act: "host", pose: "roadmap" },
      script:
        "Partimos de algo probado: USDC real de Avalanche a Stellar, CCTP desde Fuji y Monad hacia Stellar Testnet, SDK y MCP. En 30 días dejamos una v1 controlada en Stellar Mainnet: un agente hace un pago x402 autorizado con USDC real mediante SDK y MCP, y la empresa verifica y concilia el cobro con su orden. El fondeo por CCTP se demuestra por separado. Después, cada fase avanza solo con resultados: piloto comercial y liquidez prefondeada por red.",
    },
    {
      id: "equipo",
      section: "Equipo",
      layout: "team",
      seconds: 15,
      title: "El equipo detrás de *TilcAI.*",
      lead: "Dirección, negocio, desarrollo y producto en una misma infraestructura.",
      items: [
        { title: "Saúl", text: "Fundador · CEO", value: "Dirección · demo", photo: "/team/saul.jpg" },
        { title: "Omar", text: "Negocio y growth", value: "Clientes · postulación", photo: "/team/omar.jpg" },
        { title: "José", text: "Desarrollo y técnica", value: "Implementación · postulación", photo: "/team/jose.jpg" },
        { title: "Jhamil", text: "Producto y diseño", value: "Producto · demo", photo: "/team/jhamil.jpg" },
      ],
      stage: { act: "host", pose: "team" },
      script:
        "Somos cuatro: Saúl, fundador y CEO; Omar, negocio y growth; José, desarrollo y técnica; y Jhamil, producto y diseño.",
    },
    {
      id: "sketch-2",
      section: "El aniversario olvidado · final",
      layout: "sketch",
      seconds: 12,
      title: "El aniversario olvidado",
      stage: { act: "sketch" },
      film: { from: 78, to: 90 },
      script:
        "Volvemos al comedor: el esposo finge que todo era sorpresa. Ahora el jurado ya sabe quién estaba detrás del permiso de 50 dólares.",
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
