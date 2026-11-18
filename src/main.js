import './style.css'
import { menuEjemplo } from './menu-ejemplo.js'
import { dinero } from './formato.js'
import { crearPizza, imagenMasa, imagenIngrediente, precargarImagenes } from './pizza.js'

// Por ahora usamos el menú de ejemplo; en el issue web #2 se pide a la API (GET /menu)
const menu = menuEjemplo

// Lo que el cliente va eligiendo
const estado = {
  sizeId: 'mediana',
  crustId: 'tradicional',
  toppingIds: [],
}

precargarImagenes(menu)
const pizza = crearPizza(document.querySelector('#vista-pizza'), menu)
const contenedorTamanos = document.querySelector('#opciones-tamano')
const contenedorMasas = document.querySelector('#opciones-masa')
const contenedorIngredientes = document.querySelector('#opciones-ingredientes')
const contador = document.querySelector('#contador-ingredientes')
const aviso = document.querySelector('#aviso')
const resumen = document.querySelector('#resumen')

// El tamaño es el precio base; masa e ingredientes se suman encima
function textoPrecio(grupo, centavos) {
  if (grupo === 'tamano') return dinero(centavos)
  return centavos === 0 ? 'Sin costo' : `+ ${dinero(centavos)}`
}

// Imagen pequeña de cada tarjeta: la pizza para tamaño y masa, la pieza para ingredientes
function imagenDeOpcion(grupo, id) {
  if (grupo === 'tamano') return imagenMasa('tradicional')
  if (grupo === 'masa') return imagenMasa(id)
  return imagenIngrediente(id)
}

// Crea una tarjeta seleccionable (radio para tamaño/masa, checkbox para ingredientes)
function crearOpcion({ tipo, grupo, item, marcada }) {
  const etiqueta = document.createElement('label')
  etiqueta.className = `opcion opcion-${grupo}`
  etiqueta.dataset.id = item.id
  etiqueta.innerHTML = `
    <input type="${tipo}" name="${grupo}" value="${item.id}" ${marcada ? 'checked' : ''} />
    <span class="opcion-icono" aria-hidden="true"><img src="${imagenDeOpcion(grupo, item.id)}" alt="" /></span>
    <span class="opcion-nombre">${item.name}</span>
    <span class="opcion-precio">${textoPrecio(grupo, item.priceCents)}</span>`
  return etiqueta
}

function pintarOpciones() {
  for (const item of menu.sizes) {
    contenedorTamanos.append(crearOpcion({ tipo: 'radio', grupo: 'tamano', item, marcada: item.id === estado.sizeId }))
  }
  for (const item of menu.crusts) {
    contenedorMasas.append(crearOpcion({ tipo: 'radio', grupo: 'masa', item, marcada: item.id === estado.crustId }))
  }
  for (const item of menu.toppings) {
    contenedorIngredientes.append(crearOpcion({ tipo: 'checkbox', grupo: 'ingrediente', item, marcada: false }))
  }
}

function nombreDe(lista, id) {
  return lista.find((item) => item.id === id)?.name ?? id
}

function mostrarAviso(texto) {
  aviso.textContent = texto
  aviso.classList.remove('visible')
  void aviso.offsetWidth // reinicia la animación
  aviso.classList.add('visible')
}

function actualizarPantalla() {
  pizza.actualizar(estado)

  contador.textContent = `${estado.toppingIds.length} / ${menu.maxToppings}`
  contador.classList.toggle('lleno', estado.toppingIds.length === menu.maxToppings)

  const ingredientes = estado.toppingIds.map((id) => nombreDe(menu.toppings, id))
  resumen.innerHTML = `
    <strong>${nombreDe(menu.sizes, estado.sizeId)}</strong> ·
    masa <strong>${nombreDe(menu.crusts, estado.crustId).toLowerCase()}</strong><br />
    ${ingredientes.length ? ingredientes.join(', ') : 'Sin ingredientes extra'}`
}

// Un solo "escuchador" para todo el formulario
document.querySelector('#armador').addEventListener('change', (evento) => {
  const input = evento.target

  if (input.name === 'tamano') estado.sizeId = input.value
  if (input.name === 'masa') estado.crustId = input.value

  if (input.name === 'ingrediente') {
    if (input.checked) {
      if (estado.toppingIds.length >= menu.maxToppings) {
        // Regla del negocio: máximo de ingredientes (la API también lo valida)
        input.checked = false
        const tarjeta = input.closest('.opcion')
        tarjeta.classList.remove('sacudir')
        void tarjeta.offsetWidth
        tarjeta.classList.add('sacudir')
        mostrarAviso(`Máximo ${menu.maxToppings} ingredientes por pizza`)
        return
      }
      estado.toppingIds.push(input.value)
    } else {
      estado.toppingIds = estado.toppingIds.filter((id) => id !== input.value)
    }
  }

  actualizarPantalla()
})

pintarOpciones()
actualizarPantalla()
