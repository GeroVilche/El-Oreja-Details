const cancelarCard = document.getElementById('cancelarCard');
const PAGINA_INICIO = 'index.html';
const SEGUNDOS_REDIRECCION = 10;

// El turno que se está viendo (lo que devolvió GET /turnos/:id). Lo guardo acá porque lo usan
// varias funciones: el panel de reprogramar necesita la fecha y hora actuales del turno.
let turnoActual = null;

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
        turnoActual = turno;

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
        mostrarDatosTurno(turno.fecha, turno.horaInicio, turno.horaFin);
        cancelarCard.querySelector('.cancelar-card__servicio').textContent = turno.servicio || 'Servicio no especificado';

        if (turno.primerNombre) {
            mostrarSaludo(turno.primerNombre);
        }

        // El backend ya calculó si se puede cancelar (con la hora del servidor, no la del celu
        // del cliente, que puede estar mal). Acá solo muestro lo que corresponde.
        // El mismo límite vale para reprogramar: si se puede cancelar, se puede reprogramar.
        if (turno.sePuedeCancelar) {
            mostrarOpciones(id);
            mostrarNotaLimite(turno.horasLimiteCancelacion);
        } else {
            mostrarSinCancelacionOnline(turno);
        }

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

// Día y horario del turno en la tarjeta. Es una función aparte porque se usa dos veces:
// al cargar la página y después de reprogramar (para mostrar el horario nuevo).
function mostrarDatosTurno(fecha, horaInicio, horaFin) {
    cancelarCard.querySelector('.cancelar-card__dia').textContent = formatearFecha(fecha);
    cancelarCard.querySelector('.cancelar-card__hora').textContent = `${horaInicio} – ${horaFin}`;
}

// "2026-10-10" -> "Sábado 10 de octubre"
function formatearFecha(fecha) {
    const texto = new Date(fecha + 'T00:00:00')
        .toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
        .replace(',', '');
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Estado inicial: las dos opciones. Todavía no se cambia nada.
// Reprogramar va primero y como botón principal: para el negocio es mejor mover un turno que perderlo.
function mostrarOpciones(id) {
    const acciones = document.getElementById('accionesTurno');
    acciones.innerHTML = `
        <div class="cancelar-card__botones">
            <button type="button" class="btn btn--primary btn--block" id="btnReprogramar">Reprogramar</button>
            <button type="button" class="btn btn--ghost btn--block" id="btnCancelar">Cancelar este turno</button>
        </div>
    `;
    document.getElementById('btnReprogramar').addEventListener('click', () => mostrarReprogramacion(id));
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

    btnNo.addEventListener('click', () => mostrarOpciones(id));

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

// Nota debajo de los botones: "Podés cancelarlo online hasta 24 h antes del turno".
// Va afuera de #accionesTurno a propósito: esa parte se reemplaza al confirmar o volver atrás,
// y la nota tiene que quedar siempre. Con límite 0 (testeando en mi compu) no la muestro.
function mostrarNotaLimite(horasLimite) {
    if (horasLimite <= 0) return;

    const nota = document.createElement('p');
    nota.className = 'cancelar-card__nota';
    nota.textContent = `Podés reprogramarlo o cancelarlo online hasta ${horasLimite} h antes del turno.`;
    document.getElementById('accionesTurno').after(nota);
}

// Cuando el backend dice que ya no se puede cancelar online:
//  - si el turno ya pasó, no hay nada que avisar: ofrezco reservar otro.
//  - si falta poco, ofrezco escribirle al negocio por WhatsApp con el mensaje ya armado.
function mostrarSinCancelacionOnline(turno) {
    const acciones = document.getElementById('accionesTurno');

    if (turno.yaPaso) {
        acciones.innerHTML = `
            <p class="cancelar-card__pregunta">Este turno ya pasó.</p>
            <div class="cancelar-card__botones">
                <a href="${PAGINA_INICIO}#turnos" class="btn btn--primary btn--block">Reservar otro turno</a>
            </div>
        `;
        return;
    }

    acciones.innerHTML = `
        <p class="cancelar-card__pregunta" id="avisoLimite"></p>
        <div class="cancelar-card__botones">
            <a class="btn btn--primary btn--block" id="btnAvisarWhatsapp" target="_blank" rel="noopener">Avisar por WhatsApp</a>
            <a href="${PAGINA_INICIO}" class="btn btn--ghost btn--block">Volver al inicio</a>
        </div>
    `;
    // Los datos de la API van después, con textContent y .href (nunca dentro del innerHTML)
    document.getElementById('avisoLimite').textContent =
        `Faltan menos de ${turno.horasLimiteCancelacion} h para tu turno, así que ya no se puede cancelar online. `
        + 'Escribinos por WhatsApp y lo resolvemos.';
    document.getElementById('btnAvisarWhatsapp').href = turno.linkWhatsApp;
}

// ===================== REPROGRAMAR =====================

// "Date" -> "AAAA-MM-DD" con la hora LOCAL (como en turnos.js: NO uso toISOString(), que da UTC)
function formatearFechaISO(fecha) {
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
}

function fechaDentroDeDias(dias) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);
    return formatearFechaISO(fecha);
}

