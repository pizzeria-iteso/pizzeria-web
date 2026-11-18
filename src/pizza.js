// Muestra la pizza con imágenes reales y la actualiza con animaciones
// cuando cambian el tamaño, la masa o los ingredientes.

// Qué tan grande se ve la pizza según el tamaño
const ESCALA_POR_TAMANO = { chica: 0.78, mediana: 0.89, grande: 1 }

// Hasta dónde pueden caer ingredientes según la masa
// (fracción del radio de la pizza: entre más gruesa la orilla, menos espacio)
const ZONA_POR_MASA = { delgada: 0.74, tradicional: 0.66, 'orilla-rellena': 0.62 }

// Tamaño de cada pieza como fracción del ancho de la pizza (proporciones reales)
const TAMANO_PIEZA = {
  pepperoni: 0.15,
  jamon: 0.12,
  champinones: 0.12,
  pimiento: 0.15,
  cebolla: 0.15,
  aceitunas: 0.075,
  pina: 0.095,
  'extra-queso': 0.14,
}

// Orden fijo de los ingredientes: decide qué lugares de la pizza le tocan a cada uno
const ORDEN = ['pepperoni', 'jamon', 'champinones', 'pimiento', 'cebolla', 'aceitunas', 'pina', 'extra-queso']
const PIEZAS_POR_INGREDIENTE = 7
const TOTAL_LUGARES = ORDEN.length * PIEZAS_POR_INGREDIENTE
const ANGULO_DORADO = Math.PI * (3 - Math.sqrt(5))

export const imagenMasa = (id) => `/img/pizza-${id}.webp`
export const imagenIngrediente = (id, variante = 1) => `/img/ingredientes/${id}-${variante}.webp`

// Número "aleatorio" pero siempre el mismo para la misma entrada,
// así la pizza no cambia de acomodo cada vez que se redibuja.
function azar(n) {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

// 56 lugares repartidos de forma pareja en todo el círculo (patrón de girasol)
const LUGARES = Array.from({ length: TOTAL_LUGARES }, (_, j) => {
  const radio = Math.sqrt((j + 0.5) / TOTAL_LUGARES) + (azar(j) - 0.5) * 0.05
  const angulo = j * ANGULO_DORADO
  return {
    x: Math.cos(angulo) * radio,
    y: Math.sin(angulo) * radio,
    giro: Math.round(azar(j + 200) * 360),
    escala: 0.9 + azar(j + 300) * 0.2,
    variante: (j % 3) + 1,
  }
})

// Reparte los lugares entre los ingredientes: en cada ronda, cada ingrediente toma
// el lugar libre más lejano de sus otras piezas. Así cada ingrediente queda
// distribuido por toda la pizza y nunca comparte lugar con otro.
const LUGARES_POR_INGREDIENTE = (() => {
  const libres = new Set(LUGARES.keys())
  const asignados = ORDEN.map(() => [])
  for (let ronda = 0; ronda < PIEZAS_POR_INGREDIENTE; ronda++) {
    ORDEN.forEach((_, k) => {
      let mejor = -1
      let mejorDistancia = -1
      for (const j of libres) {
        const propios = asignados[k]
        const distancia = propios.length
          ? Math.min(...propios.map((i) => Math.hypot(LUGARES[i].x - LUGARES[j].x, LUGARES[i].y - LUGARES[j].y)))
          : azar(j + k * 31)
        if (distancia > mejorDistancia) {
          mejorDistancia = distancia
          mejor = j
        }
      }
      libres.delete(mejor)
      asignados[k].push(mejor)
    })
  }
  return asignados.map((indices) => indices.map((i) => LUGARES[i]))
})()

function lugaresDe(id) {
  let k = ORDEN.indexOf(id)
  if (k === -1) k = [...id].reduce((s, c) => s + c.charCodeAt(0), 0) % ORDEN.length
  return LUGARES_POR_INGREDIENTE[k]
}

// Precarga las imágenes para que no parpadeen la primera vez que aparecen
export function precargarImagenes(menu) {
  for (const masa of menu.crusts) new Image().src = imagenMasa(masa.id)
  for (const ingrediente of menu.toppings) {
    for (let v = 1; v <= 3; v++) new Image().src = imagenIngrediente(ingrediente.id, v)
  }
}

export function crearPizza(contenedor, menu) {
  contenedor.innerHTML = `
    <div class="pizza-escena">
      <div class="pizza-sombra"></div>
      <div class="pizza">
        ${menu.crusts
          .map((m) => `<img class="pizza-base" data-masa="${m.id}" src="${imagenMasa(m.id)}" alt="" />`)
          .join('')}
        <div class="pizza-ingredientes"></div>
      </div>
    </div>`

  const pizza = contenedor.querySelector('.pizza')
  const bases = contenedor.querySelectorAll('.pizza-base')
  const capa = contenedor.querySelector('.pizza-ingredientes')
  const grupos = new Map() // id del ingrediente -> <div> con sus piezas

  // Convierte el lugar (de -1 a 1) a porcentaje dentro de la pizza
  function colocar(pieza, lugar, zona) {
    pieza.style.left = `${50 + lugar.x * zona * 50}%`
    pieza.style.top = `${50 + lugar.y * zona * 50}%`
  }

  function crearGrupo(id, zona) {
    const grupo = document.createElement('div')
    grupo.className = 'grupo-ingrediente'
    lugaresDe(id).forEach((lugar, i) => {
      const pieza = document.createElement('img')
      pieza.className = 'pieza'
      pieza.src = imagenIngrediente(id, lugar.variante)
      pieza.alt = ''
      pieza.style.setProperty('--tam', `${(TAMANO_PIEZA[id] ?? 0.12) * 100 * lugar.escala}%`)
      pieza.style.setProperty('--giro', `${lugar.giro}deg`)
      pieza.style.animationDelay = `${i * 55}ms`
      pieza.lugar = lugar
      colocar(pieza, lugar, zona)
      grupo.append(pieza)
    })
    return grupo
  }

  return {
    actualizar({ sizeId, crustId, toppingIds }) {
      // Tamaño: la pizza crece o se encoge
      pizza.style.setProperty('--escala', ESCALA_POR_TAMANO[sizeId] ?? 0.89)

      // Masa: se muestra la imagen de esa masa (con transición suave)
      bases.forEach((img) => img.classList.toggle('activa', img.dataset.masa === crustId))

      // Los ingredientes se reacomodan si la masa deja más o menos espacio
      const zona = ZONA_POR_MASA[crustId] ?? 0.66
      for (const grupo of grupos.values()) {
        grupo.querySelectorAll('.pieza').forEach((pieza) => colocar(pieza, pieza.lugar, zona))
      }

      // Ingredientes que se quitaron: se desvanecen y luego se borran
      for (const [id, grupo] of grupos) {
        if (!toppingIds.includes(id)) {
          grupo.classList.add('saliendo')
          setTimeout(() => grupo.remove(), 300)
          grupos.delete(id)
        }
      }

      // Ingredientes nuevos: caen sobre la pizza
      for (const id of toppingIds) {
        if (!grupos.has(id)) {
          const grupo = crearGrupo(id, zona)
          capa.append(grupo)
          grupos.set(id, grupo)
        }
      }
    },
  }
}
