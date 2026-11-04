# El Oreja Details — Sistema de turnos online

Página web para un negocio de detailing de autos con **reserva de turnos online**: el cliente elige servicio, vehículo, día y horario, y el turno se agenda solo en el Google Calendar del negocio. Después puede **reprogramarlo o cancelarlo** desde un link, sin tener que escribirle a nadie.

🔗 **Demo:** https://gerovilche.github.io/El-Oreja-Details/
⚙️ **Backend:** [El-Oreja-Backend](https://github.com/GeroVilche/El-Oreja-Backend)

> Es una demo: las fotos y los precios son de ejemplo, y los turnos llegan a mi propio calendario. Podés sacar uno de prueba sin problema.

![Captura del sitio](img/captura-proyecto.webp)

## Funcionalidades
- **Reserva de turnos:** solo muestra los horarios libres según la duración de cada servicio y el horario del negocio.
- **Tarjeta del turno:** al reservar aparece un resumen y el botón para confirmar por WhatsApp; en ese mensaje le queda al cliente el link para ver, reprogramar o cancelar su turno.
- **Reprogramar y cancelar** desde un link único, con las reglas del negocio (por ejemplo, cancelar hasta 24 h antes y reprogramar una sola vez).
- **Días bloqueados:** si el negocio cierra un día (feriado, imprevisto), el cliente se entera y puede mover el turno sin límites.
- **Validación del formulario** con mensajes claros y accesibles (`aria-invalid`, `aria-describedby`).
- **Responsive:** pensado primero para celular.
- **SEO básico:** meta etiquetas, imagen para compartir en redes (Open Graph) y favicon.

## Tecnologías
- HTML, CSS y JavaScript (sin frameworks, con módulos ES)
- Consume la API REST del backend (Node.js + Express + Google Calendar API)
- Deploy en **GitHub Pages** (frontend) y **Render** (backend)

## Estructura
```
index.html          → página principal (servicios, cómo reservar, formulario de turnos)
cancelar.html       → página del link para ver, reprogramar o cancelar un turno
css/                → estilos separados por sección (variables, componentes, hero, turnos...)
js/config.js        → decide a qué backend le habla (local o Render)
js/turnos.js        → formulario de reserva y validación
js/tarjeta-turno.js → tarjeta del turno (la usan la reserva y la página de cancelar)
js/cancelar.js      → lógica de la página de cancelar/reprogramar
```

## Cómo correrlo en local
1. Levantar el [backend](https://github.com/GeroVilche/El-Oreja-Backend) en `http://localhost:3000`.
2. Abrir `index.html` con **Live Server** (VS Code).
3. `js/config.js` detecta que estás en `localhost` y usa el backend local; en cualquier otro lado usa el de Render.

## Lo que aprendí
- Llevar un proyecto de la maqueta a producción, con deploy separado de front y back.
- Trabajar con Git usando una rama por tarea y pull requests.
- Diseñar pensando en el usuario final y en el dueño del negocio, que no es técnico.
- Accesibilidad y validación de formularios sin librerías.

## Autor
**Gerónimo Vilche** — [Portfolio](https://gerovilche.github.io/Portfolio/) · [LinkedIn](https://www.linkedin.com/in/geronimo-vilche-160ab4274/)
