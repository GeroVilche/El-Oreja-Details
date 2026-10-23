const inputFecha = document.getElementById('fecha');
const selectServicio = document.getElementById('servicio');
const selectHora = document.getElementById('hora');


// CONFIGURACIÓN DEL NEGOCIO
// Los servicios, vehículos, horario y anticipación no están escritos acá: los pido al backend
// (GET /configuracion), que los lee de config/negocio.js. Si cambia algo del negocio, se cambia allá.
// Ojo: hasta que llega la respuesta, configuracion vale null.
let configuracion = null;

const selectVehiculo = document.getElementById('vehiculo');

// Reemplazo las opciones de un <select> por las de la lista que le paso, con la opción
// "Elegí..." primero (vacía y deshabilitada, para que el required obligue a elegir otra).
function llenarSelect(select, textoInicial, opciones) {
    select.innerHTML = '';

    const opcionInicial = document.createElement('option');
    opcionInicial.value = '';
    opcionInicial.textContent = textoInicial;
    opcionInicial.disabled = true;
    opcionInicial.selected = true;
    select.appendChild(opcionInicial);

    opciones.forEach(texto => {
        const opcion = document.createElement('option');
        opcion.value = texto;
        opcion.textContent = texto; // textContent: el texto viene de la API, nunca como HTML
        select.appendChild(opcion);
    });
}

async function cargarConfiguracion() {
    const respuesta = await fetch(`${API_URL}/configuracion`);
    if (!respuesta.ok) {
        throw new Error(`GET /configuracion respondió ${respuesta.status}`);
    }
    configuracion = await respuesta.json();

    // De cada servicio ({ nombre, duracion }) el <select> solo necesita el nombre
    const nombresDeServicios = configuracion.servicios.map(servicio => servicio.nombre);
    llenarSelect(selectServicio, 'Elegí un plan', nombresDeServicios);
    llenarSelect(selectVehiculo, 'Elegí una opción', configuracion.vehiculos);
}

async function actualizarHorariosDisponibles() {
    const fecha = inputFecha.value;
    const servicio = selectServicio.value;

    // Si todavia falta elegir fecha o servicio, no hacemos nada
    if (!fecha || !servicio) {
        return;
    }

    // Guardamos el horario que ya estaba elegido, para no perderlo al recargar la lista
    const horaElegida = selectHora.value;

    // Mientras esperamos la respuesta, mostramos un mensaje de carga
    selectHora.innerHTML = '<option value="" selected disabled>Cargando horarios...</option>';

    try {
        const url = `${API_URL}/disponibilidad?fecha=${fecha}&servicio=${encodeURIComponent(servicio)}`;
        const respuesta = await fetch(url);
        const datos = await respuesta.json();

        if (datos.horariosDisponibles.length === 0) {
            selectHora.innerHTML = '<option value="" selected disabled>No hay horarios disponibles ese día</option>';
            return;
        }

        selectHora.innerHTML = '<option value="" selected disabled>Elegí un horario</option>';
    
        datos.horariosDisponibles.forEach(hora => {
            const opcion = document.createElement('option');
            opcion.value = hora;
            opcion.textContent = hora;
            selectHora.appendChild(opcion);
        });

        // Si el horario que tenía elegido sigue libre, lo dejamos seleccionado
        if (datos.horariosDisponibles.includes(horaElegida)) {
            selectHora.value = horaElegida;
        }

    } catch (error) {
    console.error(error);
    selectHora.innerHTML = '<option value="" selected disabled>Error al cargar horarios</option>';
    }
}

// FECHAS
// Date -> "AAAA-MM-DD" (el formato que usa el <input type="date">), con la hora LOCAL del usuario.
// Ojo: NO usar fecha.toISOString(): devuelve la fecha en UTC, y en Argentina (UTC-3)
// a partir de las 21:00 ya daría el día siguiente.
function formatearFechaISO(fecha) {
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
}

