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
            <div class="cancelar-card__acciones" id="accionesTurno"></div>
        `;

        // El nombre lo escribió el cliente en el formulario: va con textContent (nunca con innerHTML)
        // para que el navegador lo muestre como texto y no lo interprete como HTML
        if (turno.primerNombre) {
            document.getElementById('saludoTurno').textContent = `Hola ${turno.primerNombre}, este es tu turno`;
        }

        mostrarBotonCancelar(id);

    } catch (error) {
        console.error(error);
        cancelarCard.innerHTML = '<p class="cancelar-card__estado cancelar-card__estado--error">No se pudo conectar con el servidor.</p>';
    }
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
