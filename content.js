chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'get_options') {
    const select = document.getElementById('mk_kuesioner');
    if (select) {
      const options = Array.from(select.options).map(opt => ({
        value: opt.value,
        text: opt.text.trim(),
        selected: opt.selected
      })).filter(o => o.value !== "");
      sendResponse({ options: options });
    } else {
      sendResponse({ options: [] });
    }
  } 
  else if (request.action === 'select_option') {
    const select = document.getElementById('mk_kuesioner');
    if (select) {
      select.value = request.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      sendResponse({ status: 'Sedang memuat ulang...' });
    }
  }
  else if (request.action === 'fill_max' || request.action === 'fill_random') {
    const mode = request.action === 'fill_max' ? 'max' : 'random';
    // Gunakan config dari request, default true jika tidak ada
    const config = request.config || { fillLecturer: true, fillCourse: true };
    
    fillForms(mode, config);
    sendResponse({ status: 'Pengisian selesai!' });
  }
});

function fillForms(mode, config) {
  // 1. Ambil Data Konteks (Nama Dosen & Mata Kuliah) dari Dropdown saat ini
  let currentLecturer = "Bapak/Ibu Dosen";
  let currentCourse = "Mata Kuliah ini";

  const select = document.getElementById('mk_kuesioner');
  if (select && select.selectedIndex >= 0) {
    const text = select.options[select.selectedIndex].text; 
    // Format umum: "KODE - Nama Matkul [Kelas] -- Nama Dosen"
    // Contoh: "ER234301 - Perancangan Perangkat Lunak [M] -- Bintang Nuralamsyah, S.Kom., M.Kom."
    
    const parts = text.split('--');
    if (parts.length >= 2) {
        currentLecturer = parts[1].trim(); // Nama Dosen
        
        const courseFull = parts[0].trim(); // "ER234301 - Perancangan Perangkat Lunak [M]"
        // Coba bersihkan Kode dan Kelas
        const dashSplit = courseFull.split('-');
        if (dashSplit.length > 1) {
            // Ambil bagian setelah dash pertama (" Perancangan Perangkat Lunak [M]")
            let tempCourse = dashSplit.slice(1).join('-').trim();
            // Hapus kelas [M] di akhir jika ada
            currentCourse = tempCourse.replace(/\[.*?\]/g, '').trim(); 
        } else {
            currentCourse = courseFull;
        }
    }
  }

  // 2. Radio Buttons (Likert Scale)
  const radioGroups = {};
  document.querySelectorAll('input[type="radio"]').forEach(radio => {
    if (!radioGroups[radio.name]) radioGroups[radio.name] = [];
    radioGroups[radio.name].push(radio);
  });

  Object.keys(radioGroups).forEach(name => {
    const group = radioGroups[name];
    if (group.length > 0) {
      group.sort((a, b) => (parseFloat(b.value) || 0) - (parseFloat(a.value) || 0));
      if (mode === 'max') {
        group[0].checked = true;
      } else {
        const choice = group.slice(0, 2)[Math.floor(Math.random() * Math.min(2, group.length))];
        choice.checked = true;
      }
    }
  });

  // 3. Text Areas (Template Comments)
  const textAreas = document.querySelectorAll('textarea');
  
  // Template Dosen (Placeholder: {dosen}, {matkul})
  const lecturerTemplates = [
    "Saya sangat mengapresiasi metode pengajaran yang diterapkan oleh {dosen}. Materi yang disampaikan sangat terstruktur, jelas, dan mudah dipahami, sehingga sangat membantu saya dalam menguasai konsep-konsep penting.",
    "Bapak/Ibu {dosen} mampu menciptakan suasana kelas yang kondusif dan interaktif. Beliau sangat terbuka terhadap pertanyaan mahasiswa dan memberikan penjelasan yang komprehensif serta relevan dengan implementasi di dunia nyata.",
    "Kedisiplinan dan dedikasi {dosen} dalam mengajar patut diacungi jempol. Feedback yang diberikan terhadap tugas-tugas mahasiswa sangat konstruktif dan membantu kami untuk memperbaiki diri.",
    "Penyampaian materi oleh {dosen} sangat inspiratif. Beliau tidak hanya mengajarkan teori, tetapi juga memberikan wawasan praktis yang sangat berharga. Terima kasih atas bimbingannya selama satu semester ini.",
    "Cara {dosen} menjelaskan materi yang kompleks menjadi sederhana sangat luar biasa. Beliau sangat sabar dalam membimbing mahasiswa membuat proses pembelajaran menjadi pengalaman yang menyenangkan."
  ];

  // Template Mata Kuliah (Placeholder: {matkul})
  const courseTemplates = [
    "Pembelajaran di mata kuliah {matkul} ini memberikan wawasan yang sangat mendalam dan relevan dengan perkembangan teknologi saat ini. Silabus yang disusun sangat rapi dan logis.",
    "Materi yang diajarkan dalam mata kuliah {matkul} sangat menantang namun memberikan value yang besar bagi pengembangan kompetensi saya. Tugas-tugas yang diberikan sangat membantu pemahaman materi.",
    "Saya merasa mendapatkan banyak manfaat dari mata kuliah {matkul}. Bahan ajar yang disediakan sangat lengkap dan mudah diakses, serta topik-topik diskusinya sangat menarik.",
    "Struktur perkuliahan {matkul} ini sangat baik. Keseimbangan antara teori dan praktik sangat pas, sehingga mahasiswa dapat memahami konsep sekaligus penerapannya.",
    "Mata kuliah {matkul} ini sangat penting dan mendasar. Harapannya mata kuliah ini terus dipertahankan kualitasnya karena sangat menunjang karir profesional mahasiswa ke depannya."
  ];

  textAreas.forEach(area => {
    let isCourse = false;
    
    const parent = area.parentElement;
    const previousSibling = parent ? parent.previousElementSibling : null;
    const textContext = (
        (parent ? parent.innerText : "") + " " + 
        (previousSibling ? previousSibling.innerText : "")
    ).toLowerCase();

    if (textContext.includes("mata kuliah") || 
        textContext.includes("mk_saran") || 
        (area.name && area.name.toLowerCase().includes("mk"))) {
        isCourse = true;
    }

    if (isCourse && !config.fillCourse) return;
    if (!isCourse && !config.fillLecturer) return;

    if (!area.value || area.value.trim() === "") {
       let template = "";
       if (isCourse) {
           template = courseTemplates[Math.floor(Math.random() * courseTemplates.length)];
       } else {
           template = lecturerTemplates[Math.floor(Math.random() * lecturerTemplates.length)];
       }

       // Replace Placeholders
       let comment = template
           .replace(/{dosen}/g, currentLecturer)
           .replace(/{matkul}/g, currentCourse);
           
       area.value = comment;
    }
  });
}
