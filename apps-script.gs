/*
CÓDIGO PARA GOOGLE APPS SCRIPT

PASOS:
1. Crea un Google Sheet.
2. Ve a Extensiones > Apps Script.
3. Pega este código.
4. Cambia SHEET_ID por el ID de tu Google Sheet.
5. Cambia PROFESSIONALS por los calendarios reales de tus profesionales.
6. Implementa como aplicación web:
   Implementar > Nueva implementación > Aplicación web
   Ejecutar como: tú
   Quién tiene acceso: cualquiera con el enlace
7. Copia la URL /exec y pégala en script.js.
*/

const SHEET_ID = "PEGA_AQUI_EL_ID_DE_TU_GOOGLE_SHEET";
const PATIENTS_SHEET = "Pacientes";

const PROFESSIONALS = [
  {
    name: "Laura Martínez",
    type: "psicologia",
    calendarId: "primary"
  },
  {
    name: "Carlos Ruiz",
    type: "psicologia",
    calendarId: "correo_del_profesional_1@gmail.com"
  },
  {
    name: "Marta Soler",
    type: "logopedia",
    calendarId: "correo_del_profesional_2@gmail.com"
  }
];

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    if (action === "getFreeSlots") {
      return jsonResponse({
        ok: true,
        slots: getFreeSlots(body.patient)
      });
    }

    if (action === "savePatient") {
      savePatient(body.patient, null);
      return jsonResponse({ ok: true });
    }

    if (action === "assignSlot") {
      assignSlot(body.patient, body.slot);
      return jsonResponse({ ok: true });
    }

    if (action === "getExpiringPatients") {
      return jsonResponse({
        ok: true,
        patients: getExpiringPatients()
      });
    }

    return jsonResponse({
      ok: false,
      error: "Acción no reconocida."
    });

  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error.message
    });
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getFreeSlots(patient) {
  const duration = Number(patient.duration || 50);
  const startDate = new Date(patient.startDate);
  const limitDate = new Date(patient.limitDate);

  const professionals = PROFESSIONALS.filter(p => p.type === patient.type);
  const slots = [];

  professionals.forEach(pro => {
    const calendar = CalendarApp.getCalendarById(pro.calendarId);

    if (!calendar) return;

    const searchEnd = new Date(startDate);
    searchEnd.setDate(searchEnd.getDate() + 21);

    const end = searchEnd < limitDate ? searchEnd : limitDate;

    let current = new Date(startDate);

    while (current <= end && slots.length < 20) {
      const day = current.getDay();

      if (day >= 1 && day <= 5) {
        const candidateSlots = buildCandidateSlots(current, patient.preference);

        candidateSlots.forEach(candidate => {
          const slotStart = candidate;
          const slotEnd = new Date(slotStart.getTime() + duration * 60000);

          const events = calendar.getEvents(slotStart, slotEnd);

          if (events.length === 0 && slots.length < 20) {
            slots.push({
              professional: pro.name,
              calendarId: pro.calendarId,
              calendarName: calendar.getName(),
              date: Utilities.formatDate(slotStart, Session.getScriptTimeZone(), "yyyy-MM-dd"),
              start: Utilities.formatDate(slotStart, Session.getScriptTimeZone(), "HH:mm"),
              end: Utilities.formatDate(slotEnd, Session.getScriptTimeZone(), "HH:mm")
            });
          }
        });
      }

      current.setDate(current.getDate() + 1);
    }
  });

  return slots;
}

function buildCandidateSlots(date, preference) {
  const slots = [];
  const hours = [];

  if (preference === "morning" || preference === "any") {
    hours.push("09:00", "10:00", "11:00", "12:00");
  }

  if (preference === "afternoon" || preference === "any") {
    hours.push("16:00", "17:00", "18:00");
  }

  hours.forEach(hour => {
    const parts = hour.split(":");
    const slot = new Date(date);
    slot.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
    slots.push(slot);
  });

  return slots;
}

function assignSlot(patient, slot) {
  const calendar = CalendarApp.getCalendarById(slot.calendarId);

  if (!calendar) {
    throw new Error("No se encontró el calendario del profesional.");
  }

  const start = new Date(slot.date + "T" + slot.start + ":00");
  const end = new Date(slot.date + "T" + slot.end + ":00");

  calendar.createEvent(
    "Paciente: " + patient.name,
    start,
    end,
    {
      description:
        "Tipo de tratamiento: " + patient.type + "\n" +
        "Sesiones previstas/autorizadas: " + patient.sessions + "\n" +
        "Fecha inicio: " + patient.startDate + "\n" +
        "Fecha límite: " + patient.limitDate + "\n" +
        "Notas: " + (patient.notes || "")
    }
  );

  savePatient(patient, slot);
}

function savePatient(patient, slot) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(PATIENTS_SHEET);

  if (!sheet) {
    throw new Error("No existe la hoja llamada " + PATIENTS_SHEET);
  }

  sheet.appendRow([
    new Date(),
    patient.name,
    patient.type,
    patient.sessions,
    patient.duration,
    patient.startDate,
    patient.limitDate,
    patient.authorization,
    patient.preference,
    slot ? slot.professional : "",
    slot ? slot.date + " " + slot.start + "-" + slot.end : "",
    patient.notes || "",
    calculateStatus(patient.limitDate)
  ]);
}

function getExpiringPatients() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(PATIENTS_SHEET);
  const values = sheet.getDataRange().getValues();

  const today = new Date();
  const patients = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    const name = row[1];
    const type = row[2];
    const limitDate = row[6];
    const professional = row[9];

    if (!limitDate) continue;

    const date = new Date(limitDate);
    const daysRemaining = Math.ceil((date - today) / (1000 * 60 * 60 * 24));

    if (daysRemaining >= 0 && daysRemaining <= 15) {
      patients.push({
        name,
        type,
        limitDate: Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd"),
        professional,
        daysRemaining
      });
    }
  }

  return patients;
}

function calculateStatus(limitDate) {
  const today = new Date();
  const limit = new Date(limitDate);
  const days = Math.ceil((limit - today) / (1000 * 60 * 60 * 24));

  if (days <= 0) return "Vencido";
  if (days <= 15) return "Próximo a vencer";
  return "Activo";
}
