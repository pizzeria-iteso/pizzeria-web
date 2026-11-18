import './style.css'
import { obtenerMenu } from './api.js'
import { dinero } from './formato.js'
import { crearPizza, imagenMasa, imagenIngrediente, precargarImagenes } from './pizza.js'

// El menú llega de la API (GET /menu) al cargar la página
let menu = null
let pizza = null

// Lo que el cliente va eligiendo
const estado = {
  sizeId: null,
  crustId: null,
  toppingIds: [],
}

const armador = document.querySelector('#armador')
const estadoCarga = document.querySelector('#estado-carga')
const vistaPizza = document.querySelector('#vista-pizza')
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

function crearTexto(clase, texto) {
  const span = document.createElement('span')
  span.className = clase
  span.textContent = texto // textContent: el texto de la API nunca se interpreta como HTML
  return span
}

// Crea una tarjeta seleccionable (radio para tamaño/masa, checkbox para ingredientes)
function crearOpcion({ tipo, grupo, item, marcada }) {
  const etiqueta = document.createElement('label')
  etiqueta.className = `opcion opcion-${grupo}`
  etiqueta.dataset.id = item.id

  const input = document.createElement('input')
  input.type = tipo
  input.name = grupo
  input.value = item.id
  input.checked = marcada

  const icono = document.createElement('span')
  icono.className = 'opcion-icono'
  icono.setAttribute('aria-hidden', 'true')
  const imagen = document.createElement('img')
  imagen.src = imagenDeOpcion(grupo, item.id)
  imagen.alt = ''
  imagen.addEventListener('error', () => imagen.remove()) // por si la API trae algo sin foto
  icono.append(imagen)

  etiqueta.append(
    input,
    icono,
    crearTexto('opcion-nombre', item.name),
    crearTexto('opcion-precio', textoPrecio(grupo, item.priceCents))
  )
  return etiqueta
}

function pintarOpciones() {
  contenedorTamanos.replaceChildren(
    ...menu.sizes.map((item) => crearOpcion({ tipo: 'radio', grupo: 'tamano', item, marcada: item.id === estado.sizeId }))
  )
  contenedorMasas.replaceChildren(
    ...menu.crusts.map((item) => crearOpcion({ tipo: 'radio', grupo: 'masa', item, marcada: item.id === estado.crustId }))
  )
  contenedorIngredientes.replaceChildren(
    ...menu.toppings.map((item) => crearOpcion({ tipo: 'checkbox', grupo: 'ingrediente', item, marcada: false }))
  )
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
  const masa = nombreDe(menu.crusts, estado.crustId).toLowerCase()
  resumen.replaceChildren(
    Object.assign(document.createElement('strong'), { textContent: nombreDe(menu.sizes, estado.sizeId) }),
    ' · masa ',
    Object.assign(document.createElement('strong'), { textContent: masa }),
    document.createElement('br'),
    ingredientes.length ? ingredientes.join(', ') : 'Sin ingredientes extra'
  )
}

// Un solo "escuchador" para todo el formulario
armador.addEventListener('change', (evento) => {
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

// Elige "mediana" y "tradicional" si existen; si no, la primera opción
function opcionInicial(lista, preferida) {
  return lista.some((item) => item.id === preferida) ? preferida : lista[0]?.id
}

async function iniciar() {
  armador.classList.add('cargando')
  estadoCarga.classList.remove('error')
  estadoCarga.textContent = 'Cargando el menú…'

  try {
    menu = await obtenerMenu()
  } catch (error) {
    console.error(error)
    estadoCarga.classList.add('error')
    estadoCarga.textContent = 'No pudimos cargar el menú. Revisa tu conexión e inténtalo de nuevo. '
    const reintentar = document.createElement('button')
    reintentar.type = 'button'
    reintentar.textContent = 'Reintentar'
    reintentar.addEventListener('click', iniciar)
    estadoCarga.append(reintentar)
    return
  }

  estado.sizeId = opcionInicial(menu.sizes, 'mediana')
  estado.crustId = opcionInicial(menu.crusts, 'tradicional')
  estado.toppingIds = []

  precargarImagenes(menu)
  vistaPizza.replaceChildren()
  pizza = crearPizza(vistaPizza, menu)
  pintarOpciones()
  actualizarPantalla()

  armador.classList.remove('cargando')
  estadoCarga.textContent = ''
}

iniciar()
