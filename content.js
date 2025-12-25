chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fill_max') {
    fillForms('max');
    sendResponse({ status: 'Form telah diisi dengan nilai maksimal!' });
  } else if (request.action === 'fill_random') {
    fillForms('random');
    sendResponse({ status: 'Form telah diisi secara acak (positif)!' });
  }
});

function fillForms(mode) {
  // Handle Radio Buttons (Skala Likert)
  const radioGroups = {};
  const radios = document.querySelectorAll('input[type="radio"]');

  radios.forEach(radio => {
    if (!radioGroups[radio.name]) {
      radioGroups[radio.name] = [];
    }
    radioGroups[radio.name].push(radio);
  });

  Object.keys(radioGroups).forEach(name => {
    const group = radioGroups[name];
    if (group.length > 0) {
      if (mode === 'max') {
        // Assume maximum value is the best (usually the last index or higher value)
        // Sort by value if possible, otherwise take the last one in DOM order
        group.sort((a, b) => {
             return parseFloat(b.value) - parseFloat(a.value);
        });
        // Select the one with highest value
        group[0].checked = true;
      } else if (mode === 'random') {
        // Select random from top 2 choices (assuming 4 or 5 scale)
        const sorted = group.sort((a, b) => parseFloat(b.value) - parseFloat(a.value));
        const topChoices = sorted.slice(0, 2);
        const choice = topChoices[Math.floor(Math.random() * topChoices.length)];
        choice.checked = true;
      }
    }
  });

  // Handle Text Areas (Saran/Komentar)
  const textAreas = document.querySelectorAll('textarea');
  const genericComments = [
    "Dosen mengajar dengan sangat baik dan jelas.",
    "Materi yang disampaikan sangat bermanfaat.",
    "Metode pengajaran efektif dan mudah dipahami.",
    "Pertahankan kualitas pengajaran.",
    "Sangat inspiratif."
  ];

  textAreas.forEach(area => {
    if (!area.value) {
        // Pick a random nice comment
        area.value = genericComments[Math.floor(Math.random() * genericComments.length)];
    }
  });
  
  // Optional: Auto-submit check?
  // It's safer to let the user review before submitting.
}
