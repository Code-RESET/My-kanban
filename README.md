# Mi Kanban

Tablero kanban personal, estilo iOS. PWA en HTML/CSS/JS puro (ES6 modules), sin build, con Firebase Auth + Firestore. Desarrollado por **Ing. Luis Ángel Díaz Bernal — CODE-RESET**.

## Qué hace

- **Tableros**: crea varios (Personal, Casa, Trabajo…). Cada uno inicia con *Por hacer → En curso → Hecho*.
- **Columnas**: añadir, renombrar, mover izquierda/derecha y eliminar.
- **Tarjetas**: título, notas, fecha límite (en rojo si ya venció) y etiqueta de color.
- **Mover tarjetas**: arrastrando (en teléfono: mantener presionada y arrastrar) o desde la hoja de la tarjeta → "Columna".
- **Flujo visual**: cada columna tiene su color (gris → ámbar → azul → verde) y las tarjetas de la última columna llevan ✓.
- **Cuello de botella**: si una columna intermedia junta 4 o más tarjetas y es la más cargada, se pone roja y el panel lo avisa.
- **Tiempo por tarea**: promedio de días desde que se crea una tarjeta hasta que llega a la última columna (se toma su última modificación como fecha de término).
- **Menú hamburguesa (☰)**: navegación, modo oscuro y cerrar sesión.
- **Modo oscuro**: botón de luna/sol en el encabezado. Sigue al sistema hasta que eliges uno.
- **Ícono personalizado**: en *Ajustes → Ícono de la app* eliges cualquier foto; se recorta cuadrada, se comprime (~15–40 KB) y se guarda en tu cuenta.
- Sincroniza en tiempo real entre dispositivos y funciona sin conexión (caché local de Firestore).

## Estructura

```
index.html                 Shell: login, header, menú lateral
css/styles.css             Estilos (variables de color iOS, claro/oscuro)
js/router.js               Routing por hash; registro de páginas en MODULES
js/auth.js                 Login y cambio login <-> app
js/firebase-config.js      Credenciales de Firebase
js/modules/                Una página por archivo
  boards.js                  #/tableros      lista de tableros
  board.js                   #/tablero/{id}  vista kanban
  settings.js                #/ajustes       cuenta, ícono, tema, créditos
  dashboard.js               plantilla para nuevos módulos (no registrada)
js/components/             Piezas del tablero (solo UI)
  kanban-column.js           HTML de columnas y tarjetas
  board-insights.js          colores por columna, cuello de botella, tiempo por tarea
  card-sheet.js              hoja para crear/editar tarjeta
  drag-drop.js               arrastrar con mouse y dedo
  card-colors.js             colores de etiqueta
js/services/               Único lugar que habla con Firestore
  boards-service.js          tableros y columnas
  cards-service.js           tarjetas y orden
  profile-service.js         ícono personalizado
js/ui/                     Utilidades de interfaz reutilizables
  sheet.js                   hojas inferiores, menús, confirmar, pedir texto
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
users/{uid}/boards/{boardId}               { name, columns: [{id, name}], createdAt, updatedAt }
users/{uid}/boards/{boardId}/cards/{id}    { title, notes, color, dueDate, columnId, order, createdAt, updatedAt }
users/{uid}/settings/app                   { logo, updatedAt }
```

`order` es numérico: al soltar una tarjeta entre dos se usa el promedio, así cada movimiento escribe un solo documento.

## Puesta en marcha

1. Firebase Console → crea el proyecto, activa **Authentication → Correo/contraseña** y **Firestore**.
2. Crea tu usuario en *Authentication → Users* (la app es personal: no tiene registro público).
3. Pega tu `firebaseConfig` en `js/firebase-config.js`.
4. Publica las reglas: copia `firestore.rules` en *Firestore → Reglas* (o `npx firebase deploy --only firestore:rules`).
5. GitHub Pages: Settings → Pages → rama `main`, carpeta `/root`.
6. Si cambias archivos base, sube `CACHE_VERSION` en `service-worker.js`.

## Probar las reglas de seguridad

```
npm i -D firebase-tools @firebase/rules-unit-testing firebase
npx firebase emulators:exec --only firestore --project demo-kanban "node tests/firestore-rules.test.mjs"
```

Cubre: el dueño puede todo en lo suyo; otro usuario o sin sesión no puede leer ni escribir; datos inválidos se rechazan; el ícono solo acepta imágenes `data:image/...` ≤ 300 KB; cualquier otra ruta está cerrada.

## Sobre el ícono de la pantalla de inicio

- **iPhone/iPad**: elige tu foto en Ajustes *antes* de "Compartir → Agregar a inicio"; iOS toma la foto como ícono. Si ya estaba instalada, elimínala y vuelve a agregarla.
- **Android**: el ícono instalado sale de `manifest.json` (archivos `assets/icon-192.png` y `icon-512.png`), que no se puede cambiar desde la app. Para usar tu foto ahí, reemplaza esos dos PNG y sube `CACHE_VERSION`.

## Cómo agregar una página nueva

1. Copia `js/modules/dashboard.js` y renómbralo.
2. Escribe su `render(container, user, params)`; si abre listeners, devuelve una función que los cierre.
3. Regístrala en `MODULES` de `js/router.js` (con `label` e `icon` aparece sola en el menú).
