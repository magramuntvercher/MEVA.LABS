# MEVA.LABS

Bordados, detalles y mucho más, hecho a mano.

Web estática administrable con **Decap CMS**, GitHub y Netlify. Conserva los estilos, la navegación y las fotografías originales. No necesita base de datos ni servidor de aplicación.

## Desarrollo y despliegue

Requisitos: Node.js 22 o superior; Python 3 para el servidor local. No hay paquetes que instalar.

```sh
npm run build
npm test
npm run dev
```

`npm run dev` genera `dist/` y sirve esa carpeta en el puerto 8000. Después de editar datos o plantillas, vuelve a ejecutar `npm run build` y recarga. Las nueve URLs públicas `.html` se mantienen. **La carpeta publicada debe ser `dist`, nunca la raíz ni `templates`.**

Netlify lee `netlify.toml`: rama de producción **main**, comando `npm run build`, publicación `dist`, Node 22. Si había parámetros distintos en el panel, alínealos con estos. No se han publicado ni enviado cambios al remoto desde esta tarea.

## Entrar en /admin e iniciar sesión

1. Despliega estos cambios en el sitio Netlify conectado a `magramuntvercher/MEVA.LABS`, rama `main`.
2. En GitHub, abre **Settings → Developer settings → OAuth Apps → New OAuth App**. Usa la URL pública de tu sitio como Homepage URL y **`https://api.netlify.com/auth/done`** como Authorization callback URL.
3. En los ajustes del sitio de Netlify, busca **Access & security → OAuth → Authentication providers** y añade **GitHub**, con el Client ID y Client Secret de esa OAuth App. Los nombres de los apartados pueden variar en Netlify. Guarda el secreto únicamente allí, nunca en este repositorio o en el chat.
4. Abre `/admin` en tu dominio y pulsa **Iniciar sesión con GitHub**. Autoriza el acceso. La cuenta debe tener permiso de escritura en el repositorio; una organización puede exigir autorización adicional de la aplicación OAuth.

