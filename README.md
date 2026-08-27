# Diario de Progreso de Juegos

Diario personal para llevar el registro del progreso de los juegos instalados en tu PC. Sin backend, sin cuentas, sin build: es HTML/CSS/JS plano que corre 100% en el navegador y guarda todo en `localStorage`, pensado para usarse en una sola computadora.

## Funcionalidades

- **Biblioteca de juegos**: agregá juegos con nombre, carátula (URL o imagen subida) y estado (jugando / completado / pausado / abandonado), filtrable por estado.
- **Diario por juego**: cada juego tiene su propia línea de tiempo de entradas fechadas, editables y borrables.
- **Progreso en texto libre**: en vez de una barra de % (poco útil cuando no se sabe el total del juego), hay un campo de "progreso actual" a mano alzada, más el historial completo del diario.
- **Horas jugadas**: contador manual por juego (con botones rápidos +0.5 / +1), editable en cualquier momento.
- **Mapa de calor de actividad**: un calendario estilo GitHub por juego que marca los días con al menos un registro en el diario.
- **Detección semi-automática de guardado** (Chrome/Edge, vía [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API)): elegís el archivo o carpeta de guardado de un juego y, mientras la pestaña esté abierta, la app revisa periódicamente si cambió. Al detectar un guardado nuevo te pide un nombre para la entrada y la agrega sola al diario (las horas se cargan a mano, no se estiman automáticamente).
- **Actualización en vivo**: si estás viendo el detalle de un juego y se detecta un guardado en segundo plano, la vista se refresca sola.

## Cómo usarla

1. Abrí [`index.html`](index.html) directamente en el navegador (doble clic) o serví la carpeta con cualquier servidor estático.
2. Recomendado: Chrome o Edge, para tener disponible la detección de guardado. En otros navegadores (Firefox, Safari) esa sección se oculta automáticamente y el resto de la app funciona igual.
3. Todo se guarda en el `localStorage` de ese navegador en esa PC — no hay sincronización entre dispositivos ni backend.

### Sobre el seguimiento de archivos

- El permiso de acceso al archivo/carpeta elegido se pierde al reiniciar el navegador (limitación del navegador, no de la app). Cuando pase, la app te va a mostrar un botón de "Reautorizar acceso" en el detalle del juego.
- El seguimiento de carpetas solo revisa el primer nivel de archivos (no subcarpetas).

## Estructura del proyecto

```
index.html
css/styles.css
js/
  constants.js     -- enums y configuración
  utils.js         -- helpers (uuid, fechas, downscale de imágenes, debounce)
  storage.js       -- CRUD sobre localStorage + migraciones de esquema
  db.js            -- IndexedDB: persistencia de los FileSystemHandle
  fileWatcher.js    -- polling, permisos y detección de guardado
  router.js         -- ruteo por hash
  ui/
    toast.js        -- notificaciones no bloqueantes
    heatmap.js       -- mapa de calor de actividad
    modal.js          -- modal "Agregar juego"
    library.js         -- biblioteca (grid + filtros)
    gameDetail.js       -- detalle de juego (campos, diario, watch)
  app.js               -- punto de entrada
```

No hay build ni dependencias — todo se carga con `<script>` clásicos.
