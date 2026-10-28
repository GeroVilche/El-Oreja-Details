// TARJETA DEL TURNO (compartida)
// La usan dos páginas:
//  - index.html: en el modal que aparece apenas se reserva (modo 'reserva')
//  - cancelar.html: la página a la que se llega con el link del WhatsApp (modo 'link')
// Por eso está en su propio archivo: si cambio algo de la tarjeta, cambia en los dos lados.
//
// Es un MÓDULO de JavaScript: lo que declaro acá no se mezcla con las variables de otros archivos,
// y solo se puede usar desde afuera lo que marco con "export". Los archivos que la usan la traen
// con "import" (y en el HTML se cargan con <script type="module">).
// Ojo: API_URL no se importa: viene de js/config.js, que es un script común y la deja global.

const PAGINA_INICIO = 'index.html';

// "2026-10-10" -> "Sábado 10 de octubre"
function formatearFecha(fecha) {
    const texto = new Date(fecha + 'T00:00:00')
        .toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
        .replace(',', '');
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Date -> "AAAA-MM-DD" con la hora LOCAL (NO uso toISOString(), que da UTC)
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

// Pantalla final (después de cancelar, o un error al cargar): mensaje + salidas claras,
// para que el usuario nunca quede "encerrado".
//  - Con opciones.alTerminar (modal): un botón "Reservar otro turno" que cierra el modal.
//  - Sin eso (página del link): links al formulario y al inicio.
export function mostrarEstadoFinal(contenedor, mensaje, tipo, opciones = {}) {
    const botones = opciones.alTerminar
        ? '<button type="button" class="btn btn--primary btn--block" data-accion="terminar">Reservar otro turno</button>'
        : `<a href="${PAGINA_INICIO}#turnos" class="btn btn--primary btn--block">Reservar otro turno</a>
           <a href="${PAGINA_INICIO}" class="btn btn--ghost btn--block">Volver al inicio</a>`;

    contenedor.innerHTML = `
        <p class="tarjeta-turno__estado tarjeta-turno__estado--${tipo}"></p>
        <div class="tarjeta-turno__botones">${botones}</div>
    `;
    contenedor.querySelector('.tarjeta-turno__estado').textContent = mensaje;

    if (opciones.alTerminar) {
        contenedor.querySelector('[data-accion="terminar"]').addEventListener('click', opciones.alTerminar);
    }
}

// Dibuja la tarjeta de un turno dentro de "contenedor".
//   turno: lo que devuelve el backend (GET /turnos/:id, o "turno" en la respuesta de POST /turnos)
//   opciones:
//     modo: 'reserva' (recién reservó, en el modal) o 'link' (volvió con el link). Por defecto 'link'.
//     linkWhatsApp: (modo reserva) el link del mensaje de la reserva
//     alCambiar(turno, linkWhatsApp): aviso que el turno cambió -> el turno nuevo y el link del aviso
//                       al reprogramar, o null al cancelar (index.html lo usa para actualizar el
//                       calendario de atrás y para reabrir la tarjeta con los datos nuevos)
//     alCancelar(): después de cancelar con éxito (cancelar.html arranca la redirección al inicio)
//     alTerminar(): (modo reserva) botones "Reservar otro turno" / "Listo" -> cierra el modal
//
// Todas las funciones de adentro "ven" contenedor, turno y opciones sin pasárselos (clausura):
// cada tarjeta tiene sus propios datos aunque el código sea el mismo.
export function mostrarTarjetaTurno(contenedor, turnoInicial, opciones = {}) {
    const modo = opciones.modo || 'link';
    let turno = { ...turnoInicial }; // copia: al reprogramar la actualizo sin tocar el objeto original

    // Busco SIEMPRE dentro de la tarjeta (y no con document.getElementById), así no choca con otros
    // elementos de la página aunque tengan nombres parecidos
    const buscar = (selector) => contenedor.querySelector(selector);

    // La estructura va con innerHTML (texto fijo, mío) y los datos de la API después con textContent
    contenedor.innerHTML = `
        <h2 class="tarjeta-turno__titulo"></h2>
        <p class="tarjeta-turno__subtitulo"></p>
        <div class="tarjeta-turno__datos">
            <p class="tarjeta-turno__dia"></p>
            <p class="tarjeta-turno__hora"></p>
            <p class="tarjeta-turno__servicio"></p>
        </div>
        <div class="tarjeta-turno__acciones"></div>
    `;

    mostrarEncabezado();
    mostrarDatos();
    mostrarOpciones();

    // ---------- Partes de la tarjeta ----------

    function mostrarEncabezado() {
        const titulo = buscar('.tarjeta-turno__titulo');
        const subtitulo = buscar('.tarjeta-turno__subtitulo');

        if (modo === 'reserva') {
            titulo.textContent = '¡Turno reservado!';
            subtitulo.textContent = 'Último paso: enviá el mensaje por WhatsApp. Ahí te queda guardado el link para ver, reprogramar o cancelar tu turno.';
            return;
        }

        // "Hola, Juan" con el nombre en color. El nombre lo escribió el cliente: va con textContent
        titulo.textContent = 'Tu turno';
        if (turno.primerNombre) {
            const nombre = document.createElement('span');
            nombre.className = 'tarjeta-turno__nombre';
            nombre.textContent = turno.primerNombre;
            titulo.textContent = 'Hola, ';
            titulo.append(nombre);
        }
        subtitulo.textContent = 'Estos son los datos de tu turno.';
    }

    function mostrarDatos() {
        buscar('.tarjeta-turno__dia').textContent = formatearFecha(turno.fecha);
        buscar('.tarjeta-turno__hora').textContent = `${turno.horaInicio} – ${turno.horaFin}`;
        buscar('.tarjeta-turno__servicio').textContent = turno.servicio || 'Servicio no especificado';
    }

    // Texto chico debajo de las acciones:
    //  - si ya usó su reprogramación, explico por qué no aparece el botón
    //  - si no, el límite de horas ("Podés reprogramarlo o cancelarlo online hasta 24 h antes").
    //    Con límite 0 (testeando en mi compu) no lo muestro.
    function notaLimite() {
        if (turno.diaBloqueado) return ''; // ese caso ya lo explica el aviso de arriba
        if (turno.agotoReprogramaciones) {
            return '<p class="tarjeta-turno__nota">Ya reprogramaste este turno. Si necesitás otro horario, cancelalo y reservá uno nuevo.</p>';
        }
        if (turno.horasLimiteCancelacion <= 0) return '';
        return `<p class="tarjeta-turno__nota">Podés reprogramarlo o cancelarlo online hasta ${turno.horasLimiteCancelacion} h antes del turno.</p>`;
    }

    // ---------- Estado inicial: las acciones ----------
    // El backend ya calculó qué se puede hacer (con su hora, no la del celu del cliente):
    //  - sePuedeCancelar: solo depende del límite de horas
    //  - sePuedeReprogramar: límite de horas Y que no haya usado ya sus reprogramaciones
    //  - si Santi bloqueó el día (diaBloqueado), el backend ya manda las dos en true (sin límites)
    function mostrarOpciones() {
        const acciones = buscar('.tarjeta-turno__acciones');

        if (modo === 'reserva') {
            // Recién reservó: lo principal es mandar el WhatsApp. Reprogramar y cancelar quedan
            // disponibles pero discretos (como links), porque en este momento es raro usarlos.
            let secundarias = '<p class="tarjeta-turno__nota">Si necesitás cambiarlo, escribinos por WhatsApp.</p>';
            if (turno.sePuedeCancelar) {
                const links = [];
                if (turno.sePuedeReprogramar) {
                    links.push('<button type="button" class="tarjeta-turno__link" data-accion="reprogramar">Reprogramar</button>');
                }
                links.push('<button type="button" class="tarjeta-turno__link" data-accion="cancelar">Cancelar turno</button>');
                // join: si hay dos links, los separo con un punto; si hay uno solo, va solo
                secundarias = `<div class="tarjeta-turno__secundarias">${links.join('<span aria-hidden="true">·</span>')}</div>`
                    + (turno.agotoReprogramaciones ? notaLimite() : '');
            }

            acciones.innerHTML = `
                <div class="tarjeta-turno__botones">
                    <a class="btn btn--primary btn--block" data-accion="whatsapp" target="_blank" rel="noopener">Enviar por WhatsApp</a>
                </div>
                ${secundarias}
            `;
            buscar('[data-accion="whatsapp"]').href = opciones.linkWhatsApp;

        } else if (turno.sePuedeCancelar) {
            // Volvió con el link: reprogramar va primero y como principal (mejor mover un turno que perderlo)
            // Si ya no puede reprogramar, queda solo "Cancelar" (y la nota explica por qué)
            const botonReprogramar = turno.sePuedeReprogramar
                ? '<button type="button" class="btn btn--primary btn--block" data-accion="reprogramar">Reprogramar</button>'
                : '';
            // Si Santi cerró el día del turno, lo aviso arriba de los botones (y no aplican los límites)
            const avisoDiaBloqueado = turno.diaBloqueado
                ? '<p class="tarjeta-turno__alerta">El negocio no va a abrir ese día. Elegí otro horario o cancelá el turno, sin ningún cargo ni límite.</p>'
                : '';
            acciones.innerHTML = `
                ${avisoDiaBloqueado}
                <div class="tarjeta-turno__botones">
                    ${botonReprogramar}
                    <button type="button" class="btn btn--ghost btn--block" data-accion="cancelar">Cancelar este turno</button>
                </div>
                ${notaLimite()}
            `;

        } else {
            mostrarSinCambiosOnline();
            return;
        }

        buscar('[data-accion="reprogramar"]')?.addEventListener('click', mostrarReprogramacion);
        buscar('[data-accion="cancelar"]')?.addEventListener('click', mostrarConfirmacion);
    }

    // Ya no se puede cancelar ni reprogramar online:
    //  - si el turno ya pasó, ofrezco reservar otro
    //  - si falta poco, ofrezco escribirle al negocio por WhatsApp con el mensaje ya armado
    function mostrarSinCambiosOnline() {
        const acciones = buscar('.tarjeta-turno__acciones');

        if (turno.yaPaso) {
            acciones.innerHTML = `
                <p class="tarjeta-turno__pregunta">Este turno ya pasó.</p>
                <div class="tarjeta-turno__botones">
                    <a href="${PAGINA_INICIO}#turnos" class="btn btn--primary btn--block">Reservar otro turno</a>
                </div>
            `;
            return;
        }

        acciones.innerHTML = `
            <p class="tarjeta-turno__pregunta"></p>
            <div class="tarjeta-turno__botones">
                <a class="btn btn--primary btn--block" data-accion="whatsapp" target="_blank" rel="noopener">Avisar por WhatsApp</a>
                <a href="${PAGINA_INICIO}" class="btn btn--ghost btn--block">Volver al inicio</a>
            </div>
        `;
        buscar('.tarjeta-turno__pregunta').textContent =
            `Faltan menos de ${turno.horasLimiteCancelacion} h para tu turno, así que ya no se puede cambiar online. `
            + 'Escribinos por WhatsApp y lo resolvemos.';
        buscar('[data-accion="whatsapp"]').href = turno.linkWhatsApp;
    }

    // ---------- Cancelar ----------

    // Segundo paso: pido confirmación antes de borrar (cancelar no se puede deshacer)
    function mostrarConfirmacion() {
        const acciones = buscar('.tarjeta-turno__acciones');
        acciones.innerHTML = `
            <p class="tarjeta-turno__pregunta">¿Seguro que querés cancelar este turno? No se puede deshacer.</p>
            <div class="tarjeta-turno__botones">
                <button type="button" class="btn btn--primary btn--block" data-accion="si">Sí, cancelar</button>
                <button type="button" class="btn btn--ghost btn--block" data-accion="no">No, mantener mi turno</button>
            </div>
        `;

        const btnSi = buscar('[data-accion="si"]');
        const btnNo = buscar('[data-accion="no"]');

        btnNo.addEventListener('click', mostrarOpciones);
        btnSi.addEventListener('click', () => {
            // Desactivo los botones para que un doble toque no mande dos DELETE
            btnSi.disabled = true;
            btnNo.disabled = true;
            btnSi.textContent = 'Cancelando...';
            cancelarTurno();
        });

        // El foco va a la opción segura: si alguien aprieta Enter sin querer, no cancela
        btnNo.focus();
    }

    async function cancelarTurno() {
        try {
            const respuesta = await fetch(`${API_URL}/turnos/${turno.id}`, { method: 'DELETE' });

            if (!respuesta.ok) {
                // Si el backend explica por qué (ej. el 403 del límite), muestro su mensaje.
                // .catch(() => ({})): si la respuesta no es JSON, sigo con un objeto vacío.
                const datos = await respuesta.json().catch(() => ({}));
                mostrarEstadoFinal(contenedor, datos.error || 'No se pudo cancelar el turno.', 'error', opcionesDelFinal());
                return;
            }

            mostrarEstadoFinal(contenedor, '✓ Turno cancelado con éxito.', 'exito', opcionesDelFinal());
            opciones.alCambiar?.(null); // ?.() = "llamala solo si me la pasaron"
            opciones.alCancelar?.();

        } catch (error) {
            console.error(error);
            mostrarEstadoFinal(contenedor, 'No se pudo conectar con el servidor.', 'error', opcionesDelFinal());
        }
    }

    // En el modal, la pantalla final tiene que cerrar el modal (no ir a otra página)
    function opcionesDelFinal() {
        return modo === 'reserva' ? { alTerminar: opciones.alTerminar } : {};
    }

    // ---------- Reprogramar ----------

    // Panel para elegir el nuevo día y horario. El servicio no se elige: es el del turno.
    async function mostrarReprogramacion() {
        const acciones = buscar('.tarjeta-turno__acciones');
        acciones.innerHTML = `
            <div class="tarjeta-turno__reprogramar">
                <p class="tarjeta-turno__pregunta">Elegí el nuevo día y horario para tu turno.</p>
                <div class="field">
                    <label for="reprogramarFecha">Día</label>
                    <input type="date" id="reprogramarFecha" data-campo="fecha" />
                </div>
                <div class="field">
                    <label for="reprogramarHora">Horario</label>
                    <select id="reprogramarHora" data-campo="hora" disabled>
                        <option value="">Cargando horarios...</option>
                    </select>
                </div>
                <p class="tarjeta-turno__error" role="alert" hidden></p>
                <div class="tarjeta-turno__botones">
                    <button type="button" class="btn btn--primary btn--block" data-accion="confirmar" disabled>Confirmar nuevo horario</button>
                    <button type="button" class="btn btn--ghost btn--block" data-accion="volver">Volver</button>
                </div>
            </div>
        `;

        const inputFecha = buscar('[data-campo="fecha"]');
        const selectHora = buscar('[data-campo="hora"]');
        const btnConfirmar = buscar('[data-accion="confirmar"]');

        buscar('[data-accion="volver"]').addEventListener('click', mostrarOpciones);
        inputFecha.addEventListener('change', cargarHorarios);
        // Confirmar solo se activa cuando hay un horario elegido
        selectHora.addEventListener('change', () => {
            btnConfirmar.disabled = !selectHora.value;
        });
        btnConfirmar.addEventListener('click', confirmarReprogramacion);

        // Arranco en el mismo día del turno (lo más común es moverlo unas horas)
        inputFecha.value = turno.fecha;

        // Límites del input de fecha, según la anticipación de la config del negocio.
        // Si falla no es grave: el backend igual rechaza las fechas fuera de rango.
        try {
            const respuesta = await fetch(`${API_URL}/configuracion`);
            const configuracion = await respuesta.json();
            inputFecha.min = fechaDentroDeDias(configuracion.anticipacion.minimaDias);
            inputFecha.max = fechaDentroDeDias(configuracion.anticipacion.maximaDias);
        } catch (error) {
            console.error(error);
        }

        cargarHorarios();
    }

    // Horarios libres de ese día para ESTE turno (el backend ignora el propio turno)
    async function cargarHorarios() {
        const fecha = buscar('[data-campo="fecha"]').value;
        const selectHora = buscar('[data-campo="hora"]');
        const btnConfirmar = buscar('[data-accion="confirmar"]');

        ocultarError();
        btnConfirmar.disabled = true;
        selectHora.disabled = true;

        if (!fecha) {
            selectHora.innerHTML = '<option value="">Elegí un día primero</option>';
            return;
        }

        selectHora.innerHTML = '<option value="">Cargando horarios...</option>';

        try {
            const respuesta = await fetch(`${API_URL}/turnos/${turno.id}/disponibilidad?fecha=${fecha}`);
            const datos = await respuesta.json();

            if (!respuesta.ok) {
                selectHora.innerHTML = '<option value="">Sin horarios</option>';
                mostrarError(datos.error || 'No se pudieron cargar los horarios.');
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
                // Mismo día: el horario que ya tiene aparece marcado y no se puede elegir
                if (fecha === turno.fecha && hora === turno.horaInicio) {
                    opcion.textContent = `${hora} (tu horario actual)`;
                    opcion.disabled = true;
                }
                selectHora.appendChild(opcion);
            });
            selectHora.disabled = false;

        } catch (error) {
            console.error(error);
            selectHora.innerHTML = '<option value="">Sin horarios</option>';
            mostrarError('No se pudo conectar con el servidor.');
        }
    }

    async function confirmarReprogramacion() {
        const fecha = buscar('[data-campo="fecha"]').value;
        const horaInicio = buscar('[data-campo="hora"]').value;
        const btnConfirmar = buscar('[data-accion="confirmar"]');
        const btnVolver = buscar('[data-accion="volver"]');

        // Desactivo los botones para que un doble toque no mande dos PATCH
        btnConfirmar.disabled = true;
        btnVolver.disabled = true;
        btnConfirmar.textContent = 'Reprogramando...';
        ocultarError();

        const restaurarBotones = () => {
            btnConfirmar.textContent = 'Confirmar nuevo horario';
            btnConfirmar.disabled = false;
            btnVolver.disabled = false;
        };

        try {
            const respuesta = await fetch(`${API_URL}/turnos/${turno.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fecha, horaInicio }),
            });
            const datos = await respuesta.json().catch(() => ({}));

            if (!respuesta.ok) {
                mostrarError(datos.error || 'No se pudo reprogramar el turno.');
                restaurarBotones();
                // 409 = alguien tomó ese horario mientras tanto: recargo la lista para que elija otro
                if (respuesta.status === 409) {
                    cargarHorarios();
                }
                return;
            }

            mostrarReprogramado(datos);

        } catch (error) {
            console.error(error);
            mostrarError('No se pudo conectar con el servidor.');
            restaurarBotones();
        }
    }

    // Listo: la tarjeta muestra el horario NUEVO y ofrezco avisarle al negocio por WhatsApp.
    // Este mensaje de éxito se ve UNA vez: con "Listo" la tarjeta vuelve a su estado normal
    // (en el modal, "Listo" lo cierra; al reabrirlo se arma de nuevo, ya en estado normal).
    function mostrarReprogramado(datos) {
        // El backend devuelve el turno actualizado: horario nuevo y sePuedeReprogramar al día
        turno = { ...datos.turno };
        mostrarDatos();

        buscar('.tarjeta-turno__acciones').innerHTML = `
            <p class="tarjeta-turno__estado tarjeta-turno__estado--exito">✓ Turno reprogramado. Te esperamos en el nuevo horario.</p>
            <div class="tarjeta-turno__botones">
                <a class="btn btn--primary btn--block" data-accion="whatsapp" target="_blank" rel="noopener">Avisar por WhatsApp</a>
                <button type="button" class="btn btn--ghost btn--block" data-accion="listo">Listo</button>
            </div>
        `;
        buscar('[data-accion="whatsapp"]').href = datos.linkWhatsApp;
        buscar('[data-accion="listo"]').addEventListener('click', () => {
            if (modo === 'reserva') {
                opciones.alTerminar?.();
            } else {
                mostrarOpciones();
            }
        });

        opciones.alCambiar?.(turno, datos.linkWhatsApp);
    }

    function mostrarError(texto) {
        const error = buscar('.tarjeta-turno__error');
        error.textContent = texto; // textContent: puede venir del backend
        error.hidden = false;
    }

    function ocultarError() {
        const error = buscar('.tarjeta-turno__error');
        if (error) error.hidden = true;
    }
}