// Regla del negocio: los turnos se reservan con al menos 1 día de anticipación (desde mañana),
// así Santi revisa la agenda del día siguiente y no le caen turnos nuevos sobre la marcha.
// Para permitir reservar en el día, cambiar a 0.
const DIAS_DE_ANTICIPACION = 1;
// Y como máximo hasta 60 días adelante (el backend aplica las mismas dos reglas)
const DIAS_MAXIMOS_DE_ANTICIPACION = 60;

// Fecha "AAAA-MM-DD" de dentro de N días
function fechaDentroDeDias(dias) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);
    return formatearFechaISO(fecha);
}

// Primer y último día que se pueden reservar
function primeraFechaReservable() {
    return fechaDentroDeDias(DIAS_DE_ANTICIPACION);
}

function ultimaFechaReservable() {
    return fechaDentroDeDias(DIAS_MAXIMOS_DE_ANTICIPACION);
}

// `min` bloquea en el selector del navegador los días que no se pueden reservar, y si igual
// llega una fecha anterior (escrita a mano, o la página quedó abierta desde ayer) la corregimos.
// Las fechas "AAAA-MM-DD" se pueden comparar como texto: el orden alfabético coincide con el cronológico.
function aplicarLimiteDeFecha() {
    const primeraFecha = primeraFechaReservable();
    const ultimaFecha = ultimaFechaReservable();
    inputFecha.min = primeraFecha;
    inputFecha.max = ultimaFecha;

    if (!inputFecha.value || inputFecha.value < primeraFecha) {
        inputFecha.value = primeraFecha;
    } else if (inputFecha.value > ultimaFecha) {
        inputFecha.value = ultimaFecha;
    }
}

// El orden importa: primero se corrige la fecha, después se usan los datos de esa fecha
inputFecha.addEventListener('change', aplicarLimiteDeFecha);
inputFecha.addEventListener('change', actualizarHorariosDisponibles);
inputFecha.addEventListener('change', actualizarCalendarioVisual);
selectServicio.addEventListener('change', actualizarHorariosDisponibles);

const formulario = document.querySelector('.booking-form');

// MENSAJES DE ERROR DEL FORMULARIO (reemplazan a los alert() del navegador)
const mensajeError = document.getElementById('formError');
const botonReservar = formulario.querySelector('.booking-form__submit');
const TEXTO_BOTON_RESERVAR = botonReservar.textContent.trim();

function mostrarErrorFormulario(texto) {
    mensajeError.textContent = texto; // textContent: el texto viene del backend, nunca como HTML
    mensajeError.hidden = false;
    mensajeError.scrollIntoView({ block: 'nearest' });
}

function ocultarErrorFormulario() {
    mensajeError.hidden = true;
}

// Apenas el usuario cambia algo para corregir, el error viejo deja de tener sentido
formulario.addEventListener('input', ocultarErrorFormulario);
formulario.addEventListener('change', ocultarErrorFormulario);

formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    ocultarErrorFormulario();

    // Desactivamos el botón mientras se reserva: un doble clic no puede mandar dos reservas
    botonReservar.disabled = true;
    botonReservar.textContent = 'Reservando...';

    const datosTurno = {
        fecha: inputFecha.value,
        horaInicio: selectHora.value,
        servicio: selectServicio.value,
        clienteNombre: document.getElementById('nombre').value,
        clienteTelefono: document.getElementById('telefono').value,
        vehiculo: document.getElementById('vehiculo').value,
        comentario: document.getElementById('comentario').value,
    };

    try {
        const respuesta = await fetch(`${API_URL}/turnos`, {
            method: 'POST',
            headers: { 'Content-Type' : 'application/json' },
            body: JSON.stringify(datosTurno),
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            mostrarErrorFormulario(datos.error || 'No se pudo reservar el turno. Revisá los datos y probá de nuevo.');

            // 409 = alguien reservó ese horario mientras el usuario completaba el formulario:
            // recargamos los horarios para que elija otro de los que siguen libres
            if (respuesta.status === 409) {
                actualizarHorariosDisponibles();
                actualizarCalendarioVisual();
            }
            return;
        }

        actualizarCalendarioVisual();
        mostrarReservaExitosa(datosTurno, datos);

    }   catch (error) {
        console.error(error);
        mostrarErrorFormulario('No pudimos conectarnos con el sistema de turnos. Probá de nuevo en unos minutos o escribinos por WhatsApp.');
    } finally {
        // finally se ejecuta siempre (salga bien, mal o con error): el botón vuelve a la normalidad
        botonReservar.disabled = false;
        botonReservar.textContent = TEXTO_BOTON_RESERVAR;
    }
});

