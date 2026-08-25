// El Oreja Details — lógica del formulario de turnos.
// Arma el mensaje de WhatsApp con los datos cargados y lo abre en una pestaña nueva.

(function () {
  // TODO: reemplazar por el WhatsApp real del cliente (ver mismo TODO en index.html)
  const WHATSAPP_NUMBER = '5490000000000';

  const form = document.querySelector('.booking-form');
  if (!form) return;

  function formatFecha(value) {
    if (!value) return '';
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }

  function buildMensaje(data) {
    const lineas = [
      'Hola! Quiero reservar un turno en El Oreja Details.',
      '',
      `Nombre: ${data.get('nombre').trim()}`,
      `Teléfono: ${data.get('telefono').trim()}`,
      `Servicio: ${data.get('servicio')}`,
      `Vehículo: ${data.get('vehiculo')}`,
      `Fecha: ${formatFecha(data.get('fecha'))}`,
      `Horario preferido: ${data.get('hora')}`,
    ];

    const comentario = data.get('comentario').trim();
    if (comentario) {
      lineas.push(`Comentario: ${comentario}`);
    }

    return lineas.join('\n');
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const mensaje = encodeURIComponent(buildMensaje(new FormData(form)));
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${mensaje}`, '_blank', 'noopener');
  });
})();

// Carrusel de planes (mobile): puntito activo según la card centrada.
(function () {
  const plans = document.querySelector('.plans');
  const dots = document.querySelectorAll('.plans-dots .dot');
  if (!plans || !dots.length) return;

  const cards = Array.from(plans.querySelectorAll('.plan-card'));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const index = cards.indexOf(entry.target);
        dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
      });
    },
    { root: plans, threshold: 0.6 }
  );

  cards.forEach((card) => observer.observe(card));
})();

// Plan-cards expandibles (mobile): "Ver más" muestra el feature extra.
(function () {
  document.querySelectorAll('.plan-card__more').forEach((btn) => {
    const card = btn.closest('.plan-card');
    const extra = card && card.querySelector('.plan-card__features-extra');
    if (!extra) return;

    btn.addEventListener('click', () => {
      const isOpen = extra.classList.toggle('is-open');
      btn.textContent = isOpen ? 'Ver menos' : 'Ver más';
      btn.setAttribute('aria-expanded', String(isOpen));
    });
  });
})();
