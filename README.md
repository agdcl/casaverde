# Gestor de horarios clínicos

Sistema gratuito para:

1. Registrar nuevos pacientes.
2. Consultar huecos libres en agendas de profesionales.
3. Asignar citas en Google Calendar.
4. Guardar pacientes en Google Sheets.
5. Revisar fechas límite de tratamientos autorizados a 3 o 6 meses.
6. Detectar pacientes próximos a vencer.

## Archivos para GitHub Pages

Sube estos archivos al repositorio:

- index.html
- styles.css
- script.js

## Archivo para Apps Script

El archivo `apps-script.gs` no se sube a GitHub Pages.
Debes copiarlo en Google Apps Script.

## Pasos principales

1. Crea un Google Sheet con una hoja llamada `Pacientes`.
2. Copia el ID del Sheet.
3. Abre Extensiones > Apps Script.
4. Pega el contenido de `apps-script.gs`.
5. Sustituye `SHEET_ID`.
6. Sustituye los `calendarId` por los calendarios reales de los profesionales.
7. Implementa como aplicación web.
8. Copia la URL generada.
9. Pega esa URL en `script.js`, en la constante `APPS_SCRIPT_URL`.
10. Sube `index.html`, `styles.css` y `script.js` a GitHub.

## Columnas recomendadas en la hoja Pacientes

Fecha_registro
Nombre
Tipo_tratamiento
Sesiones
Duracion
Fecha_inicio
Fecha_limite
Autorizacion
Preferencia
Profesional_asignado
Horario_asignado
Notas
Estado
