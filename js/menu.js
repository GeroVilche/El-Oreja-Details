// MENÚ HAMBURGUESA (celulares y tablets)
// Abro y cierro el menú agregando o sacando la clase .header--menu-abierto del header:
// todo lo visual (mostrar el menú, convertir las rayitas en X) lo resuelve el CSS en 05-header.css.
// Acá solo manejo cuándo se abre y cuándo se cierra.

const header = document.querySelector('.header');
const botonMenu = document.getElementById('navToggle');
const linksMenu = document.querySelectorAll('#menuPrincipal a');

function abrirMenu() {
    header.classList.add('header--menu-abierto');
    botonMenu.setAttribute('aria-expanded', 'true');
    botonMenu.setAttribute('aria-label', 'Cerrar menú');
}

function cerrarMenu() {
    header.classList.remove('header--menu-abierto');
    botonMenu.setAttribute('aria-expanded', 'false');
    botonMenu.setAttribute('aria-label', 'Abrir menú');
}

botonMenu.addEventListener('click', () => {
    const estaAbierto = header.classList.contains('header--menu-abierto');
    if (estaAbierto) {
        cerrarMenu();
    } else {
        abrirMenu();
    }
});

// Al tocar un link, el menú se cierra (si no, taparía la sección a la que el usuario quiso ir)
linksMenu.forEach(link => link.addEventListener('click', cerrarMenu));

// Escape cierra el menú (para quien navega con teclado)
document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') {
        cerrarMenu();
    }
});

// Si estando abierto agrandan la pantalla hasta el tamaño de escritorio, lo dejo cerrado
// (así, si después la vuelven a achicar, no aparece abierto de golpe)
window.matchMedia('(min-width: 860px)').addEventListener('change', (evento) => {
    if (evento.matches) {
        cerrarMenu();
    }
});
