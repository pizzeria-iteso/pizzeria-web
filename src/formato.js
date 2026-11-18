// Convierte centavos a texto de dinero en pesos mexicanos: 16900 -> "$169.00"
const formatoMXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

export function dinero(centavos) {
  return formatoMXN.format(centavos / 100)
}
