// Pantalla "Estado de tu pedido": consulta GET /orders/:id y muestra su avance.
// Se abre con la dirección #pedido (buscar) o #pedido/<id> (ver un pedido).
import { obtenerPedido } from './api.js'
import { dinero, fechaHora, numeroCorto } from './formato.js'

const PASOS = [
  { id: 'recibido', nombre: 'Recibido', icono: '🧾', mensaje: 'Recibimos tu pedido. En un momento empezamos a prepararlo.' },
  { id: 'preparando', nombre: 'Preparando', icono: '👨‍🍳', mensaje: 'Tu pizza ya está en el horno.' },
  { id: 'listo', nombre: 'Listo', icono: '✅', mensaje: '¡Tu pedido está listo!' },
]
const CADA_CUANTO_ACTUALIZAR = 20000 // milisegundos
const LLAVE_RECIENTES = 'pizzeria:pedidos-recientes'

const contenedor = document.querySelector('#estado-contenido')
let obtenerMenu = () => null
let idActual = null
let temporizador = null

export function configurarEstado({ menu }) {
  obtenerMenu = menu
}

// ---------- Utilidades ----------

function crear(etiqueta, clase, texto) {
  const el = document.createElement(etiqueta)
  if (clase) el.className = clase
  if (texto !== undefined) el.textContent = texto // textContent: nunca se interpreta como HTML
  return el
}

function nombreDe(grupo, id) {
  return obtenerMenu()?.[grupo]?.find((item) => item.id === id)?.name ?? id
}

// ---------- Pedidos recientes (se guardan solo en este navegador) ----------

function leerRecientes() {
  try {
    const lista = JSON.parse(localStorage.getItem(LLAVE_RECIENTES) ?? '[]')
    return Array.isArray(lista) ? lista : []
  } catch {
    return []
  }
}

export function guardarPedidoReciente(pedido) {
  try {
    const sinRepetir = leerRecientes().filter((p) => p.id !== pedido.id)
    const nuevo = { id: pedido.id, totalCents: pedido.totalCents, createdAt: pedido.createdAt }
    localStorage.setItem(LLAVE_RECIENTES, JSON.stringify([nuevo, ...sinRepetir].slice(0, 5)))
  } catch {
    // Si el navegador no deja guardar (modo privado), simplemente no se recuerda
  }
}

// ---------- Vista: buscar un pedido ----------

// Acepta el id completo o el número corto que ve el cliente ("#9AF933A8").
// El número corto solo se puede resolver con los pedidos recientes de este navegador.
function resolverId(texto) {
  const escrito = texto.trim()
  const limpio = escrito.replace(/^#/, '').toLowerCase()
  const esNumeroCorto = escrito.startsWith('#') || /^[0-9a-z]{8}$/.test(limpio)
  if (!esNumeroCorto) return limpio || null
  return leerRecientes().find((pedido) => pedido.id.toLowerCase().startsWith(limpio))?.id ?? null
}

function pintarBusqueda() {
  const tarjeta = crear('div', 'tarjeta-estado')
  tarjeta.append(crear('h2', null, 'Consulta tu pedido'))

  const formulario = crear('form', 'buscar-pedido')
  const etiqueta = crear('label', 'oculto', 'Id del pedido')
  etiqueta.htmlFor = 'id-a-buscar'
  const campo = crear('input')
  campo.id = 'id-a-buscar'
  campo.required = true
  campo.placeholder = 'Número de pedido (#9AF933A8) o id completo'
  campo.autocomplete = 'off'
  const boton = crear('button', 'boton-secundario', 'Buscar')
  boton.type = 'submit'
  formulario.append(etiqueta, campo, boton)
  const aviso = crear('p', 'aviso-busqueda')
  aviso.setAttribute('role', 'alert')
  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault()
    aviso.textContent = ''
    const id = resolverId(campo.value)
    if (id) location.hash = `#pedido/${encodeURIComponent(id)}`
    else
      aviso.textContent =
        'Ese número no está en tus pedidos recientes de este navegador. Busca con el id completo (aparece abajo en la confirmación).'
  })
  tarjeta.append(formulario, aviso)

  const recientes = leerRecientes()
  tarjeta.append(crear('h3', null, 'Tus pedidos recientes'))
  if (recientes.length === 0) {
    tarjeta.append(crear('p', 'texto-suave', 'Aún no has hecho pedidos en este navegador.'))
  } else {
    const lista = crear('ul', 'lista-recientes')
    for (const pedido of recientes) {
      const enlace = crear('a')
      enlace.href = `#pedido/${encodeURIComponent(pedido.id)}`
      enlace.append(
        crear('strong', null, `Pedido ${numeroCorto(pedido.id)}`),
        crear('span', null, `${fechaHora(pedido.createdAt)} · ${dinero(pedido.totalCents)}`)
      )
      const elemento = crear('li')
      elemento.append(enlace)
      lista.append(elemento)
    }
    tarjeta.append(lista)
  }

  contenedor.replaceChildren(tarjeta)
  campo.focus()
}

// ---------- Vista: un pedido ----------