// Panel para elegir el nuevo día y horario, dentro de la misma tarjeta.
// El servicio no se elige: es el del turno (el backend lo saca del propio evento).
async function mostrarReprogramacion(id) {
    const acciones = document.getElementById('accionesTurno');
    acciones.innerHTML = `
        <div class="cancelar-card__reprogramar">
            <p class="cancelar-card__pregunta">Elegí el nuevo día y horario para tu turno.</p>
            <div class="field">
                <label for="nuevaFecha">Día</label>
                <input type="date" id="nuevaFecha" />
            </div>
            <div class="field">
                <label for="nuevaHora">Horario</label>
                <select id="nuevaHora" disabled>
                    <option value="">Cargando horarios...</option>
                </select>
            </div>
            <p class="cancelar-card__error" id="errorReprogramar" role="alert" hidden></p>
            <div class="cancelar-card__botones">
                <button type="button" class="btn btn--primary btn--block" id="btnConfirmarReprogramar" disabled>Confirmar nuevo horario</button>
                <button type="button" class="btn btn--ghost btn--block" id="btnVolverOpciones">Volver</button>
            </div>
        </div>
    `;

    const inputFecha = document.getElementById('nuevaFecha');
    const selectHora = document.getElementById('nuevaHora');
    const btnConfirmar = document.getElementById('btnConfirmarReprogramar');

    document.getElementById('btnVolverOpciones').addEventListener('click', () => mostrarOpciones(id));
    inputFecha.addEventListener('change', () => cargarHorariosReprogramar(id));
    // El botón de confirmar solo se activa cuando hay un horario elegido
    selectHora.addEventListener('change', () => {
        btnConfirmar.disabled = !selectHora.value;
    });
    btnConfirmar.addEventListener('click', () => confirmarReprogramacion(id));

    // Arranco en el mismo día del turno (lo más común es moverlo unas horas).
    inputFecha.value = turnoActual.fecha;

    // Límites del input de fecha: la anticipación sale de la config del negocio (GET /configuracion).
    // Si esto falla no es grave: el backend igual rechaza las fechas fuera de rango.
    try {
        const respuesta = await fetch(`${API_URL}/configuracion`);
        const configuracion = await respuesta.json();
        inputFecha.min = fechaDentroDeDias(configuracion.anticipacion.minimaDias);
        inputFecha.max = fechaDentroDeDias(configuracion.anticipacion.maximaDias);
    } catch (error) {
        console.error(error);
    }

    cargarHorariosReprogramar(id);
}

// Pide al backend los horarios libres de ese día para ESTE turno (ignora el propio turno)
async function cargarHorariosReprogramar(id) {
    const fecha = document.getElementById('nuevaFecha').value;
    const selectHora = document.getElementById('nuevaHora');
    const btnConfirmar = document.getElementById('btnConfirmarReprogramar');

    ocultarErrorReprogramar();
    btnConfirmar.disabled = true;
    selectHora.disabled = true;

    if (!fecha) {
        selectHora.innerHTML = '<option value="">Elegí un día primero</option>';
        return;
    }

    selectHora.innerHTML = '<option value="">Cargando horarios...</option>';

    try {
        const respuesta = await fetch(`${API_URL}/turnos/${id}/disponibilidad?fecha=${fecha}`);
        const datos = await respuesta.json();

        if (!respuesta.ok) {
            selectHora.innerHTML = '<option value="">Sin horarios</option>';
            mostrarErrorReprogramar(datos.error || 'No se pudieron cargar los horarios.');
            return;
        }

        if (datos.cerrado) {
            selectHora.innerHTML = '<option value="">Cerrado ese día</option>';
            return;
        }

        if (datos.horariosDisponibles.length === 0) {
            selectHora.innerHTML = '<option value="">No hay horarios disponibles ese día</option>';
            return;
        }

        selectHora.innerHTML = '<option value="">Elegí un horario</option>';
        datos.horariosDisponibles.forEach(hora => {
            const opcion = document.createElement('option');
            opcion.value = hora;
            opcion.textContent = hora; // textContent: viene de la API
            // Si es el mismo día, el horario que ya tiene aparece marcado y no se puede elegir
            // (moverlo al mismo horario no tiene sentido; el backend también lo rechaza)
            if (fecha === turnoActual.fecha && hora === turnoActual.horaInicio) {
                opcion.textContent = `${hora} (tu horario actual)`;
                opcion.disabled = true;
            }
            selectHora.appendChild(opcion);
        });
        selectHora.disabled = false;

    } catch (error) {
        console.error(error);
        selectHora.innerHTML = '<option value="">Sin horarios</option>';
        mostrarErrorReprogramar('No se pudo conectar con el servidor.');
    }
}

