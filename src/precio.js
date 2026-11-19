// Precio que se muestra mientras el cliente arma su pizza.
// Es solo para mostrarlo: el precio que vale es el que calcula la API al crear el pedido.

// Misma regla que la API (MAX_CANTIDAD_POR_PIZZA); la API también lo valida
export const MAX_CANTIDAD = 20

function precioDe(lista, id) {
  return lista.find((item) => item.id === id)?.priceCents ?? 0
}

// precio = tamaño + masa + suma de ingredientes (en centavos)
export function precioUnitario(menu, { sizeId, crustId, toppingIds }) {
  return (
    precioDe(menu.sizes, sizeId) +
    precioDe(menu.crusts, crustId) +
    toppingIds.reduce((suma, id) => suma + precioDe(menu.toppings, id), 0)
  )
}