// PANEL DE RESERVA EXITOSA
// Antes se hacía formulario.innerHTML = ..., y eso DESTRUÍA el formulario (había que recargar
// para reservar otro turno). Ahora el formulario solo se oculta y se muestra este panel aparte.
const panelExito = document.getElementById('reservaExito');
const tituloExito = document.getElementById('reservaExitoTitulo');
const resumenReserva = document.getElementById('reservaResumen');
const btnIrWhatsapp = document.getElementById('btnIrWhatsapp');
const btnVerTurno = document.getElementById('btnVerTurno');
const btnOtroTurno = document.getElementById('btnOtroTurno');

// "2026-10-10" -> "sábado 10 de octubre"
function formatearFechaLarga(fecha) {
    return new Date(fecha + 'T00:00:00')
        .toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
        .replace(',', '');
}

function mostrarReservaExitosa(datosTurno, respuestaBackend) {
    resumenReserva.textContent =
        `${datosTurno.servicio}, el ${formatearFechaLarga(datosTurno.fecha)} a las ${datosTurno.horaInicio}.`;

    btnIrWhatsapp.href = respuestaBackend.linkWhatsApp;
    btnVerTurno.href = respuestaBackend.linkCancelacion;

    formulario.hidden = true;
    panelExito.hidden = false;

    // En el celular el formulario es largo: llevamos la vista al panel y le damos el foco
    // (así un lector de pantalla también anuncia "¡Turno reservado!")
    panelExito.scrollIntoView({ block: 'nearest' });
    tituloExito.focus({ preventScroll: true });
}

// "Reservar otro turno": vuelve el formulario. Mantenemos nombre, teléfono y fecha
// (lo más probable es que sea la misma persona) y limpiamos el resto.
btnOtroTurno.addEventListener('click', () => {
    selectServicio.value = '';
    document.getElementById('vehiculo').value = '';
    document.getElementById('comentario').value = '';
    selectHora.innerHTML = '<option value="" selected disabled>Elegí fecha y servicio primero</option>';

    panelExito.hidden = true;
    formulario.hidden = false;

    actualizarCalendarioVisual();
    formulario.scrollIntoView({ block: 'nearest' });
    selectServicio.focus({ preventScroll: true });
});

// CALENDARIO VISUAL
const HORA_INICIO_CALENDARIO = 9;    // 9:00, coincide con el horario de apertura
const HORA_FIN_CALENDARIO = 18;     // 18:00, coincide con el cierre
const ALTO_POR_HORA_PX = 36;       // 2.25rem = 36px (asumiendo 1rem = 16px)

const horasLabels = document.getElementById('horasLabels');
const turnosTrack = document.getElementById('turnosTrack');
const diaLabel = document.getElementById('diaLabel');

function horaAMinutosFrontend(hora) {
    const [horas, minutos] = hora.split(':').map(Number);
    return horas * 60 + minutos;
}

function dibujarFranjasHorarias() {
    horasLabels.innerHTML = '';
    turnosTrack.innerHTML = '';

    for (let h = HORA_INICIO_CALENDARIO; h < HORA_FIN_CALENDARIO; h++) {
        const etiqueta = document.createElement('span');
        etiqueta.textContent = String(h).padStart(2, '0');
        horasLabels.appendChild(etiqueta);

        const franja = document.createElement('div');
        franja.className = 'day-schedule__slot';
        turnosTrack.appendChild(franja);
    }
}

