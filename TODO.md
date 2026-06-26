# TODO - Migración UI Django Templates -> Angular (SPA)

- [x] Crear/actualizar componentes Angular para: login, register, dashboard, employee, home, screen (migración inicial con UI real)

- [ ] Integrar lógica existente de `static/js/websocket.js` y `static/js/turns_data.js` en Angular (service + singleton global si aplica)

- [ ] Reemplazar `document.getElementById`/handlers inline por bindings Angular o, si se mantiene JS legacy, inyectar HTML y montar listeners en ciclo de vida del componente
- [ ] Asegurar compatibilidad de auth por sesión/cookies: `/api/login/`, `/api/logout/`, `/api/verify-session/`
- [ ] Asegurar CSRF para POSTs (X-CSRFToken o habilitar Csrf en fetch)
- [ ] Confirmar que Angular apunta a rutas de API correctas (/api/*) y websocket correcto (/ws/turns)
- [ ] Ejecutar `npm run build` en frontend y ejecutar Django para validar en navegador

