// Comunicación con la API de la pizzería.
// La dirección de la API viene de la variable VITE_API_URL al compilar
// (distinta en dev y en prod). Si no se define, usa la API local de wrangler dev.
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/$/, '')

export async function obtenerMenu() {
  const respuesta = await fetch(`${API_URL}/menu`)
  if (!respuesta.ok) {
    throw new Error(`La API respondió ${respuesta.status} al pedir el menú`)
  }
  return respuesta.json()
}

// Error con un mensaje pensado para mostrárselo al cliente
export class ErrorDePedido extends Error {}

// Envía el pedido. El total lo calcula la API, nunca se manda un precio.
export async function crearPedido(pizzas) {
  let respuesta
  try {
    respuesta = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pizzas }),
    })
  } catch {
    throw new ErrorDePedido('No pudimos conectar con la pizzería. Revisa tu conexión e inténtalo de nuevo.')
  }

  const datos = await respuesta.json().catch(() => null)

  if (respuesta.status === 201) return datos

  // 400: la API rechazó el pedido y explica por qué
  if (respuesta.status === 400 && datos?.error?.message) {
    throw new ErrorDePedido(datos.error.message)
  }
  throw new ErrorDePedido('Ocurrió un problema al enviar tu pedido. Inténtalo de nuevo.')
}
