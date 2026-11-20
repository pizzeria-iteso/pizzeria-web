import './style.css'
import { obtenerMenu, crearPedido, ErrorDePedido } from './api.js'
import { precioUnitario, MAX_CANTIDAD } from './precio.js'
import { dinero, numeroCorto } from './formato.js'
import { configurarEstado, mostrarEstado, detenerEstado, refrescarEstado, guardarPedidoReciente } from './estado.js'
import { crearPizza, imagenMasa, imagenIngrediente, precargarImagenes } from './pizza.js'

// El menú llega de la API (GET /menu) al cargar la página
let menu = null
let pizza = null

// Lo que el cliente va eligiendo
const estado = {
  sizeId: null,
  crustId: null,
  toppingIds: [],
  quantity: 1,
}
let enviando = false
let ultimoPedido = null

const armador = document.querySelector('#armador')
const estadoCarga = document.querySelector('#estado-carga')
const vistaPizza = document.querySelector('#vista-pizza')
const contenedorTamanos = document.querySelector('#opciones-tamano')
const contenedorMasas = document.querySelector('#opciones-masa')
const contenedorIngredientes = document.querySelector('#opciones-ingredientes')
const contador = document.querySelector('#contador-ingredientes')
const aviso = document.querySelector('#aviso')
const resumen = document.querySelector('#resumen')
const panelPedido = document.querySelector('#pedido')
const botonMenos = document.querySelector('#menos')
const botonMas = document.querySelector('#mas')
const cantidad = document.querySelector('#cantidad')
const total = document.querySelector('#total')
const botonOrdenar = document.querySelector('#ordenar')
const errorPedido = document.querySelector('#error-pedido')
const confirmacion = document.querySelector('#confirmacion')
const vistaArmar = document.querySelector('#vista-armar')
const vistaEstado = document.querySelector('#vista-estado')

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

// ---------- Precio en vivo ----------

const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)')
let totalMostrado = 0
let animacionTotal = null

// El total "cuenta" desde el valor anterior hasta el nuevo
function animarTotal(nuevo) {
  cancelAnimationFrame(animacionTotal)
  const inicio = totalMostrado
  if (reducirMovimiento.matches || inicio === nuevo) {
    totalMostrado = nuevo
    total.textContent = dinero(nuevo)
    return
  }
  total.classList.remove('cambio')
  void total.offsetWidth // reinicia la animación de "salto"
  total.classList.add('cambio')

  const duracion = 450
  const comienzo = performance.now()
  const paso = (ahora) => {
    const t = Math.min((ahora - comienzo) / duracion, 1)
    const suave = 1 - (1 - t) ** 3 // empieza rápido y frena al final
    totalMostrado = Math.round(inicio + (nuevo - inicio) * suave)
    total.textContent = dinero(totalMostrado)
    if (t < 1) animacionTotal = requestAnimationFrame(paso)
  }
  animacionTotal = requestAnimationFrame(paso)
}

function actualizarPedido() {
  cantidad.textContent = estado.quantity
  botonMenos.disabled = estado.quantity <= 1
  botonMas.disabled = estado.quantity >= MAX_CANTIDAD
  animarTotal(precioUnitario(menu, estado) * estado.quantity)
}

