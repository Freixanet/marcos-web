# Identidad del portfolio

Guía para decidir cambios con criterio. Si una propuesta no encaja aquí, o cambia la propuesta o se cambia esta guía a propósito, pero no se improvisa.

---

## 1. La idea central: de turbulento a laminar

**Cojo algo complejo, confuso o caótico y lo convierto en un producto claro que funciona y está publicado.**

No es una metáfora inventada: es lo que demuestran los proyectos.

| Proyecto | Lo turbulento | Lo laminar |
| --- | --- | --- |
| Unshot Studio | Una foto de producto hecha con el móvil | Fotos de catálogo listas para vender |
| Alice | Un agente de IA en un servidor | Una app de iPhone para hablarle y seguir su trabajo |
| Voto en claro | Programas electorales, fuentes y promesas | Una comparación por temas, con fuente y fecha |
| Ep, Súria! | Información municipal dispersa | Una web con servicios, horarios y agenda |

El hero Laminar ya lo cuenta sin palabras: filamentos turbulentos que se ordenan en una corriente limpia. Todo lo demás debería contar lo mismo.

## 2. Posicionamiento

**Frase principal (en uso):**

- EN: *I turn complex ideas into clear, shipped products.*
- ES: *Convierto lo complejo en productos claros y reales.*
- CA: *Converteixo allò complex en productes clars i reals.*

Las tres caben en dos líneas simétricas: diferencia de 1–4 % entre líneas a 375 y 1280 px. Cada idioma está escrito a la medida, por eso no son traducciones literales.

**Subtítulo (en uso):**

- EN: *iPhone apps, web products and AI agents. Designed, built and shipped from Barcelona.*
- ES: *Apps iOS, webs y agentes de IA. Diseñados, construidos y publicados desde Barcelona.*
- CA: *Apps iOS, webs i agents d'IA. Dissenyats, construïts i publicats des de Barcelona.*

Alternativas, si la principal no convence:

- *De idea enredada a producto publicado. Yo solo, si hace falta.* (más directa y con humor)
- *Software con criterio. IA que funciona de verdad.* (más corta y más técnica)

Las herramientas (Swift, TypeScript, Python) van en el subtítulo o en cada proyecto, nunca en el titular: dicen *con qué* trabajas, no *qué consigues*.

## 3. A quién se dirige

Los tres públicos importan por igual: clientes, empresas y usuarios de tus productos. Para no diluir el mensaje:

- **La persona es la marca y los proyectos son la prueba.** Lo mismo sirve a los tres públicos: alguien que resuelve lo complejo y lo termina.
- **Una sola acción principal:** *Escríbeme / Get in touch.* Sirve igual para un encargo que para una oferta de trabajo.
- **Cada proyecto lleva a su producto real**, no a una página intermedia. Eso sirve al público de tus productos.
- **Falta una pieza para el público de empresas:** una línea sobre ti (trayectoria y forma de trabajar) y un enlace a CV o LinkedIn.

## 4. Personalidad

Una mezcla con proporciones fijas, para que no se convierta en un poco de todo:

| Ingrediente | Peso | Dónde aparece |
| --- | --- | --- |
| **Precisión** (sobria, exacta) | La base, ~60 % | Maquetación, tipografía, titulares, descripciones de proyectos |
| **Laboratorio** (experimental, nocturno) | ~30 % | El hero, el movimiento, los momentos de descubrimiento |
| **Humor** (directo, con un punto irónico) | ~10 % | Microtextos: estados vacíos, enlaces sin destino, pie, 404, títulos de sección |

**Cómo suena:**

- Frases cortas. Verbos concretos. Ningún adjetivo que no se pueda demostrar («innovador», «apasionado», «soluciones»).
- El humor nunca va en el titular ni en la descripción de un proyecto. Va en los márgenes.
- Textos en uso que siguen esta voz:
  - Proyectos: «Hecho y publicado» · «Productos reales, publicados y en uso.»
  - Enlaces: «Tira del hilo» · «En abierto»
  - Sin enlace todavía: «Todavía en el horno»

## 5. Sistema visual

### Dos mundos, una regla

- **Noche = laboratorio.** El hero es siempre negro, en tema claro y en tema oscuro. Es donde ocurre la turbulencia y el movimiento.
- **Papel o grafito = resultado.** El contenido sigue el tema: papel cálido en claro y grafito en oscuro. Es donde las cosas ya están claras y ordenadas.
- La transición del hero al contenido es el paso de turbulento a laminar: se cuida, no es un corte.

### Color: un solo acento, tres usos

Hoy hay unos diez naranjas en el CSS. Deben quedar tres, y nada más:

| Token | Valor | Uso |
| --- | --- | --- |
| `--ember` | `#F5824B` | Acción principal sobre fondo oscuro (CTA del hero) |
| `--ember-ink` | `#A93D23` | Acento y enlaces sobre papel claro (contraste 5,5:1 con el crema) |
| `--ember-glow` | `#FFA470` | Solo luz y movimiento (filamentos de Laminar), nunca texto ni botones |

El resto es neutro: negro, papel, grafito y sus grises. Si algo necesita destacar y no es una acción, se destaca con tamaño o posición, no con color.

### Tipografía: tres familias, tres papeles

- **Geist**: titulares y nombres de proyecto.
- **IBM Plex Sans**: texto corrido.
- **Martian Mono**: solo etiquetas y metadatos, pequeños y en mayúsculas (categorías, fechas, idioma). Nunca en párrafos.

### Simetría de líneas

Es una seña de identidad: los títulos se leen como bloques compactos, con líneas casi iguales.

- **Títulos (hero y secciones):** entre la línea más larga y la más corta, como mucho un **10 %** de diferencia. Nada de una última línea corta ni de líneas en escalera.
- **Mismo número de líneas en los tres idiomas** en el titular del hero, a ser posible tres.
- **Cómo se consigue, por orden:**
  1. `text-wrap: balance` en todos los títulos.
  2. Si no basta, se reescribe la frase en ese idioma: un sinónimo más corto o más largo.
  3. Si sigue sin bastar, se ajusta el ancho máximo del bloque.
  4. Nunca se fuerzan saltos con `<br>`, porque se rompen en otros anchos.
- **Se comprueba** en 375, 1280 y 1920 px, en los tres idiomas.
- **Párrafos:** `text-wrap: pretty`, sin una palabra sola en la última línea.

Referencia: el titular actual en inglés tiene tres líneas de 443, 456 y 417 px a 1124 px de ancho (9 %). Ese es el listón.

### Movimiento

- **Un protagonista por pantalla.** El hero tiene Laminar; el resto de la página está quieto o casi quieto.
- **El movimiento cuenta el paso de caos a orden**: convergencias, flujos y cosas que se alinean. No decora.
- Las transiciones de interfaz duran menos de 200 ms y son discretas.
- Siempre se respeta «reducir movimiento» y siempre va a 60 fps en un iPhone.

### Motivos

- **Sí:** líneas, filamentos, corrientes, convergencias y retículas que se ordenan.
- **No:** astrolabios, brújulas, radares o marcas de grados (estética HUD); nada figurativo (cerebros, neuronas, caballos de ajedrez, bombillas); clichés de IA (redes neuronales de neón, lluvia tipo Matrix).
- **Sin flechas para indicar enlaces** (↗, →). Que algo es clicable se nota por el cursor y por la sombra que aparece al pasar el ratón, no por un icono.
- **Sin bordes para separar tarjetas del fondo.** Las tarjetas se distinguen por su imagen y por el tono de su superficie, no por un contorno.
- **Excepción por ahora:** el astrolabio del menú móvil se mantiene por decisión propia. La regla anterior vale para el resto de la web.

## 6. Antes de cualquier cambio

1. ¿Hace algo **más claro** o solo más llamativo?
2. ¿Usa **un solo acento**, y en el uso que le toca?
3. ¿Hay **un único protagonista** en la pantalla?
4. ¿**Suena a mí**: preciso, curioso y con el humor solo en los márgenes?
5. ¿Funciona en **tema claro y oscuro**, en **móvil y en 2560 px**?
6. ¿Los títulos mantienen la **simetría de líneas** (≤ 10 %) en los tres idiomas?
7. ¿Va a **60 fps en un iPhone** y respeta «reducir movimiento»?

Si alguna respuesta es «no», el cambio no está listo.

## 7. Lo que hoy no encaja con esta guía

Por orden de impacto:

1. ~~**El titular del hero**~~ → hecho: frase principal y subtítulo nuevos, con simetría de líneas en los tres idiomas.
2. ~~**Diez naranjas**~~ → hecho: `--ember`, `--ember-ink` y `--ember-glow` en `styles.css`; los estados al pasar el ratón se derivan de ellos.
3. ~~**El astrolabio del menú móvil**~~ → se mantiene por ahora, como excepción explícita (ver «Motivos»). Si más adelante se cambia, la alternativa es un fragmento de Laminar o nada.
4. **«Cuaderno / Field notes»** sigue sin destino y muestra «Todavía en el horno» → darle una dirección cuando exista, o quitarlo.
5. ~~**Títulos de sección genéricos**~~ → hecho: «Hecho y publicado», «Tira del hilo · En abierto».
6. **Falta la pieza para empresas** → una línea sobre ti y un enlace a CV o LinkedIn.
7. ~~**Recursos de direcciones anteriores**~~ → hecho: archivados en `archivo/site/`, fuera de lo que se publica.
