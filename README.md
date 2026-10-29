# Mi Kanban

Tablero kanban personal, estilo iOS. PWA en HTML/CSS/JS puro (ES6 modules), sin build, con Firebase Auth + Firestore. Desarrollado por **Ing. Luis Ángel Díaz Bernal — CODE-RESET**.

## Qué hace

- **Tableros**: crea varios (Personal, Casa, Trabajo…). Cada uno inicia con *Por hacer → En curso → Hecho*.
- **Tareas del día y subtareas**: columna inicial para tareas principales; sus subtareas (separadas por coma) caen en *Por hacer* y avanzan con ›. La principal muestra su avance y las horas que faltan.
- **↺ Repetir**: para trabajos repetitivos, regresa de un toque las subtareas de una tarea (o todo el tablero, desde •••) a *Por hacer*, en su orden original.
- **Tiempo estimado**: cada tarea lleva sus horas (1 h, 5 h…); el tablero y la lista suman lo pendiente.
- **Tablero de control**: la lista de Tableros muestra el avance de cada uno (barra por colores, % terminado) y avisa cuello de botella y tareas vencidas.
- **Mapa del flujo (teléfono)**: arriba del tablero, una pastilla por columna con su conteo; marca dónde estás y al tocarla salta a esa columna.
- **Columnas**: añadir, renombrar, mover izquierda/derecha y eliminar.
- **Tarjetas**: título, notas, fecha límite (en rojo si ya venció) y etiqueta de color.
- **Mover tarjetas**: arrastrando (en teléfono: mantener presionada y arrastrar) o desde la hoja de la tarjeta → "Columna".
- **Flujo visual**: cada columna tiene su color (gris → ámbar → azul → verde) y las tarjetas de la última columna llevan ✓.
- **Cuello de botella**: si una columna intermedia junta 4 o más tarjetas y es la más cargada, se pone roja y el panel lo avisa.
- **Tiempo por tarea**: promedio de días desde que se crea una tarjeta hasta que llega a la última columna (se toma su última modificación como fecha de término).
- **Botón › en cada tarjeta**: la pasa a la siguiente columna con un toque (Por hacer → En curso → … → Hecho).
- **Actualizar app y Novedades**: aviso de versión nueva, botón para actualizar sin reinstalar e historial de mejoras.
- **Menú hamburguesa (☰)**: navegación, modo oscuro y cerrar sesión.
- **Modo oscuro**: botón de luna/sol en el encabezado. Sigue al sistema hasta que eliges uno.
- **Ícono personalizado**: en *Ajustes → Ícono de la app* eliges cualquier foto; se recorta cuadrada, se comprime (~15–40 KB) y se guarda en tu cuenta.
- Sincroniza en tiempo real entre dispositivos y funciona sin conexión (caché local de Firestore).

## Estructura

```
index.html                 Shell: login, header, menú lateral
css/styles.css             Estilos (variables de color iOS, claro/oscuro)
js/version.js              Versión de la app (único lugar)
js/changelog.js            Historial que se muestra en Novedades
js/router.js               Routing por hash; registro de páginas en MODULES
js/auth.js                 Login y cambio login <-> app
js/firebase-config.js      Credenciales de Firebase
js/modules/                Una página por archivo
  boards.js                  #/tableros      tablero de control con todos los tableros
  board.js                   #/tablero/{id}  vista kanban
  settings.js                #/ajustes       cuenta, ícono, tema, versión, créditos
  news.js                    #/novedades     historial de versiones
  dashboard.js               plantilla para nuevos módulos (no registrada)
js/components/             Piezas del tablero (solo UI)
  kanban-column.js           HTML de columnas y tarjetas
  board-insights.js          colores por columna, cuello de botella, tiempo por tarea
  board-summary.js           resumen de cada tablero para la lista (barra, %, alertas)
  flow-map.js                mapa del flujo con pastillas (teléfono)
  task-tree.js               tareas principales/subtareas y tiempo estimado (cálculos)
  card-sheet.js              hoja para crear/editar tarjeta
  drag-drop.js               arrastrar con mouse y dedo
  card-colors.js             colores de etiqueta
js/services/               Único lugar que habla con Firestore
  boards-service.js          tableros y columnas
  cards-service.js           tarjetas y orden
  profile-service.js         ícono personalizado
js/ui/                     Utilidades de interfaz reutilizables
  sheet.js                   hojas inferiores, menús, confirmar, pedir texto
  updater.js                 busca/aplica actualizaciones y avisa novedades
  drawer.js                  menú hamburguesa
  theme.js                   modo claro/oscuro
  brand.js                   aplica el ícono personalizado
  image-resize.js            recorta/comprime la foto
  toast.js, icons.js, dom.js
firestore.rules            Reglas de seguridad
tests/                     Prueba de reglas (solo desarrollo)
```

