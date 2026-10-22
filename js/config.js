// Acá decido a qué backend le habla el frontend.
// Si abro la página desde Live Server (localhost o 127.0.0.1) uso mi backend local;
// en cualquier otro lado (GitHub Pages, el celu) uso el de Render.
// Ojo: este archivo tiene que cargarse ANTES que turnos.js y cancelar.js, porque ellos usan API_URL.
const ES_LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);

const API_URL = ES_LOCAL
    ? 'http://localhost:3000'
    : 'https://el-oreja-backend.onrender.com';