function pintarProgreso(status) {
  const actual = PASOS.findIndex((paso) => paso.id === status)
  const lista = crear('ol', 'progreso')
  lista.setAttribute('aria-label', 'Avance del pedido')
  PASOS.forEach((paso, i) => {
    const elemento = crear('li', i < actual ? 'paso-estado hecho' : i === actual ? 'paso-estado actual' : 'paso-estado')
    if (i === actual) elemento.setAttribute('aria-current', 'step')
    elemento.append(crear('span', 'paso-icono', paso.icono), crear('span', 'paso-nombre', paso.nombre))
    lista.append(elemento)
  })
  return lista
}

function pintarPedido(pedido) {
  const paso = PASOS.find((p) => p.id === pedido.status)
  const tarjeta = crear('div', 'tarjeta-estado')

  const encabezado = crear('div', 'estado-encabezado')
  const titulo = crear('div')
  titulo.append(crear('h2', null, `Pedido ${numeroCorto(pedido.id)}`), crear('p', 'texto-suave', fechaHora(pedido.createdAt)))
  encabezado.append(titulo, crear('span', `estado estado-${pedido.status}`, paso?.nombre ?? pedido.status))
  tarjeta.append(encabezado, pintarProgreso(pedido.status))
  if (paso) tarjeta.append(crear('p', 'mensaje-estado', paso.mensaje))

  // Detalle de las pizzas
  const lista = crear('ul', 'lista-pizzas')
  for (const item of pedido.items) {
    const ingredientes = item.toppingIds.map((id) => nombreDe('toppings', id))
    const descripcion = crear('div')
    descripcion.append(
      crear('strong', null, `${item.quantity} × ${nombreDe('sizes', item.sizeId)}, masa ${nombreDe('crusts', item.crustId).toLowerCase()}`),
      crear('span', 'texto-suave', ingredientes.length ? ingredientes.join(', ') : 'Sin ingredientes extra')
    )
    const elemento = crear('li')
    elemento.append(descripcion, crear('span', 'precio-linea', dinero(item.subtotalCents)))
    lista.append(elemento)
  }
  tarjeta.append(lista)

  const total = crear('div', 'fila-pedido fila-total')
  total.append(crear('span', 'etiqueta', 'Total'), crear('strong', 'total', dinero(pedido.totalCents)))
  tarjeta.append(total)

  // Acciones
  const acciones = crear('div', 'acciones-estado')
  const actualizar = crear('button', 'boton-secundario', 'Actualizar estado')
  actualizar.type = 'button'
  actualizar.addEventListener('click', () => cargarPedido(pedido.id, { silencioso: true }))
  const copiar = crear('button', 'boton-secundario', 'Copiar enlace')
  copiar.type = 'button'
  copiar.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href)
      copiar.textContent = '¡Enlace copiado!'
    } catch {
      copiar.textContent = 'No se pudo copiar'
    }
    setTimeout(() => (copiar.textContent = 'Copiar enlace'), 2000)
  })
  acciones.append(actualizar, copiar)
  tarjeta.append(acciones)

  const hora = new Intl.DateTimeFormat('es-MX', { timeStyle: 'medium' }).format(new Date())
  tarjeta.append(crear('p', 'pie-estado', `Última actualización: ${hora} · Id: ${pedido.id}`))

  contenedor.replaceChildren(tarjeta)
}

function pintarMensaje(texto, { error = false, reintentar = null } = {}) {
  const tarjeta = crear('div', error ? 'tarjeta-estado tarjeta-error' : 'tarjeta-estado')
  tarjeta.append(crear('p', 'mensaje-estado', texto))
  if (reintentar) {
    const boton = crear('button', 'boton-secundario', 'Reintentar')
    boton.type = 'button'
    boton.addEventListener('click', reintentar)
    tarjeta.append(boton)
  }
  if (error) {
    const volver = crear('a', 'enlace', 'Buscar otro pedido')
    volver.href = '#pedido'
    tarjeta.append(volver)
  }
  contenedor.replaceChildren(tarjeta)
}

async function cargarPedido(id, { silencioso = false } = {}) {
  if (!silencioso) pintarMensaje('Buscando tu pedido…')
  try {
    const pedido = await obtenerPedido(id)
    if (idActual === id) pintarPedido(pedido) // por si el cliente ya se fue a otra pantalla
  } catch (error) {
    if (idActual !== id) return
    console.error(error)
    pintarMensaje(error.message, { error: true, reintentar: error.noExiste ? null : () => cargarPedido(id) })
  }
}

// ---------- Entrada y salida de la pantalla ----------

export function mostrarEstado(id) {
  detenerEstado()
  idActual = id
  if (!id) {
    pintarBusqueda()
    return
  }
  cargarPedido(id)
  // El estado cambia en la cocina: se vuelve a consultar cada cierto tiempo
  temporizador = setInterval(() => {
    if (!document.hidden) cargarPedido(id, { silencioso: true })
  }, CADA_CUANTO_ACTUALIZAR)
}

export function detenerEstado() {
  clearInterval(temporizador)
  temporizador = null
  idActual = null
}

// Vuelve a pintar el pedido (por ejemplo, cuando ya llegó el menú y hay nombres)
export function refrescarEstado() {
  if (idActual) cargarPedido(idActual, { silencioso: true })
}
