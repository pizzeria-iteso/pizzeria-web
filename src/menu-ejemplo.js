// Menú de ejemplo con la MISMA forma que responde GET /menu de la API.
// Se usa mientras el frontend no está conectado a la API real (issue web #2).
// Precios en centavos: 16900 = $169.00

export const menuEjemplo = {
  currency: 'MXN',
  maxToppings: 5,
  sizes: [
    { id: 'chica', name: 'Chica', priceCents: 12900 },
    { id: 'mediana', name: 'Mediana', priceCents: 16900 },
    { id: 'grande', name: 'Grande', priceCents: 20900 },
  ],
  crusts: [
    { id: 'delgada', name: 'Delgada', priceCents: 0 },
    { id: 'tradicional', name: 'Tradicional', priceCents: 1500 },
    { id: 'orilla-rellena', name: 'Orilla rellena', priceCents: 3500 },
  ],
  toppings: [
    { id: 'aceitunas', name: 'Aceitunas', priceCents: 1800 },
    { id: 'cebolla', name: 'Cebolla', priceCents: 1200 },
    { id: 'champinones', name: 'Champiñones', priceCents: 1800 },
    { id: 'extra-queso', name: 'Extra queso', priceCents: 2200 },
    { id: 'jamon', name: 'Jamón', priceCents: 2000 },
    { id: 'pepperoni', name: 'Pepperoni', priceCents: 2500 },
    { id: 'pimiento', name: 'Pimiento', priceCents: 1500 },
    { id: 'pina', name: 'Piña', priceCents: 2000 },
  ],
}
