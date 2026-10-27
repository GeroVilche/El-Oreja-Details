// PÁGINA DEL TURNO (cancelar.html)
// Acá se llega con el link del mensaje de WhatsApp (?id=...). Esta página solo busca el turno
// y le pide a js/tarjeta-turno.js que lo dibuje: toda la lógica de reprogramar y cancelar
// está ahí, compartida con el modal de index.html.
import { mostrarTarjetaTurno, mostrarEstadoFinal } from './tarjeta-turno.js';

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
        mostrarEstadoFinal(cancelarCard, 'No se encontró ningún turno en este link.', 'error');
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/turnos/${id}`);

        if (!respuesta.ok) {
            mostrarEstadoFinal(cancelarCard, 'Este turno ya no existe (puede que ya haya sido cancelado).', 'error');
            return;
        }

        const turno = await respuesta.json();

        // Después de cancelar, en esta página vuelvo solo al inicio (en el modal, en cambio, se cierra)
        mostrarTarjetaTurno(cancelarCard, turno, { modo: 'link', alCancelar: iniciarRedireccion });

    } catch (error) {
        console.error(error);
        mostrarEstadoFinal(cancelarCard, 'No se pudo conectar con el servidor.', 'error');
    }
}

// Después de cancelar con éxito: vuelve solo al inicio, con la cuenta regresiva a la vista
function iniciarRedireccion() {
    let segundosRestantes = SEGUNDOS_REDIRECCION;

    const aviso = document.createElement('p');
    aviso.className = 'tarjeta-turno__aviso';
    cancelarCard.querySelector('.tarjeta-turno__estado').after(aviso);

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
