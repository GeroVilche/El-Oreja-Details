window.addEventListener('load', () => {
  console.log('Ancho de contenido:', document.documentElement.scrollWidth);
  console.log('Ancho de pantalla:', document.documentElement.clientWidth);
});



const inputFecha = document.getElementById('fecha');
const selectServicio = document.getElementById('servicio');
const selectHora = document.getElementById('hora');

const API_URL = 'http://localhost:3000';

async function actualizarHorariosDisponibles() {
    const fecha = inputFecha.value;
    const servicio = selectServicio.value;

    // Si todavia falta elegir fecha o servicio, no hacemos nada
    if (!fecha || !servicio) {
        return;
    }

    // Mientras esperamos la respuesta, mostramos un mensaje de carga
    selectHora.innerHTML = 'option value="" selected disabled>Cargando horarios...</option>';

    try {
        const url = `${API_URL}/disponibilidad?fecha=${fecha}&servicio=${encodeURIComponent(servicio)}`;
        const respuesta = await fetch(url);
        const datos = await respuesta.json();

        if (datos.horariosDisponibles.length === 0) {
            selectHora.innerHTML = 'option value="" selected disabled>No hay horarios disponibles ese día</option>';
            return;
        }

        selectHora.innerHTML = '<option value="" selected disabled>Elegí un horario</option>'
    
        datos.horariosDisponibles.forEach(hora => {
            const opcion = document.createElement('option');
            opcion.value = hora;
            opcion.textContent = hora;
            selectHora.appendChild(opcion);
        });

    } catch (error) {
    console.error(error);
    selectHora.innerHTML = '<option value="" selected disabled>Error al cargar horarios</option>'
    }
}

inputFecha.addEventListener('change', actualizarHorariosDisponibles); inputFecha.addEventListener('change', actualizarCalendarioVisual);
selectServicio.addEventListener('change', actualizarHorariosDisponibles);

const formulario = document.querySelector('.booking-form');

formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const datosTurno = {
        fecha: inputFecha.value,
        horaInicio: selectHora.value,
        servicio: selectServicio.value,
        clienteNombre: document.getElementById('nombre').value,
        clienteTelefono: document.getElementById('telefono').value,
    };

    try {
        const respuesta = await fetch(`${API_URL}/turnos`, {
            method: 'POST',
            headers: { 'Content-Type' : 'application/json' },
            body: JSON.stringify(datosTurno),
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            alert(datos.error || 'Hubo un error al reservar el turno');
            return;
        }

        actualizarCalendarioVisual();

        formulario.innerHTML = `
            <h3>¡Turno reservado! 🎉</h3>
            <p>Guardá este link por si necesitás cancelar tu turno más adelante:</p>
            <p><a href="${datos.linkCancelacion}" target="_blank" rel="noopener">${datos.linkCancelacion}</a></p>
            <a href="${datos.linkWhatsApp}" class="btn btn--primary btn--block" id="btnIrWhatsapp">Continuar a WhatsApp</a>
        `;

    }   catch (error) {
        console.error(error);
        alert('No se pudo conectar con el servidor. ¿Está corriendo el backend?');
    }
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

    const año = fechaActual.getFullYear();
    const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaActual.getDate()).padStart(2, '0');
    inputFecha.value = `${año}-${mes}-${dia}`;

    inputFecha.dispatchEvent(new Event('change'));
}

botonDiaAnterior.addEventListener('click', () => cambiarDia(-1));
botonDiaSiguiente.addEventListener('click', () => cambiarDia(1));