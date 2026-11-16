# Instagram real de @meva.labs

## Método elegido

API oficial **Instagram API with Instagram Login**, consultada desde una **Netlify Function** en `netlify/functions/instagram.mjs`. No se usa scraping, una captura estática, un servicio de feeds de pago ni publicaciones de ejemplo. oEmbed incrusta URLs conocidas, pero no descubre las seis publicaciones más recientes y por eso no resuelve este caso.

El navegador solo consulta `/.netlify/functions/instagram`. Recibe hasta seis publicaciones con su URL original, imagen real, fecha y texto. Las publicaciones de vídeo/reels muestran la miniatura oficial con distintivo «Vídeo»; al pulsarla se abre el vídeo original en Instagram. Un carrusel de Instagram muestra su imagen principal con «Varias fotos». No se reproducen automáticamente seis vídeos pesados ni se descargan todas las imágenes de cada carrusel.

El diseño conserva el panel oscuro, colores, bordes redondeados y botón de MEVA. La cuadrícula tiene tres columnas en escritorio y dos hasta 620 px, usa las imágenes completas y tiene hover suave. Los estilos y scripts nuevos solo se cargan en la portada. Las nuevas publicaciones no necesitan editar HTML, pasar por Decap o reconstruir el sitio.

## Requisitos de Meta

