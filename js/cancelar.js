const cancelarCard = document.getElementById('cancelarCard');
const PAGINA_INICIO = 'index.html';
const SEGUNDOS_REDIRECCION = 10;

function obtenerIdDeURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

async function cargarTurno() {
    const id = obtenerIdDeURL();

    if (!id) {
        mostrarEstadoFinal('No se encontró ningún turno en este link.', 'error');
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/turnos/${id}`);

        if (!respuesta.ok) {
            mostrarEstadoFinal('Este turno ya no existe (puede que ya haya sido cancelado).', 'error');
            return;
        }

        const turno = await respuesta.json();

        // La estructura va con innerHTML (es texto fijo, escrito por nosotros) y los datos que
        // vienen de la API se ponen después con textContent: así nunca se interpretan como HTML
        cancelarCard.innerHTML = `
            <h1 class="cancelar-card__titulo" id="saludoTurno">Tu turno</h1>
            <p class="cancelar-card__subtitulo">Estos son los datos de tu turno.</p>
            <div class="cancelar-card__turno">
                <p class="cancelar-card__dia"></p>
                <p class="cancelar-card__hora"></p>
                <p class="cancelar-card__servicio"></p>
            </div>
            <div class="cancelar-card__acciones" id="accionesTurno"></div>
        `;
        cancelarCard.querySelector('.cancelar-card__dia').textContent = formatearFecha(turno.fecha);
        cancelarCard.querySelector('.cancelar-card__hora').textContent = `${turno.horaInicio} – ${turno.horaFin}`;
        cancelarCard.querySelector('.cancelar-card__servicio').textContent = turno.servicio || 'Servicio no especificado';

        if (turno.primerNombre) {
            mostrarSaludo(turno.primerNombre);
        }

        mostrarBotonCancelar(id);

    } catch (error) {
        console.error(error);
        mostrarEstadoFinal('No se pudo conectar con el servidor.', 'error');
    }
}

// "Hola, Juan" con el nombre resaltado en color.
// El nombre lo escribió el cliente en el formulario: va con textContent (nunca con innerHTML)
// para que el navegador lo muestre como texto y no lo interprete como HTML
function mostrarSaludo(primerNombre) {
    const titulo = document.getElementById('saludoTurno');
    const nombre = document.createElement('span');
    nombre.className = 'cancelar-card__nombre';
    nombre.textContent = primerNombre;

    titulo.textContent = 'Hola, ';
    titulo.append(nombre);
}

// "2026-10-10" -> "Sábado 10 de octubre"
function formatearFecha(fecha) {
    const texto = new Date(fecha + 'T00:00:00')
        .toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
        .replace(',', '');
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Estado inicial: un solo botón. Todavía no se borra nada.
function mostrarBotonCancelar(id) {
    const acciones = document.getElementById('accionesTurno');
    acciones.innerHTML = `
        <button type="button" class="btn btn--ghost btn--block" id="btnCancelar">Cancelar este turno</button>
    `;
    document.getElementById('btnCancelar').addEventListener('click', () => mostrarConfirmacion(id));
}

// Segundo paso: pedimos confirmación antes de borrar (cancelar no se puede deshacer)
function mostrarConfirmacion(id) {
    const acciones = document.getElementById('accionesTurno');
    acciones.innerHTML = `
        <p class="cancelar-card__pregunta">¿Seguro que querés cancelar este turno? No se puede deshacer.</p>
        <div class="cancelar-card__botones">
            <button type="button" class="btn btn--primary btn--block" id="btnSiCancelar">Sí, cancelar</button>
            <button type="button" class="btn btn--ghost btn--block" id="btnNoCancelar">No, mantener mi turno</button>
        </div>
    `;

    const btnSi = document.getElementById('btnSiCancelar');
    const btnNo = document.getElementById('btnNoCancelar');

    btnNo.addEventListener('click', () => mostrarBotonCancelar(id));

    btnSi.addEventListener('click', () => {
        // Desactivamos los botones para que un doble toque no mande dos DELETE
        btnSi.disabled = true;
        btnNo.disabled = true;
        btnSi.textContent = 'Cancelando...';
        cancelarTurno(id);
    });

    // El foco va a la opción segura: si alguien aprieta Enter sin querer, no cancela
    btnNo.focus();
}

async function cancelarTurno(id) {
    try {
        const respuesta = await fetch(`${API_URL}/turnos/${id}`, { method: 'DELETE' });

        if (!respuesta.ok) {
            mostrarEstadoFinal('No se pudo cancelar el turno.', 'error');
            return;
        }

        mostrarEstadoFinal('✓ Turno cancelado con éxito.', 'exito');
        iniciarRedireccion();

    } catch (error) {
        console.error(error);
        mostrarEstadoFinal('No se pudo conectar con el servidor.', 'error');
    }
}

// Pantalla final (éxito o error): mensaje + salidas claras, para que el usuario nunca quede "encerrado" acá
function mostrarEstadoFinal(mensaje, tipo) {
    cancelarCard.innerHTML = `
        <p class="cancelar-card__estado cancelar-card__estado--${tipo}" id="mensajeEstado"></p>
        <div class="cancelar-card__botones">
            <a href="${PAGINA_INICIO}#turnos" class="btn btn--primary btn--block">Reservar otro turno</a>
            <a href="${PAGINA_INICIO}" class="btn btn--ghost btn--block">Volver al inicio</a>
        </div>
    `;
    document.getElementById('mensajeEstado').textContent = mensaje;
}

// Después de cancelar con éxito: vuelve solo al inicio, con la cuenta regresiva a la vista
function iniciarRedireccion() {
    let segundosRestantes = SEGUNDOS_REDIRECCION;

    const aviso = document.createElement('p');
    aviso.className = 'cancelar-card__aviso';
    document.getElementById('mensajeEstado').after(aviso);

    const actualizarAviso = () => {
        aviso.textContent = `Te llevamos al inicio en ${segundosRestantes} s...`;
    };
    actualizarAviso();

    const intervalo = setInterval(() => {
        segundosRestantes--;

        if (segundosRestantes <= 0) {
            clearInterval(intervalo);
            window.location.href = PAGINA_INICIO;
            return;
        }

        actualizarAviso();
    }, 1000);
}

cargarTurno();
