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

inputFecha.addEventListener('change', actualizarHorariosDisponibles);
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

        window.location.href = datos.linkWhatsApp;

    }   catch (error) {
        console.error(error);
        alert('No se pudo conectar con el servidor. ¿Está corriendo el backend?');
    }
});