1. `@meva.labs` debe ser una cuenta **profesional**: Empresa o Creador. Esta integración no funciona con una cuenta personal. El flujo elegido no requiere vincular una página de Facebook.
2. En [Meta for Developers](https://developers.facebook.com/), crea o abre una app y configura **Instagram → API setup with Instagram login** (el nombre del apartado puede variar). No elijas el antiguo Instagram Basic Display, retirado.
3. Conecta y autoriza `@meva.labs` con el permiso de lectura **`instagram_business_basic`**. No se necesitan permisos de publicación, mensajes o comentarios.
4. Para conectar la cuenta propia durante el desarrollo, usa una cuenta con el rol apropiado en la app y acepta la invitación de prueba de Instagram si Meta la solicita. La cuenta profesional debe estar autorizada para esa app. Para cuentas ajenas a los roles de desarrollo, Meta puede exigir modo Live, Advanced Access, revisión de la aplicación y verificación del negocio; sigue los requisitos que muestre el panel.
5. Genera un **Instagram User Access Token de larga duración** para esa cuenta. Comprueba su fecha de caducidad en Meta. No uses un App Token, un token de Facebook Page ni un token de oEmbed.
6. Obtén el identificador de la cuenta autorizada con una consulta autenticada a `https://graph.instagram.com/v25.0/me?fields=user_id,username`. Usa el `user_id` de Instagram devuelto, no el nombre de usuario, App ID ni Facebook Page ID. Comprueba que `username` sea `meva.labs`. Haz esta consulta en una herramienta privada y no compartas su token ni su respuesta autenticada en el repositorio.

Si la herramienta de Meta entrega un token corto, canjéalo desde un entorno privado por uno de larga duración mediante `GET https://graph.instagram.com/access_token`, con `grant_type=ig_exchange_token`, `client_secret` de la app Instagram y `access_token` corto. El secreto solo se necesita para este intercambio y no se introduce en la web ni en la Function.

La Function usa por defecto la versión **v25.0** de Graph API. Confirma en el panel de tu app que la versión y los permisos estén disponibles; puedes cambiar la versión mediante la variable descrita abajo. El acceso a la documentación de Meta estaba bloqueado por la política de red del entorno durante esta implementación; no se ha comprobado una autorización real, la configuración actual de tu app ni una respuesta en vivo de @meva.labs.

## Configuración exacta en Netlify

En el sitio conectado al repositorio, abre **Project configuration / Site configuration → Environment variables** y añade:

| Variable | Valor | Ámbito |
| --- | --- | --- |
| `INSTAGRAM_ACCESS_TOKEN` | Token de usuario Instagram de larga duración para @meva.labs | Functions; marcar como secreto si se ofrece |
| `INSTAGRAM_USER_ID` | ID numérico de la cuenta autorizada | Functions |
| `INSTAGRAM_API_VERSION` | Opcional, `v25.0` por defecto | Functions |

Aplica los valores al contexto **Production**. No los añadas a `content/`, `admin/config.yml`, archivos publicados en `dist/`, JavaScript del navegador ni a variables `PUBLIC_`/`VITE_`. No hace falta incluirlos en el ámbito Builds: la compilación no consulta Instagram ni genera un archivo con el token. Si quieres probar Deploy Previews, configúralos expresamente también para ese contexto.

El repositorio ya contiene `[functions] directory = "netlify/functions"` en `netlify.toml`. Conserva `npm run build`, publicación `dist` y la rama `main`. Tras guardar las variables, **despliega otra vez** para que el runtime de Functions reciba los valores nuevos.

No necesitas credenciales de Meta en GitHub Actions ni GitHub Secrets para este despliegue directo de Netlify. No hay que añadir una base de datos, una tarea programada ni contratar un servicio de feeds. Se aplica el consumo normal y los límites de Netlify Functions y de Meta; no se garantiza un coste cero fuera de las cuotas de tu plan.

## Actualización y caché

- La portada solicita el feed cuando la sección se acerca al área visible; no consulta Meta en cada carga del catálogo.
- La CDN de Netlify comparte las respuestas entre visitantes con una validez de **una hora** y hasta **cinco minutos** mientras revalida. Los distintos puntos de presencia y nuevas instancias pueden hacer sus propias consultas: no es una promesa de solo una consulta global por hora.
- Cada instancia caliente también mantiene una caché de una hora y agrupa peticiones simultáneas. Una actualización consulta dos endpoints oficiales: el perfil (verifica que sea @meva.labs) y sus publicaciones recientes.
- El navegador puede reutilizar la respuesta durante cinco minutos. Lo nuevo aparecerá al visitar/recargar la página tras vencer las cachés; una pestaña ya abierta no hace sondeo continuo. No se requiere un nuevo despliegue para cada publicación.
- Si Meta falla temporalmente, una instancia con datos previos puede servir su última respuesta válida durante un máximo de 24 horas, con aviso y caché corta. Esto no es un almacén persistente: si no hay copia previa o caduca, se muestra el enlace al perfil. Una imagen de CDN caducada conserva un enlace legible al post, sin fabricar un sustituto.
- Sin credenciales, con un token inválido/caducado o con una cuenta distinta, el endpoint devuelve un error genérico y la sección permite abrir Instagram. No se muestran los detalles privados de Meta.

### Mantenimiento del token

Los tokens largos de Instagram suelen durar **60 días**, según el token y los cambios de Meta. Revísalo en Meta y renueva antes de que expire (por ejemplo, cada 30–45 días). La renovación oficial usa `GET https://graph.instagram.com/refresh_access_token`, con `grant_type=ig_refresh_token` y el token largo vigente; debe tener al menos 24 horas y no estar caducado. Guarda el token devuelto en `INSTAGRAM_ACCESS_TOKEN` de Netlify y despliega de nuevo. Si caduca o se revoca, vuelve a autorizar la cuenta.

Esta solución **actualiza automáticamente las publicaciones mientras el token esté vigente**, pero no automatiza la renovación del token. Automatizarla también exigiría guardar y rotar credenciales de forma persistente; se ha evitado introducir esa infraestructura para un feed de seis publicaciones.

## Validación y límites

`npm test` cubre normalización y orden, límite de seis posts, imágenes/vídeos/carruseles, ausencia de tokens en respuestas y URLs, errores de configuración/API, deduplicación y caché, respuesta obsoleta acotada y rechazo de otra cuenta. Las respuestas de prueba son fixtures sintéticas únicamente de tests; no se publican ni se usan como contenido de la web.

Se puede revisar el frontend con `npm run dev`: el servidor Python no ejecuta Netlify Functions, por lo que se verá el estado de fallback. Para una prueba local completa, usa Netlify CLI (`netlify dev`) con credenciales privadas; para validar producción, configura las variables en Netlify y comprueba el endpoint y la portada desplegados. No añadas tokens al historial del shell, capturas, logs ni commits.

Antes de dar la integración por activa en producción, verifica que el endpoint devuelva `status: "ok"`, `username: "meva.labs"` y las publicaciones reales, que cada enlace abra el post correcto y que el panel tenga tres/dos columnas en escritorio/móvil. Sin esas credenciales, no se ha podido confirmar la recuperación de publicaciones reales.

Referencias oficiales para confirmar el flujo y la renovación:

- https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/
- https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login/
- https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/access-tokens/
- https://docs.netlify.com/platform/caching/
