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
