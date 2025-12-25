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
    const config = request.config || { fillLecturer: true, fillCourse: true, gender: 'Bapak' };
    
    fillForms(mode, config);
    sendResponse({ status: 'Pengisian selesai!' });
  }
});

function fillForms(mode, config) {
  // 1. Parse Context
  let currentLecturer = "Dosen";
  let currentCourse = "Mata Kuliah ini";

  const select = document.getElementById('mk_kuesioner');
  if (select && select.selectedIndex >= 0) {
    const text = select.options[select.selectedIndex].text; 
    const parts = text.split('--');
    if (parts.length >= 2) {
        currentLecturer = parts[1].trim(); 
        
        const courseFull = parts[0].trim(); 
        const dashSplit = courseFull.split('-');
        if (dashSplit.length > 1) {
            let tempCourse = dashSplit.slice(1).join('-').trim();
            currentCourse = tempCourse.replace(/\[.*?\]/g, '').trim(); 
        } else {
            currentCourse = courseFull;
        }
    }
  }

  // Define Sapaan
  const sapaan = config.gender || "Bapak"; // Default Bapak if empty

  // 2. Radio Buttons
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
  
  // Template Dosen (Placeholder: {dosen}, {sapaan}, {matkul})
  // {sapaan} akan diganti "Bapak" atau "Ibu" sesuai pilihan dropdown. Tidak akan ada "Bapak/Ibu".
  const lecturerTemplates = [
    "Saya sangat mengapresiasi metode pengajaran yang diterapkan oleh {sapaan} {dosen}. Materi yang disampaikan sangat terstruktur, jelas, dan mudah dipahami.",
    "{sapaan} {dosen} mampu menciptakan suasana kelas yang kondusif. Beliau sangat terbuka terhadap pertanyaan mahasiswa dan memberikan penjelasan yang komprehensif.",
    "Kedisiplinan dan dedikasi {sapaan} {dosen} dalam mengajar patut diacungi jempol. Feedback yang diberikan terhadap tugas sangat konstruktif.",
    "Penyampaian materi oleh {sapaan} {dosen} sangat inspiratif. Terima kasih atas bimbingannya selama satu semester ini.",
    "Cara {sapaan} {dosen} menjelaskan materi yang kompleks menjadi sederhana sangat luar biasa. Proses pembelajaran menjadi pengalaman yang menyenangkan.",
    "Terima kasih kepada {sapaan} {dosen} yang selalu sabar dalam menjawab pertanyaan kami. Sangat membantu dalam memahami materi perkuliahan.",
    "Gaya mengajar {sapaan} {dosen} sangat menarik dan tidak membosankan. Banyak contoh kasus nyata yang diberikan sehingga materi lebih mudah dicerna.",
    "Sangat berkesan dengan cara {sapaan} {dosen} membawakan materi. Tegas namun tetap santai dan mudah diajak diskusi."
  ];

  const courseTemplates = [
    "Pembelajaran di mata kuliah {matkul} ini memberikan wawasan yang sangat mendalam dan relevan dengan perkembangan teknologi saat ini.",
    "Materi yang diajarkan dalam mata kuliah {matkul} sangat menantang namun memberikan value yang besar.",
    "Saya merasa mendapatkan banyak manfaat dari mata kuliah {matkul}. Bahan ajar yang disediakan sangat lengkap.",
    "Struktur perkuliahan {matkul} ini sangat baik. Keseimbangan antara teori dan praktik sangat pas.",
    "Mata kuliah {matkul} ini sangat penting. Harapannya mata kuliah ini terus dipertahankan kualitasnya.",
    "Topik-topik dalam {matkul} sangat relevan dengan kebutuhan industri. Sangat menambah wawasan praktis.",
    "Secara keseluruhan, mata kuliah {matkul} ini dieksekusi dengan sangat baik. Beban tugas sesuai dengan bobot SKS."
  ];

  textAreas.forEach(area => {
    let isCourse = false;
    
    // 1. Cek Atribut Name/ID langsung
    const nameId = (area.name + " " + area.id).toLowerCase();
    
    // FIX: Berdasarkan laporan user, mk_kuesioner adalah matkul, dan txtKomentar juga matkul (Saran).
    // txtKomentar yang ditunjukkan user adalah untuk mata kuliah.
    if (nameId.includes("mk") || nameId.includes("matkul") || nameId === "txtkomentar") {
        isCourse = true;
    }

    // 2. Cek Konteks DOM (Traverse Upper Levels)
    // Berjalan ke atas hingga 4 level (td -> tr -> tbody -> table atau div wrapper)
    // Mencari kata kunci "Mata Kuliah" di sekitar elemen
    if (!isCourse) {
        let current = area;
        let combinedText = "";
        
        for (let i = 0; i < 4; i++) {
            if (!current) break;
            
            // Ambil text dari sibling sebelumnya (biasanya label ada sebelum input)
            let sibling = current.previousElementSibling;
            while (sibling) {
                combinedText += " " + sibling.innerText + " ";
                sibling = sibling.previousElementSibling;
            }

            // Ambil text dari parent langsung (barangkali label satu container)
            if (current.parentElement) {
                 // Clone untuk avoid performance heavy ops? No, innerText is fine for small depths.
                 // Hati-hati jangan ambil text dari textarea itu sendiri secara rekursif berlebihan, 
                 // tapi kita butuh text label disampingnya.
                 combinedText += " " + current.parentElement.innerText + " ";
            }
            
            current = current.parentElement;
        }
        
        combinedText = combinedText.toLowerCase();

        // Keywords Penentu
        if (combinedText.includes("mata kuliah") || combinedText.includes("komentar mk")) {
            isCourse = true;
        }
    }

    // 3. Pengecekan Khusus berdasarkan ID `txtKomentar` yang dilaporkan user
    // Jika ID adalah txtKomentar dan belum terdeteksi, kita coba heuristic tambahan
    // Biasanya txtKomentar itu generic, tapi jika ada 2 textarea, yang satu pasti txtSaranDosen atau semacamnya.
    // Jika masih ambigu, biarkan default (Lecturer). 
    // NAMUN, jika user bilang "gak berubah value nya", berarti script mengira ini 'Lecturer' 
    // tapi user sedang mode 'Matkul' (atau sebaliknya).
    // Kita asumsikan defaultnya Lecturer.

    // Cek Config User & Eksekusi
    // Logic: 
    // isCourse = TRUE  -> Butuh config.fillCourse = TRUE
    // isCourse = FALSE -> Butuh config.fillLecturer = TRUE

    if (isCourse && !config.fillCourse) return;
    if (!isCourse && !config.fillLecturer) return;

    // Isi comment (Overwrite existing value to allow regeneration)
    let template = "";
    if (isCourse) {
        template = courseTemplates[Math.floor(Math.random() * courseTemplates.length)];
    } else {
        template = lecturerTemplates[Math.floor(Math.random() * lecturerTemplates.length)];
    }

    // Replace Placeholders
    let comment = template
        .replace(/{dosen}/g, currentLecturer)
        .replace(/{matkul}/g, currentCourse)
        .replace(/{sapaan}/g, sapaan);
        
    area.value = comment;
    
    // Trigger change event just in case
    area.dispatchEvent(new Event('change', { bubbles: true }));
    area.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
