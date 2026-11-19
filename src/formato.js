// Convierte centavos a texto de dinero en pesos mexicanos: 16900 -> "$169.00"
const formatoMXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

export function dinero(centavos) {
  return formatoMXN.format(centavos / 100)
}

// La base guarda la fecha en hora UTC ("2026-11-19 18:00:00");
// se muestra en la hora local del cliente: "19 nov 2026, 12:00"
const formatoFecha = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' })

export function fechaHora(textoUTC) {
  const fecha = new Date(`${String(textoUTC).replace(' ', 'T')}Z`)
  return Number.isNaN(fecha.getTime()) ? '' : formatoFecha.format(fecha)
}

// Número corto para mostrar: "c70745c1-f3d2-..." -> "#C70745C1"
export function numeroCorto(id) {
  return `#${String(id).slice(0, 8).toUpperCase()}`
}