Se usa el backend GitHub de Decap con el proveedor OAuth de Netlify; **no necesita Netlify Identity ni Git Gateway**. Documentación: [GitHub backend](https://decapcms.org/docs/github-backend/) y [autenticación externa](https://decapcms.org/docs/external-oauth-clients/).

El panel es público como página, pero editar y publicar requiere autenticación y permisos en GitHub. No hay contraseñas compartidas. El login y la escritura reales requieren la configuración del sitio y no se pueden validar únicamente en localhost. No actives un backend local sin autenticación en producción.

## Usar el panel

- **Añadir producto:** Productos → Nuevo producto. Rellena nombre, identificador único (minúsculas y guiones), categoría, descripción, precios si existen, fotografías y orden. Activa Disponible. Publica los cambios. El producto se incorporará a su categoría y al selector de diseño; Cuadros bordados se excluye del selector.
- **Cambiar un precio:** Productos → selecciona el producto → Precio / Precio con bordado → Publicar. Un precio vacío usa el texto «Consultar» o el texto indicado. No es necesario escribir HTML. Los importes son números en euros.
- **Subir una foto:** dentro del producto → Fotografías originales → Añadir → Fotografía → subir o seleccionar. Puedes ordenar o quitar referencias. Los nuevos archivos se guardan en `assets/uploads/`, sin transformaciones. Quitar una foto de un producto no obliga a borrar el archivo original. Los contenedores conservan su tamaño y las fotos usan `object-fit: contain`.
- **Añadir tejido:** Tejidos → Nuevo tejido → nombre, identificador, foto opcional, disponibilidad y orden → Publicar. Solo los disponibles aparecen en Diseña tu producto. Desactiva Disponible para marcarlo agotado.
- **Portada:** marca Los más elegidos / En temporada en cada producto. En Portada y configuración → Portada puedes elegir su orden, nombre y fotografía de presentación. Las selecciones explícitas aparecen primero; los demás productos marcados se añaden según su orden. Desmarcar la opción o desactivar/eliminar el producto lo oculta también de la portada. Quitar únicamente una selección de orden no desmarca el producto.
- **Configuración general:** edita gastos de envío, umbral de envío gratis, WhatsApp (prefijo internacional y números, sin `+`), Instagram y email. El teléfono se aplica a enlaces, diseño y presupuestos de Eventos.
- **Eventos:** sus tres variantes existentes están en Productos, categoría Eventos. Conserva sus identificadores del configurador. Sus tarifas por cantidad y opciones de personalización se editan allí. Para crear una nueva variante de Eventos, rellena también Tarifas por cantidad y Personalización (puede ser «Sin bordado» con suplemento 0). Los mínimos, máximo y packaging están en Portada y configuración → Eventos. Si todas están desactivadas, se muestra un aviso y se deshabilita el envío de presupuestos.
- **Eliminar:** abre la entrada y usa Eliminar. Se elimina el contenido del catálogo y los selectores en el siguiente despliegue; no se borran automáticamente fotografías compartidas. Puedes desactivar Disponible para ocultarlo sin eliminarlo.

Publicar en Decap guarda commits en **main** y Netlify vuelve a generar el sitio. Espera a que termine el despliegue antes de comprobar la página pública. Si main exige pull requests, adapta el flujo de publicación a las reglas de protección antes de usar publicaciones directas. Los fallos de compilación dejan activo el último despliegue válido de Netlify.

## Organización y conservación

- `content/products/*.json`: 27 entradas migradas (24 productos del catálogo/portada y 3 variantes de Eventos). Incluye precios, fotos, disponibilidad, tejido, destacados, temporada y orden.
- `content/fabrics/*.json`: los 17 tejidos originales, sin añadir tejidos nuevos ni fotos inventadas.
- `content/settings/*.json`: portada, contacto/envíos y packaging/límites de Eventos.
- `templates/*.html`: los nueve diseños HTML originales, con bloques de datos reemplazables. Las páginas antes situadas en la raíz se han trasladado aquí; se generan con las mismas URLs en `dist/`.
- `scripts/build.mjs`: generador sin dependencias. Escapa contenido y genera los catálogos y configuraciones JavaScript. `dist/assets/productos-config.js` y `dist/assets/eventos-config.js` son salidas; no se editan manualmente.
- `admin/`: Decap 3.8.4 y su configuración. La configuración está escrita en JSON válido como YAML para evitar dependencias.
- `assets/products/`: fotografías originales intactas. `assets/uploads/`: futuras subidas.

Se conservó el estado previo en la rama Git local **`backup/pre-cms-2026-11-16`**, commit `9f8e2c81bdd3f00bfb15c5d249d682d54d5751a6`. No se ha hecho reset, force push ni borrado de la versión anterior en Git. Esa rama es local; si quieres conservarla también en GitHub, súbela antes de sustituir tu despliegue. Los tests incluyen hashes de las fotografías originales y las tarifas originales como referencia independiente de esa rama.

### Datos originales que necesitan revisión editorial

- La portada tenía «Pack bebé: 16 €» y «Neceser: Desde 9 €», mientras sus fichas indicaban «según cantidad» y 7 € respectivamente. Se han conservado **ambos textos originales**, sin inventar una solución. En Portada hay un campo «Texto de precio excepcional»: vaciarlo hace que use automáticamente el precio central del producto.
- El producto Pack coordinado ya existía en portada; ahora tiene una entrada administrable en Packs, sin asignarle un precio inventado.
- Algunos productos no tenían fotos o precio: siguen sin fotos y con «Consultar».
- Ya faltaban estos archivos, referenciados en la portada: `assets/pack-lanyard-scrunchie.jpg`, `assets/pack-bebe.jpg`, `assets/instagram-feed.png`. Se conservan las referencias sin fabricar imágenes. Sube las fotos originales que correspondan o elige una fotografía existente para las dos selecciones de temporada. La imagen de Instagram sigue en la plantilla porque no se ha solicitado administrar esa sección.

### Validación

`npm test` comprueba integridad de fotografías, migración de tarifas, enlaces locales, configuración CMS y propagación de altas, bajas y cambios de datos a las páginas generadas. La prueba considera explícitamente las tres imágenes que ya faltaban; no las declara correctas.

Se comprobó además en Chromium: las nueve páginas, carruseles, menú móvil, selectores de diseño, bordado y observaciones, construcción de mensajes de WhatsApp sin enviarlos, límites y tramos de Eventos, suplementos, packaging y añadir/quitar líneas. La pantalla de login de Decap y su configuración se comprueban sin iniciar sesión ni publicar contenido real.
