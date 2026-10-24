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
        
        // Día cerrado: el backend lo avisa con "cerrado: true"
        if (datos.cerrado) {
            selectHora.innerHTML = '<option value="" selected disabled>Cerrado ese día</option>';
            return;
        }

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

// Igual que en el backend: getUTCDay() da 0 = domingo... 6 = sábado, y esta lista lo traduce
// al nombre que usa config/negocio.js. Armo la fecha con "Z" para que no dependa de la zona horaria.
const DIAS_DE_LA_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

// Franjas de atención de una fecha "AAAA-MM-DD". [] = ese día está cerrado.
function franjasDelDia(fecha) {
    const numeroDeDia = new Date(`${fecha}T00:00:00Z`).getUTCDay();
    return configuracion.horarios[DIAS_DE_LA_SEMANA[numeroDeDia]];
}

// Desde una fecha, busco el primer día que se atiende (miro como mucho 7 días: una semana entera).
// Si estuvieran todos cerrados, devuelvo la misma fecha (no debería pasar, pero así no queda en un bucle).
function primerDiaAbiertoDesde(fecha) {
    const dia = new Date(fecha + 'T00:00:00');
    for (let i = 0; i < 7; i++) {
        const candidata = formatearFechaISO(dia);
        if (franjasDelDia(candidata).length > 0) {
            return candidata;
        }
        dia.setDate(dia.getDate() + 1);
    }
    return fecha;
}

// Fecha "AAAA-MM-DD" de dentro de N días
function fechaDentroDeDias(dias) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);
    return formatearFechaISO(fecha);
}

// Primer y último día que se pueden reservar, según la anticipación de config/negocio.js
// (minimaDias: 1 = desde mañana; maximaDias: hasta cuántos días adelante)
function primeraFechaReservable() {
    return fechaDentroDeDias(configuracion.anticipacion.minimaDias);
}

function ultimaFechaReservable() {
    return fechaDentroDeDias(configuracion.anticipacion.maximaDias);
}

// `min` bloquea en el selector del navegador los días que no se pueden reservar, y si igual
// llega una fecha anterior (escrita a mano, o la página quedó abierta desde ayer) la corregimos.
// Las fechas "AAAA-MM-DD" se pueden comparar como texto: el orden alfabético coincide con el cronológico.
function aplicarLimiteDeFecha() {
    if (!configuracion) return; // la config todavía no llegó (ver iniciar())
    
    const primeraFecha = primeraFechaReservable();
    const ultimaFecha = ultimaFechaReservable();
    inputFecha.min = primeraFecha;
    inputFecha.max = ultimaFecha;

    // Si no hay fecha elegida (o quedó vieja), arranco en el primer día que se atiende:
    // si mañana es domingo, la página abre directo en el lunes
    if (!inputFecha.value || inputFecha.value < primeraFecha) {
        inputFecha.value = primerDiaAbiertoDesde(primeraFecha);
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
const ALTO_POR_HORA_PX = 36;       // 2.25rem = 36px (asumiendo 1rem = 16px)

const horasLabels = document.getElementById('horasLabels');
const turnosTrack = document.getElementById('turnosTrack');
const diaLabel = document.getElementById('diaLabel');

function horaAMinutosFrontend(hora) {
    const [horas, minutos] = hora.split(':').map(Number);
    return horas * 60 + minutos;
}

// Todas las franjas de la semana juntas (Object.values da la lista de cada día y .flat() las une en una).
function todasLasFranjas() {
    return Object.values(configuracion.horarios).flat();
}

// El calendario va siempre desde la apertura más temprana de la semana hasta el cierre más tarde.
// Así tiene el mismo alto todos los días y no "salta" al cambiar de día con las flechas.
// Ojo: va por filas de 1 hora, así que redondeo: abre 09:30 -> fila de las 9 (floor); cierra 18:30 -> hasta las 19 (ceil).
function horaInicioCalendario() {
    const aperturas = todasLasFranjas().map(franja => horaAMinutosFrontend(franja.apertura));
    return Math.floor(Math.min(...aperturas) / 60);
}

function horaFinCalendario() {
    const cierres = todasLasFranjas().map(franja => horaAMinutosFrontend(franja.cierre));
    return Math.ceil(Math.max(...cierres) / 60);
}

// Tramos del calendario en que NO se atiende ese día, en minutos desde medianoche:
// del principio del calendario a la primera apertura, los huecos entre franjas (mediodía)
// y del último cierre al final. Un día cerrado no tiene franjas -> un solo tramo: el calendario entero.
function tramosCerrados(fecha) {
    const tramos = [];
    let desde = horaInicioCalendario() * 60;

    franjasDelDia(fecha).forEach(franja => {
        const apertura = horaAMinutosFrontend(franja.apertura);
        if (apertura > desde) {
            tramos.push({ inicio: desde, fin: apertura });
        }
        desde = horaAMinutosFrontend(franja.cierre);
    });

    const finCalendario = horaFinCalendario() * 60;
    if (desde < finCalendario) {
        tramos.push({ inicio: desde, fin: finCalendario });
    }

    return tramos;
}

// Dibujo un bloque en el calendario, de inicioMin a finMin (minutos desde medianoche).
// Lo usan los turnos ocupados y los tramos cerrados: cambia solo la clase.
function dibujarBloque(inicioMin, finMin, clase) {
    const minutosDesdeArriba = inicioMin - horaInicioCalendario() * 60;
    const bloque = document.createElement('div');
    bloque.className = clase;
    bloque.style.top = `${(minutosDesdeArriba / 60) * ALTO_POR_HORA_PX}px`;
    bloque.style.height = `${((finMin - inicioMin) / 60) * ALTO_POR_HORA_PX}px`;
    turnosTrack.appendChild(bloque);
}

function dibujarFranjasHorarias() {
    horasLabels.innerHTML = '';
    turnosTrack.innerHTML = '';

    for (let h = horaInicioCalendario(); h < horaFinCalendario(); h++) {
        const etiqueta = document.createElement('span');
        etiqueta.textContent = String(h).padStart(2, '0');
        horasLabels.appendChild(etiqueta);

        const franja = document.createElement('div');
        franja.className = 'day-schedule__slot';
        turnosTrack.appendChild(franja);
    }
}

async function actualizarCalendarioVisual() {
    if (!configuracion) return; // la config todavía no llegó (ver iniciar())
    
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

    // Primero las horas que no se atiende (rayadas), después los turnos ocupados encima
    tramosCerrados(fecha).forEach(tramo => {
        dibujarBloque(tramo.inicio, tramo.fin, 'day-schedule__block day-schedule__block--cerrado');
    });

    // Día cerrado: lo aviso con un cartel y no consulto turnos (ese día no puede haber)
    if (franjasDelDia(fecha).length === 0) {
        const aviso = document.createElement('p');
        aviso.className = 'day-schedule__cerrado-texto';
        aviso.textContent = 'Cerrado';
        turnosTrack.appendChild(aviso);
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/turnos?fecha=${fecha}`);
        const turnosDelDia = await respuesta.json();

        turnosDelDia.forEach(turno => {
            dibujarBloque(horaAMinutosFrontend(turno.horaInicio), horaAMinutosFrontend(turno.horaFin), 'day-schedule__block');
        });

    } catch (error) {
        console.error(error);
    }
}

//Funcionalidad de las flechas del calendario visual para cambiar de dia
const botonDiaAnterior = document.getElementById('diaAnterior');
const botonDiaSiguiente = document.getElementById('diaSiguiente');

function cambiarDia(delta) {
    if (!configuracion) return; // la config todavía no llegó (ver iniciar())
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