**Regla de dependencia:** `modules` → `components` / `services` / `ui`. Los componentes no tocan Firestore; los servicios no tocan el DOM.

## Datos en Firestore

```
users/{uid}/boards/{boardId}               { name, columns: [{id, name, kind?}], createdAt, updatedAt }
users/{uid}/boards/{boardId}/cards/{id}    { title, notes, color, dueDate, columnId, order, createdAt, updatedAt, estimate?, parentId? }
users/{uid}/settings/app                   { logo, updatedAt }
```

`order` es numérico: al soltar una tarjeta entre dos se usa el promedio, así cada movimiento escribe un solo documento.

## Puesta en marcha

1. Firebase Console → crea el proyecto, activa **Authentication → Correo/contraseña** y **Firestore**.
2. Crea tu usuario en *Authentication → Users* (la app es personal: no tiene registro público).
3. Pega tu `firebaseConfig` en `js/firebase-config.js`.
4. Publica las reglas: copia `firestore.rules` en *Firestore → Reglas* (o `npx firebase deploy --only firestore:rules`).
5. GitHub Pages: Settings → Pages → rama `main`, carpeta `/root`.
6. Al publicar cambios, sube la versión en `js/version.js` (ver "Versiones y actualizaciones").

## Probar las reglas de seguridad

```
npm i -D firebase-tools @firebase/rules-unit-testing firebase
npx firebase emulators:exec --only firestore --project demo-kanban "node tests/firestore-rules.test.mjs"
```

Cubre: el dueño puede todo en lo suyo; otro usuario o sin sesión no puede leer ni escribir; datos inválidos se rechazan; el ícono solo acepta imágenes `data:image/...` ≤ 300 KB; cualquier otra ruta está cerrada.

## Sobre el ícono de la pantalla de inicio

- **iPhone/iPad**: elige tu foto en Ajustes *antes* de "Compartir → Agregar a inicio"; iOS toma la foto como ícono. Si ya estaba instalada, elimínala y vuelve a agregarla.
- **Android**: el ícono instalado sale de `manifest.json` (archivos `assets/icon-192.png` y `icon-512.png`), que no se puede cambiar desde la app. Para usar tu foto ahí, reemplaza esos dos PNG y sube la versión en `js/version.js`.

## Versiones y actualizaciones

La versión vive en **un solo lugar**: `js/version.js`. El service worker la usa para nombrar su caché, así que ya no hay que tocar `CACHE_VERSION` a mano.

**Para publicar una mejora:**
1. Sube el número en `js/version.js` (ej. `1.3.0` → `1.4.0`).
2. Agrega arriba en `js/changelog.js` qué cambió (sale en *Novedades*).
3. Corre `node tests/version.test.mjs` (revisa que ambos coincidan).
4. Merge a `main`.

**Qué pasa en el teléfono:** la app revisa si hay versión nueva al abrirse, al volver a ella y cada 30 min. Si hay, muestra *"Versión X disponible · Actualizar"* y un punto rojo en ☰. Un toque y se recarga con la versión nueva, sin cerrar ni reinstalar. Después avisa *"Actualizado a vX · Ver novedades"*. También se puede buscar a mano en ☰ → **Actualizar app** o en **Ajustes**.

## Cómo agregar una página nueva

1. Copia `js/modules/dashboard.js` y renómbralo.
2. Escribe su `render(container, user, params)`; si abre listeners, devuelve una función que los cierre.
3. Regístrala en `MODULES` de `js/router.js` (con `label` e `icon` aparece sola en el menú).