async function confirmarReprogramacion(id) {
    const fecha = document.getElementById('nuevaFecha').value;
    const horaInicio = document.getElementById('nuevaHora').value;
    const btnConfirmar = document.getElementById('btnConfirmarReprogramar');
    const btnVolver = document.getElementById('btnVolverOpciones');

    // Igual que al cancelar: desactivo los botones para que un doble toque no mande dos PATCH
    btnConfirmar.disabled = true;
    btnVolver.disabled = true;
    btnConfirmar.textContent = 'Reprogramando...';
    ocultarErrorReprogramar();

    try {
        const respuesta = await fetch(`${API_URL}/turnos/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fecha, horaInicio }),
        });
        const datos = await respuesta.json().catch(() => ({}));

        if (!respuesta.ok) {
            mostrarErrorReprogramar(datos.error || 'No se pudo reprogramar el turno.');
            btnConfirmar.textContent = 'Confirmar nuevo horario';
            btnVolver.disabled = false;
            // 409 = alguien tomó ese horario mientras tanto: recargo la lista para que elija otro
            if (respuesta.status === 409) {
                cargarHorariosReprogramar(id);
            }
            return;
        }

        mostrarReprogramado(datos);

    } catch (error) {
        console.error(error);
        mostrarErrorReprogramar('No se pudo conectar con el servidor.');
        btnConfirmar.textContent = 'Confirmar nuevo horario';
        btnConfirmar.disabled = false;
        btnVolver.disabled = false;
    }
}

// Listo: la tarjeta pasa a mostrar el horario NUEVO, y ofrezco avisarle al negocio por WhatsApp
// (Santi lo ve en el Calendar, pero así se entera seguro).
function mostrarReprogramado(datos) {
    turnoActual = { ...turnoActual, fecha: datos.fecha, horaInicio: datos.horaInicio, horaFin: datos.horaFin };
    mostrarDatosTurno(datos.fecha, datos.horaInicio, datos.horaFin);

    // La nota del límite ya no aporta en esta pantalla
    document.querySelector('.cancelar-card__nota')?.remove();

    const acciones = document.getElementById('accionesTurno');
    acciones.innerHTML = `
        <p class="cancelar-card__estado cancelar-card__estado--exito">✓ Turno reprogramado. Te esperamos en el nuevo horario.</p>
        <div class="cancelar-card__botones">
            <a class="btn btn--primary btn--block" id="btnAvisarReprogramacion" target="_blank" rel="noopener">Avisar por WhatsApp</a>
            <a href="${PAGINA_INICIO}" class="btn btn--ghost btn--block">Volver al inicio</a>
        </div>
    `;
    document.getElementById('btnAvisarReprogramacion').href = datos.linkWhatsApp;
}

function mostrarErrorReprogramar(texto) {
    const error = document.getElementById('errorReprogramar');
    error.textContent = texto; // textContent: el texto puede venir del backend
    error.hidden = false;
}

function ocultarErrorReprogramar() {
    const error = document.getElementById('errorReprogramar');
    if (error) error.hidden = true;
}

// ===================== CANCELAR =====================

async function cancelarTurno(id) {
    try {
        const respuesta = await fetch(`${API_URL}/turnos/${id}`, { method: 'DELETE' });

        if (!respuesta.ok) {
            // Si el backend explica por qué (ej. el 403 del límite de horas), muestro su mensaje.
            // .catch(() => ({})): si la respuesta no es JSON, sigo con un objeto vacío y uso el texto genérico.
            const datos = await respuesta.json().catch(() => ({}));
            mostrarEstadoFinal(datos.error || 'No se pudo cancelar el turno.', 'error');
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