function actualizarPantalla() {
  pizza.actualizar(estado)
  actualizarPedido()
  errorPedido.textContent = ''

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

// ---------- Cantidad ----------

botonMenos.addEventListener('click', () => {
  estado.quantity = Math.max(1, estado.quantity - 1)
  actualizarPedido()
})

botonMas.addEventListener('click', () => {
  estado.quantity = Math.min(MAX_CANTIDAD, estado.quantity + 1)
  actualizarPedido()
})

// ---------- Enviar el pedido ----------

const TEXTO_ESTADO = { recibido: 'Recibido', preparando: 'Preparando', listo: 'Listo' }

function mostrarConfirmacion(pedido) {
  const item = pedido.items[0]
  const ingredientes = item.toppingIds.map((id) => nombreDe(menu.toppings, id))
  const masa = nombreDe(menu.crusts, item.crustId).toLowerCase()

  ultimoPedido = pedido
  confirmacion.querySelector('#numero-pedido').textContent = numeroCorto(pedido.id)
  confirmacion.querySelector('#detalle-pedido').textContent =
    `${item.quantity} × ${nombreDe(menu.sizes, item.sizeId)}, masa ${masa}` +
    (ingredientes.length ? `, con ${ingredientes.join(', ').toLowerCase()}` : '')
  confirmacion.querySelector('#total-pedido').textContent = dinero(pedido.totalCents)
  confirmacion.querySelector('#estado-pedido').textContent = TEXTO_ESTADO[pedido.status] ?? pedido.status
  confirmacion.querySelector('#id-pedido').textContent = pedido.id
  confirmacion.showModal()
}

botonOrdenar.addEventListener('click', async () => {
  if (enviando) return // evita pedidos duplicados por doble clic
  enviando = true
  botonOrdenar.disabled = true
  botonOrdenar.classList.add('enviando')
  botonOrdenar.textContent = 'Enviando…'
  errorPedido.textContent = ''

  try {
    // Solo se mandan las elecciones; el precio lo calcula la API
    const pedido = await crearPedido([
      { sizeId: estado.sizeId, crustId: estado.crustId, toppingIds: estado.toppingIds, quantity: estado.quantity },
    ])
    guardarPedidoReciente(pedido)
    mostrarConfirmacion(pedido)
  } catch (error) {
    console.error(error)
    errorPedido.textContent =
      error instanceof ErrorDePedido ? error.message : 'Ocurrió un problema al enviar tu pedido. Inténtalo de nuevo.'
  } finally {
    enviando = false
    botonOrdenar.disabled = false
    botonOrdenar.classList.remove('enviando')
    botonOrdenar.textContent = 'Ordenar'
  }
})

// "Armar otra pizza": cierra la confirmación y empieza de cero
document.querySelector('#otra-pizza').addEventListener('click', () => {
  confirmacion.close()
  reiniciarPizza()
  window.scrollTo({ top: 0, behavior: reducirMovimiento.matches ? 'auto' : 'smooth' })
})

// "Ver estado del pedido": va a la pantalla de estado de ese pedido
document.querySelector('#ver-estado').addEventListener('click', () => {
  confirmacion.close()
  reiniciarPizza()
  location.hash = `#pedido/${encodeURIComponent(ultimoPedido.id)}`
})

// ---------- Pantallas: armar pizza (#) o estado del pedido (#pedido/...) ----------

configurarEstado({ menu: () => menu })

function enrutar() {
  const ruta = location.hash
  const enEstado = ruta === '#pedido' || ruta.startsWith('#pedido/')
  vistaArmar.hidden = enEstado
  vistaEstado.hidden = !enEstado
  // Marca en la navegación en qué pantalla estamos
  document.querySelectorAll('.navegacion a').forEach((enlace) => {
    const esActual = (enlace.getAttribute('href') === '#pedido') === enEstado
    if (esActual) enlace.setAttribute('aria-current', 'page')
    else enlace.removeAttribute('aria-current')
  })
  if (enEstado) {
    const id = decodeURIComponent(ruta.slice('#pedido/'.length)).trim()
    mostrarEstado(id || null)
  } else {
    detenerEstado()
  }
  window.scrollTo(0, 0)
}

window.addEventListener('hashchange', enrutar)

// Elige "mediana" y "tradicional" si existen; si no, la primera opción
function opcionInicial(lista, preferida) {
  return lista.some((item) => item.id === preferida) ? preferida : lista[0]?.id
}

function reiniciarPizza() {
  estado.sizeId = opcionInicial(menu.sizes, 'mediana')
  estado.crustId = opcionInicial(menu.crusts, 'tradicional')
  estado.toppingIds = []
  estado.quantity = 1
  pintarOpciones()
  actualizarPantalla()
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

  precargarImagenes(menu)
  vistaPizza.replaceChildren()
  pizza = crearPizza(vistaPizza, menu)
  reiniciarPizza()

  armador.classList.remove('cargando')
  panelPedido.hidden = false
  estadoCarga.textContent = ''
  refrescarEstado() // si se abrió directo un pedido, ahora ya hay nombres del menú
}

// Versión y ambiente, para seguir un cambio de dev a prod (los pone el pipeline al compilar)
document.querySelector('#version').textContent =
  `Versión ${import.meta.env.VITE_VERSION ?? 'local'} · ${import.meta.env.VITE_AMBIENTE ?? 'local'}`

enrutar()
iniciar()