async function actualizarCalendarioVisual() {
    const fecha = inputFecha.value;

    if (!fecha) {
        diaLabel.textContent = 'Elegí una fecha';
        return
    }

    actualizarFlechas();

    const fechaObj = new Date(fecha + 'T00:00:00');
    diaLabel.textContent = fechaObj.toLocaleDateString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long',
    });

    dibujarFranjasHorarias();

    try {
        const respuesta = await fetch(`${API_URL}/turnos?fecha=${fecha}`);
        const turnosDelDia = await respuesta.json();

        turnosDelDia.forEach(turno => {
            const inicioMin = horaAMinutosFrontend(turno.horaInicio) - HORA_INICIO_CALENDARIO * 60;
            const finMin = horaAMinutosFrontend(turno.horaFin) - HORA_INICIO_CALENDARIO * 60;

            const bloque = document.createElement('div');
            bloque.className = 'day-schedule__block';
            bloque.style.top = `${(inicioMin / 60) * ALTO_POR_HORA_PX}px`;
            bloque.style.height = `${((finMin - inicioMin) / 60) * ALTO_POR_HORA_PX}px`;
            turnosTrack.appendChild(bloque);
        });

    } catch (error) {
        console.error(error);
    }
}

//Funcionalidad de las flechas del calendario visual para cambiar de dia
const botonDiaAnterior = document.getElementById('diaAnterior');
const botonDiaSiguiente = document.getElementById('diaSiguiente');

function cambiarDia(delta) {
    if (!inputFecha.value) return;

    const fechaActual = new Date(inputFecha.value + 'T00:00:00');
    fechaActual.setDate(fechaActual.getDate() + delta);
    const nuevaFecha = formatearFechaISO(fechaActual);

    // Por las dudas (las flechas ya se desactivan): nunca salir del rango reservable
    if (nuevaFecha < primeraFechaReservable() || nuevaFecha > ultimaFechaReservable()) return;

    inputFecha.value = nuevaFecha;
    inputFecha.dispatchEvent(new Event('change'));
}

// En el primer/último día reservable, las flechas no tienen a dónde ir
function actualizarFlechas() {
    botonDiaAnterior.disabled = inputFecha.value <= primeraFechaReservable();
    botonDiaSiguiente.disabled = inputFecha.value >= ultimaFechaReservable();
}

botonDiaAnterior.addEventListener('click', () => cambiarDia(-1));
botonDiaSiguiente.addEventListener('click', () => cambiarDia(1));

// Al volver a esta pestaña (por ej. después de cancelar un turno en otra pestaña, o si
// otra persona reservó mientras tanto), recargamos los datos para no mostrar información vieja
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;

    aplicarLimiteDeFecha(); // por si la página quedó abierta de un día para otro
    actualizarCalendarioVisual();

    // Los horarios del <select> solo importan si el formulario está a la vista
    if (!formulario.hidden) {
        actualizarHorariosDisponibles();
    }
});

// AL CARGAR LA PÁGINA: arrancamos en el primer día que se puede reservar.
// Va al final del archivo porque usa constantes (horasLabels, botonDiaAnterior, etc.) que se
// declaran más arriba: si lo llamáramos antes de esas líneas, todavía no existirían.
async function iniciar() {
    try {
        await cargarConfiguracion();
    } catch (error) {
        console.error(error);
        // Sin la config no puedo armar el formulario: aviso y desactivo el botón para que no intente reservar
        mostrarErrorFormulario('No pudimos cargar el sistema de turnos. Recargá la página en unos minutos o escribinos por WhatsApp.');
        botonReservar.disabled = true;
        return;
    }

    aplicarLimiteDeFecha();
    actualizarCalendarioVisual();
}

iniciar();