/*
IMPORTANTE:
1. Publica el Apps Script como aplicación web.
2. Copia la URL de despliegue y pégala aquí.
3. La URL debe terminar normalmente en /exec.
*/

const APPS_SCRIPT_URL = "https://script.google.com/a/macros/umh.es/s/AKfycbxYGajbnbbXOXyXSuZrD_9eZHfkJ34j0X2TyiPoxNqqYDqOQzMCu7d-vGNFbPKnyqsX/exec";

document.getElementById("authorization").addEventListener("change", function() {
  document.getElementById("customDates").classList.toggle("hidden", this.value !== "custom");
});

function getPatientData() {
  const name = document.getElementById("name").value.trim();
  const type = document.getElementById("type").value;
  const sessions = Number(document.getElementById("sessions").value);
  const duration = Number(document.getElementById("duration").value);
  const startDate = document.getElementById("startDate").value;
  const authorization = document.getElementById("authorization").value;
  const customLimitDate = document.getElementById("customLimitDate").value;
  const preference = document.getElementById("preference").value;
  const notes = document.getElementById("notes").value.trim();

  let limitDate = "";

  if (authorization === "custom") {
    limitDate = customLimitDate;
  } else if (startDate) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + Number(authorization));
    limitDate = date.toISOString().slice(0, 10);
  }

  return {
    name,
    type,
    sessions,
    duration,
    startDate,
    authorization,
    limitDate,
    preference,
    notes
  };
}

function validatePatient(data) {
  if (!data.name) return "Falta el nombre del paciente.";
  if (!data.sessions || data.sessions < 1) return "Falta el número de sesiones.";
  if (!data.startDate) return "Falta la fecha de inicio.";
  if (!data.limitDate) return "Falta la fecha límite.";
  if (new Date(data.limitDate) < new Date(data.startDate)) return "La fecha límite no puede ser anterior a la fecha de inicio.";
  return null;
}

function reviewDates(data) {
  const container = document.getElementById("dateReview");

  if (!data.startDate || !data.limitDate || !data.sessions) {
    container.innerHTML = "Introduce fecha de inicio, fecha límite y número de sesiones.";
    return;
  }

  const start = new Date(data.startDate);
  const limit = new Date(data.limitDate);
  const today = new Date();

  const totalDays = Math.ceil((limit - start) / (1000 * 60 * 60 * 24));
  const remainingDays = Math.ceil((limit - today) / (1000 * 60 * 60 * 24));

  let className = "ok";
  let message = "Rango válido.";

  if (remainingDays <= 14 && remainingDays > 0) {
    className = "warning";
    message = "Atención: el tratamiento está próximo a vencer.";
  }

  if (remainingDays <= 0) {
    className = "danger";
    message = "Alerta: la fecha límite ya ha vencido o vence hoy.";
  }

  container.innerHTML = `
    <div class="${className}">
      <strong>${message}</strong><br>
      Fecha de inicio: ${formatDate(data.startDate)}<br>
      Fecha límite: ${formatDate(data.limitDate)}<br>
      Días totales autorizados: ${totalDays}<br>
      Días restantes desde hoy: ${remainingDays}<br>
      Sesiones previstas: ${data.sessions}
    </div>
  `;
}

async function generate() {
  const data = getPatientData();
  const error = validatePatient(data);

  if (error) {
    alert(error);
    return;
  }

  reviewDates(data);

  const results = document.getElementById("results");
  results.innerHTML = "Consultando agendas de profesionales...";

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "getFreeSlots",
        patient: data
      })
    });

    const payload = await response.json();

    if (!payload.ok) {
      results.innerHTML = `<div class="danger">${payload.error}</div>`;
      return;
    }

    if (!payload.slots.length) {
      results.innerHTML = `<div class="warning">No hay huecos libres compatibles con los criterios seleccionados.</div>`;
      return;
    }

    results.innerHTML = payload.slots.map(slot => `
      <div class="proposal">
        <strong>${slot.professional}</strong><br>
        ${slot.date} · ${slot.start} - ${slot.end}<br>
        <span class="small">${slot.calendarName}</span>
        <br>
        <button onclick='assignSlot(${JSON.stringify(slot)}, ${JSON.stringify(data)})'>Asignar este hueco</button>
      </div>
    `).join("");

  } catch (e) {
    results.innerHTML = `
      <div class="danger">
        No se ha podido conectar con Apps Script. Revisa que hayas pegado la URL correcta en script.js.
      </div>
    `;
  }
}

async function assignSlot(slot, patient) {
  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "assignSlot",
      patient,
      slot
    })
  });

  const payload = await response.json();

  if (payload.ok) {
    alert("Paciente guardado y cita creada en la agenda.");
  } else {
    alert(payload.error || "No se pudo asignar el hueco.");
  }
}

async function savePatient() {
  const data = getPatientData();
  const error = validatePatient(data);

  if (error) {
    alert(error);
    return;
  }

  reviewDates(data);

  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "savePatient",
      patient: data
    })
  });

  const payload = await response.json();

  if (payload.ok) {
    alert("Paciente guardado en Google Sheets.");
  } else {
    alert(payload.error || "No se pudo guardar.");
  }
}

async function loadExpiringPatients() {
  const container = document.getElementById("expiringPatients");
  container.innerHTML = "Revisando fechas límite...";

  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "getExpiringPatients"
    })
  });

  const payload = await response.json();

  if (!payload.ok) {
    container.innerHTML = `<div class="danger">${payload.error}</div>`;
    return;
  }

  if (!payload.patients.length) {
    container.innerHTML = `<div class="ok">No hay pacientes próximos a vencer en los próximos 15 días.</div>`;
    return;
  }

  container.innerHTML = payload.patients.map(p => `
    <div class="warning">
      <strong>${p.name}</strong><br>
      Tratamiento: ${p.type}<br>
      Fecha límite: ${formatDate(p.limitDate)}<br>
      Días restantes: ${p.daysRemaining}<br>
      Profesional: ${p.professional || "Sin asignar"}
    </div>
  `).join("");
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("es-ES");
}
