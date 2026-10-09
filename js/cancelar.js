const API_URL = 'http://localhost:3000';
const cancelarCard = document.getElementById('cancelarCard');

function obtenerIdDeURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

async function cargarTurno() {
    const id = obtenerIdDeURL();

    if (!id) {
        cancelarCard.innerHTML = '<p class="cancelar-card__estado cancelar-card__estado--error">No se encontró ningún turno en este link.</p>';
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/turnos/${id}`);

        if (!respuesta.ok) {
            cancelarCard.innerHTML = '<p class="cancelar-card__estado cancelar-card__estado--error">Este turno ya no existe (puede que ya haya sido cancelado).</p>';
            return;
        }

        const turno = await respuesta.json();

        cancelarCard.innerHTML = `
            <h2 id="saludoTurno">Tu turno</h2>
            <div class="cancelar-card__detalle">
                <p><strong>Servicio:</strong> ${turno.servicio || 'No especificado'}</p>
                <p><strong>Fecha:</strong> ${turno.fecha}</p>
                <p><strong>Horario:</strong> ${turno.horaInicio} a ${turno.horaFin}</p>
            </div>
            <button type="button" class="btn btn--ghost btn--block" id="btnCancelar">Cancelar este turno</button>
        `;

        // El nombre lo escribió el cliente en el formulario: va con textContent (nunca con innerHTML)
        // para que el navegador lo muestre como texto y no lo interprete como HTML
        if (turno.primerNombre) {
            document.getElementById('saludoTurno').textContent = `Hola ${turno.primerNombre}, este es tu turno`;
        }

        document.getElementById('btnCancelar').addEventListener('click', () => cancelarTurno(id));

    } catch (error) {
        console.error(error);
        cancelarCard.innerHTML = '<p class="cancelar-card__estado cancelar-card__estado--error">No se pudo conectar con el servidor.</p>';
    }
}

async function cancelarTurno(id) {
    try {
        const respuesta = await fetch(`${API_URL}/turnos/${id}`, { method: 'DELETE' });

        if (!respuesta.ok) {
            cancelarCard.innerHTML = '<p class="cancelar-card__estado cancelar-card__estado--error">No se pudo cancelar el turno.</p>';        
            return;
        }
        
        cancelarCard.innerHTML = '<p class="cancelar-card__estado cancelar-card__estado--exito">✓ Turno cancelado con éxito.</p>';

    } catch (error) {
        console.error(error);
        cancelarCard.innerHTML = '<p class="cancelar-card__estado cancelar-card__estado--error">No se pudo conectar con el servidor.</p>';
    }
}

cargarTurno();
