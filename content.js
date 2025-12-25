chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'get_options') {
    // Target spesifik elemen select yang diberikan user
    const select = document.getElementById('mk_kuesioner');
    
    if (select) {
      const options = Array.from(select.options).map(opt => ({
        value: opt.value,
        text: opt.text.trim(),
        selected: opt.selected
      })).filter(o => o.value !== ""); // Filter opsi kosong
      
      sendResponse({ options: options });
    } else {
      sendResponse({ options: [] });
    }
  } 
  
  else if (request.action === 'select_option') {
    const select = document.getElementById('mk_kuesioner');
    if (select) {
      select.value = request.value;
      // Trigger event change agar script page (MKChange()) jalan
      select.dispatchEvent(new Event('change', { bubbles: true }));
      sendResponse({ status: 'Sedang memuat data...' });
    }
  }

  else if (request.action === 'fill_max' || request.action === 'fill_random') {
    const mode = request.action === 'fill_max' ? 'max' : 'random';
    fillForms(mode);
    sendResponse({ status: 'Form berhasil diisi!' });
  }
});

function fillForms(mode) {
  // 1. Radio Buttons (Likert Scale)
  const radioGroups = {};
  document.querySelectorAll('input[type="radio"]').forEach(radio => {
    if (!radioGroups[radio.name]) radioGroups[radio.name] = [];
    radioGroups[radio.name].push(radio);
  });

  Object.keys(radioGroups).forEach(name => {
    const group = radioGroups[name];
    if (group.length > 0) {
      // Sort DESCENDING by value check (4 > 3 > 2 > 1)
      group.sort((a, b) => (parseFloat(b.value) || 0) - (parseFloat(a.value) || 0));
      
      if (mode === 'max') {
        group[0].checked = true;
      } else {
        // Random top 2
        const choice = group.slice(0, 2)[Math.floor(Math.random() * Math.min(2, group.length))];
        choice.checked = true;
      }
    }
  });

  // 2. Text Areas (Smart Comments)
  const textAreas = document.querySelectorAll('textarea');
  
  const commentsLecturer = [
    "Penyampaian materi sangat jelas, terstruktur, dan mudah dipahami. Dosen sangat menguasai materi.",
    "Metode pengajaran beliau sangat efektif dan interaktif, membuat mahasiswa bersemangat mengikuti perkuliahan.",
    "Dosen sangat disiplin waktu dan memberikan feedback yang konstruktif terhadap tugas mahasiswa.",
    "Penjelasan konsep-konsep sulit disampaikan dengan analogi yang sederhana sehingga mudah dimengerti.",
    "Sangat mengapresiasi dedikasi Bapak/Ibu dalam membimbing kami selama satu semester ini."
  ];

  const commentsCourse = [
    "Materi mata kuliah ini sangat relevan dengan kebutuhan industri saat ini dan tertata dengan rapi.",
    "Silabus perkuliahan sangat jelas, dan beban tugas yang diberikan seimbang dengan bobot SKS.",
    "Mata kuliah ini memberikan wawasan baru yang sangat bermanfaat bagi pengembangan kompetensi mahasiswa.",
    "Resource pembelajaran (slide/modul) yang disediakan sangat lengkap dan membantu proses belajar mandiri.",
    "Topik-topik yang dibahas sangat menarik dan menantang, memicu kemampuan berpikir kritis."
  ];

  textAreas.forEach(area => {
    // Heuristic: Check context nearby to detect if it's for MK or Dosen
    let isCourse = false;
    
    // Ambil text dari parent element (biasanya <td>) dan element sebelumnya (label/header)
    const parent = area.parentElement;
    const previousSibling = parent ? parent.previousElementSibling : null;
    
    const textContext = (
        (parent ? parent.innerText : "") + " " + 
        (previousSibling ? previousSibling.innerText : "")
    ).toLowerCase();

    // Keywords penentu
    if (textContext.includes("komentar untuk mata kuliah") || 
        textContext.includes("saran untuk mata kuliah") || 
        textContext.includes("tentang mata kuliah") ||
        area.name.toLowerCase().includes("mk_saran")) {
        isCourse = true;
    }

    if (!area.value || area.value.trim() === "") {
       const source = isCourse ? commentsCourse : commentsLecturer;
       area.value = source[Math.floor(Math.random() * source.length)];
    }
  });
}
