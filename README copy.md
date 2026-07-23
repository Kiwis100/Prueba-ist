# Instana Events Exporter

> Herramienta web para consultar, visualizar y exportar eventos de IBM Instana — disponible como demo frontend-only en GitHub Pages y como versión con backend proxy seguro para uso productivo.

**Demo pública:** [https://juan-conde-21.github.io/instana-events-exporter/](https://juan-conde-21.github.io/instana-events-exporter/)

---

## Objetivo

Permite extraer eventos del endpoint `GET /api/events` de IBM Instana para un rango de fechas, visualizar KPIs, gráficos y tablas operativas en el navegador, y exportar un reporte Excel profesional de tres hojas — sin almacenar credenciales ni comprometer la seguridad.

---

## Alcance

| Variante | Descripción |
|---|---|
| **GitHub Pages (este repo)** | Frontend-only. Consultas directas desde el navegador. Demo / uso personal. |
| **Local con backend** | Express proxy en `backend/`. Recomendado para entornos corporativos. |

---

## Arquitectura — Modo Frontend-Only (GitHub Pages)

```
Navegador (React + Vite — GitHub Pages)
        │  GET /api/events?from=…&to=…
        │  Authorization: apiToken …  (solo en memoria, nunca persistido)
        ▼
IBM Instana API  (HTTPS)
```

El frontend ejecuta toda la lógica de consulta, normalización, clasificación de entidades y agregación de métricas directamente en el navegador.

### Arquitectura — Modo con Backend Proxy (local)

```
Navegador (React + Vite)
        │  POST /api/export-events  { tenantUrl, apiToken, from, to, … }
        ▼
Backend (Express — localhost:3001)
        │  GET /api/events?…  + Authorization: apiToken …
        ▼
IBM Instana API  (HTTPS)
```

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite, Recharts, ExcelJS |
| Backend (opcional) | Node.js 18 / Express |
| Gráficos | Recharts |
| Export | ExcelJS (3 hojas con formato profesional) |

---

## Seguridad

| Regla | Cumplimiento |
|---|---|
| Token nunca en `localStorage` | ✅ |
| Token nunca en `sessionStorage` | ✅ |
| Token nunca en cookies | ✅ |
| Token nunca en `console.log` | ✅ |
| Token nunca en query string | ✅ |
| Token solo en memoria durante la consulta | ✅ |
| Solo se aceptan Tenant URLs con protocolo HTTPS | ✅ |
| No se persisten datos ni credenciales | ✅ |

> **Aviso — Modo Frontend-Only:** En la versión de GitHub Pages, el token viaja directamente desde el navegador del usuario a la API de Instana (HTTPS). No existe un backend intermediario. Esto es aceptable para uso personal/demo. Para entornos corporativos, **usa la versión con backend proxy** donde el token nunca abandona el servidor.

> **Recomendación:** Genera un API token de Instana con permisos mínimos (solo lectura de eventos), úsalo para exportar y **revócalo inmediatamente** al terminar. Ve a *Settings → API Tokens* en tu tenant.

---

## Limitación CORS

Instana puede o no permitir solicitudes CORS directas desde dominios externos (como GitHub Pages). Si ves un error de tipo `Failed to fetch` al consultar:

1. **Opción A (recomendada):** Usa la [versión local con backend proxy](#instalación-local-con-backend).
2. **Opción B:** Instala una extensión de navegador CORS Unblock (solo para uso personal, con precaución).
3. **Opción C:** Si tu tenant tiene acceso API desde el navegador configurado, verificar en *Settings → Security* de Instana.

---

## Instalación local (solo frontend)

```bash
git clone https://github.com/juan-conde-21/instana-events-exporter.git
cd instana-events-exporter/frontend
npm install
npm run dev
# → http://localhost:5173
```

> En este modo, el frontend llama directamente a Instana sin proxy. Puede haber restricciones CORS según el tenant.

---

## Instalación local con backend proxy

```bash
# Terminal 1 — Backend
cd backend
npm install
node server.js
# → Escucha en http://localhost:3001

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

Vite hace proxy automático de `/api/*` hacia `http://localhost:3001` en desarrollo.

---

## Publicación en GitHub Pages

### Configuración manual (una sola vez)

1. Ve a tu repositorio en GitHub → **Settings** → **Pages**.
2. En **Source**, selecciona **"GitHub Actions"**.
3. Haz push a `main` — el workflow `.github/workflows/deploy.yml` se ejecuta automáticamente.

### Build y deploy manual

```bash
cd frontend
npm run build          # genera frontend/dist/
# El contenido de dist/ se publica automáticamente via GitHub Actions
```

---

## Uso de la herramienta

1. Abre [https://juan-conde-21.github.io/instana-events-exporter/](https://juan-conde-21.github.io/instana-events-exporter/).
2. Ingresa la **Tenant URL** (ej. `https://empresa.instana.io`).
3. Ingresa tu **API Token** de Instana (campo password, no se almacena).
4. Selecciona **rango de fechas** y **tipos de evento** (Incidentes, Issues, Cambios).
5. Haz clic en **Consultar Eventos**.
6. Revisa los resultados en las pestañas:
   - **Resumen**: KPIs y gráficos.
   - **Abiertos**: eventos con estado OPEN.
   - **Entidades**: distribución por entidad afectada.
   - **Problemas recurrentes**: top problemas por frecuencia.
   - **Cambios**: cambios detectados en el período.
   - **Calidad de datos**: métricas de confianza.
   - **Detalle completo**: tabla con todos los eventos y filtros.
7. Haz clic en **Exportar Excel** para descargar el reporte con tres hojas:
   - **Resumen Ejecutivo**: KPIs, métricas, distribuciones, top entidades y problemas.
   - **Eventos**: todos los campos con formato condicional (CRITICAL en rojo, WARNING en ámbar, OPEN en azul).
   - **Entidades**: agregación por entidad con desglose de incidentes, issues y cambios.

---

## Funcionalidades

### Dashboard operativo

- Lectura rápida contextual (chips con severidad y estado)
- 12 KPIs en tres filas (volumen, severidad/estado, calidad)
- Gráficos: eventos por día (timeline), por tipo, severidad, estado, dominio técnico, top entidades, top problemas recurrentes
- 7 pestañas contextuales (solo se muestran si hay datos relevantes)

### Tabla de eventos

- 6 filtros simultáneos: texto libre, tipo, severidad, estado, dominio técnico, calidad de entidad
- Columnas: tipo, severidad, estado, problema, entidad afectada, tipo entidad, dominio, calidad, inicio, fin, duración, detalle
- Paginación de 100 registros por página
- Badges con colores por tipo y severidad

### Clasificación de entidades

El motor de clasificación determina para cada evento:
- **entityType**: tipo de entidad (Host, SQL Server, DB2, Nodo K8s, Pod K8s, etc.)
- **technicalDomain**: dominio (Infraestructura, Base de datos, Kubernetes, Mensajería, etc.)
- **entityQuality**: IDENTIFIED / GENERIC / UNKNOWN

### Exportación Excel

- 3 hojas con diseño profesional (paleta Instana)
- Formato condicional: CRITICAL → rojo, WARNING → ámbar, OPEN → azul claro
- Primera fila congelada + autofilter en todas las hojas
- Sin gridlines en la hoja de resumen

---

## Limitaciones conocidas

| Limitación | Detalle |
|---|---|
| **CORS** | Instana puede bloquear requests directos desde el navegador. Ver [sección CORS](#limitación-cors). |
| **Rango máximo** | 90 días por consulta. |
| **Sin paginación interna de Instana** | Si la API retorna datos paginados, solo se obtiene la primera página por bloque diario. |
| **Rate limiting** | Bloques con HTTP 429 se omiten con aviso. Se reintenta con backoff exponencial (hasta 3 veces). |
| **Deduplicación** | Por `eventId`. Sin ID, se usa clave compuesta `tipo|start|entidad`. |
| **Sin autenticación propia** | La herramienta es para uso personal/interno. No incluye sistema de login. |

---

## Roadmap / Mejoras futuras

- [ ] **Backend proxy en Vercel/Cloudflare** — Elimina la restricción CORS y aumenta la seguridad al no exponer el token desde el navegador.
- [ ] **Paginación completa de la API de Instana** — Soportar `cursor`/`offset` para datasets grandes.
- [ ] **Alertas configurables** — Detección automática de anomalías (p.ej., pico de incidentes críticos).
- [ ] **Soporte multilingüe** — Internacionalización (i18n) del dashboard.

---

## Recomendación para uso productivo

Para entornos corporativos con datos sensibles, despliega el **backend proxy** en Vercel, Cloudflare Workers o tu infraestructura interna:

```
Navegador → Backend proxy (autentica y filtra) → Instana API
```

Esto garantiza que el API token **nunca salga del servidor** y que puedas aplicar autenticación propia (SSO, OAuth) antes de permitir consultas.

---

## Licencia

MIT — Para uso personal y educativo.
