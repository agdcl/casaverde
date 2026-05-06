const professionals = [
  {
    name: "Laura",
    type: "psicologia",
    slots: ["Lunes 10:00", "Martes 17:00", "Jueves 18:00"]
  },
  {
    name: "Carlos",
    type: "psicologia",
    slots: ["Lunes 16:00", "Miércoles 17:00"]
  },
  {
    name: "Marta",
    type: "logopedia",
    slots: ["Martes 16:00", "Viernes 09:00"]
  }
];

function generate() {
  const type = document.getElementById("type").value;
  const freq = parseInt(document.getElementById("freq").value);

  const results = document.getElementById("results");

  const filtered = professionals.filter(p => p.type === type);

  let output = "";

  filtered.forEach(pro => {
    const slots = pro.slots.slice(0, freq);

    if (slots.length === freq) {
      output += `
        <div class="proposal">
          <strong>${pro.name}</strong><br>
          ${slots.join("<br>")}
        </div>
      `;
    }
  });

  if (!output) {
    output = "No hay opciones disponibles";
  }

  results.innerHTML = output;
}
