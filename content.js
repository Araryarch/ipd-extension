console.log("IPD Extension Content Script LOADED v2");

// --- LISTENER ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'get_options') {
    // Explicitly target the ID provided by user
    const select = document.getElementById('mk_kuesioner');
    if (select) {
      const options = Array.from(select.options).map(opt => ({
        value: opt.value,
        text: opt.text.trim(),
        selected: opt.selected
      })).filter(o => o.value !== ""); // Filter out empty placeholder
      
      console.log("IPD Extension: Found options", options.length);
      sendResponse({ options: options });
    } else {
      console.warn("IPD Extension: #mk_kuesioner select not found");
      sendResponse({ options: [] });
    }
  } 
  else if (request.action === 'get_header_info') {
      const headers = document.querySelectorAll('div.FilterBox h3');
      if (headers.length >= 2) {
          // Lecturer Page
          const rawLecturer = headers[1].innerText.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
          sendResponse({ lecturer: rawLecturer });
      } else {
          // Matkul Page or Unknown
          // Try H2
          const h2Header = document.querySelector('h2'); 
          if (h2Header && h2Header.innerText.includes("Komentar untuk Dosen:")) {
               const parts = h2Header.innerText.split(":");
               if (parts.length > 1) {
                   sendResponse({ lecturer: parts[1].trim() });
                   return;
               }
          }
          sendResponse({ lecturer: null });
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
  else if (request.action === 'get_debug_info') {
      // 1. Detect Type
      let pType = "Unknown";
      if (document.querySelector('input[name^="MK"]')) pType = "Mata Kuliah Page";
      else if (document.querySelector('input[name^="DO"]')) pType = "Dosen Page";

      // 2. Scrape Course
      let dCourse = "-";
      const divHeaders = document.querySelectorAll('div.FilterBox h3');
      if (divHeaders.length > 0) {
          dCourse = divHeaders[0].innerText;
      } else {
          const h3 = Array.from(document.querySelectorAll('h3')).find(h => h.innerText.includes(' -- '));
          if (h3) dCourse = h3.innerText.split('--')[0];
      }

      // 3. Scrape Lecturer
      let dLecturer = "-";
      if (divHeaders.length >= 2) {
          dLecturer = divHeaders[1].innerText;
      } else {
           const h3 = Array.from(document.querySelectorAll('h3')).find(h => h.innerText.includes(' -- '));
           if (h3) {
               const parts = h3.innerText.split('--');
               if (parts.length > 1) dLecturer = parts[1];
           } else {
               const h2 = Array.from(document.querySelectorAll('h2')).find(h => h.innerText.includes('Komentar untuk Dosen:'));
               if (h2) dLecturer = h2.innerText.replace('Komentar untuk Dosen:', '').trim();
           }
      }

      // 4. Count Radios
      const radios = document.querySelectorAll('input[type="radio"]').length;

      sendResponse({
          pageType: pType,
          course: dCourse,
          lecturer: dLecturer,
          radios: radios
      });
  }
  else if (request.action === 'fill_max' || request.action === 'fill_random' || request.action === 'fill_good') {
    const mode = request.action === 'fill_max' ? 'max' : 'random';
    // config is passed directly from popup
    const resultMsg = fillForms(mode, request.config);
    sendResponse({ status: resultMsg });
  }
});

// --- MAIN LOGIC ---
function fillForms(mode, config) {
  try {
    //Templates
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

    // --- 1. IDENTIFY PAGE CONTEXT & SCRAPE DATA ---
    let currentLecturer = "Bapak/Ibu Dosen";
    let currentCourse = "Mata Kuliah ini";
    let isMatkulPage = false;
    let isDosenPage = false;

    // Check Radio Buttons to determine page type
    const hasMKRadios = document.querySelector('input[name^="MK"]');
    const hasDORadios = document.querySelector('input[name^="DO"]');

    if (hasMKRadios) isMatkulPage = true;
    if (hasDORadios) isDosenPage = true;

    // --- SCRAPING STRATEGY ---

    // A. Course Name extraction
    // Strategy 1: Dosen Page Style (div.FilterBox h3)
    const filterBoxHeaders = document.querySelectorAll('div.FilterBox h3');
    if (filterBoxHeaders.length > 0) {
        const text = filterBoxHeaders[0].innerText; // "Code - Name [Class]"
        if (text.includes('-')) {
             currentCourse = text.substring(text.indexOf('-') + 1).replace(/\[.*?\]/g, '').trim();
        } else {
             currentCourse = text.replace(/\[.*?\]/g, '').trim();
        }
    }
    
    // Strategy 2: Matkul Page Style (Single h3 with " -- ") or Fallback
    // "ER234302 - Pemrograman Web [M] -- Bintang Nuralamsyah..."
    const combinedHeader = Array.from(document.querySelectorAll('h3')).find(h => h.innerText.includes(' -- '));
    if (combinedHeader && (!filterBoxHeaders.length || currentCourse === "Mata Kuliah ini")) {
        const text = combinedHeader.innerText;
        const parts = text.split('--');
        if (parts.length > 0) {
            const coursePart = parts[0];
             if (coursePart.includes('-')) {
                 currentCourse = coursePart.substring(coursePart.indexOf('-') + 1).replace(/\[.*?\]/g, '').trim();
            }
        }
    }

    // B. Lecturer Name extraction
    // Priority 1: Manual Input (Global)
    if (config.manualLecturer && config.manualLecturer.trim() !== "" && config.manualLecturer !== "Bapak/Ibu Dosen") {
        currentLecturer = config.manualLecturer.trim();
    } else {
        // Priority 2: Scrape
        if (isDosenPage && filterBoxHeaders.length >= 2) {
             const text = filterBoxHeaders[1].innerText;
             currentLecturer = text.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
        } else if (combinedHeader) {
            const parts = combinedHeader.innerText.split('--');
            if (parts.length > 1) {
                // "Bintang Nuralamsyah, S.Kom..."
                currentLecturer = parts[1].trim();
            }
        } else if (isDosenPage) {
             // Try H2 "Komentar untuk Dosen: ..."
             const h2 = Array.from(document.querySelectorAll('h2')).find(h => h.innerText.includes('Komentar untuk Dosen:'));
             if (h2) {
                 const parts = h2.innerText.split(':');
                 if (parts.length > 1) currentLecturer = parts[1].trim();
             }
        }
    }

    // --- 2. FILL RADIO BUTTONS ---
    const radioGroups = {};
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
        if (!radioGroups[radio.name]) radioGroups[radio.name] = [];
        radioGroups[radio.name].push(radio);
    });

    Object.keys(radioGroups).forEach(name => {
        const group = radioGroups[name];
        if (group.length > 0) {
            // Sort descending (4 -> 1)
            group.sort((a, b) => parseInt(b.value) - parseInt(a.value));
            
            if (mode === 'max') {
                group[0].checked = true;
            } else {
                // Random (Top 2)
                const choice = group.slice(0, 2)[Math.floor(Math.random() * Math.min(2, group.length))];
                choice.checked = true;
            }
        }
    });

    // --- 3. FILL TEXTAREAS ---
    const sapaan = config.gender || "Bapak";
    const textAreas = document.querySelectorAll('textarea');
    
    textAreas.forEach(area => {
        let isCourse = false;
        
        // Context Detection via H2 Proximity (Robust for both page types)
        let container = area.closest('table');
        let headerFound = false;
        if (container) {
            let sibling = container.previousElementSibling;
            let attempts = 0;
            while (sibling && attempts < 10) { 
                 if (sibling.tagName === 'H2') {
                     if (sibling.innerText.includes('Mata Kuliah')) isCourse = true;
                     else if (sibling.innerText.includes('Dosen')) isCourse = false;
                     headerFound = true;
                     break;
                 }
                 sibling = sibling.previousElementSibling;
                 attempts++;
            }
        }
        
        if (!headerFound) {
            // Fallback to page type detection
            if (isMatkulPage) isCourse = true;
            else if (isDosenPage) isCourse = false;
            // Fallback to ID/Name check
            if (area.name.toLowerCase().includes('mk')) isCourse = true;
        }

        // Apply Config Logic
        if (isCourse && !config.fillCourse) return;
        if (!isCourse && !config.fillLecturer) return;

        let template = isCourse ? 
            courseTemplates[Math.floor(Math.random() * courseTemplates.length)] : 
            lecturerTemplates[Math.floor(Math.random() * lecturerTemplates.length)];
        
        area.value = template
            .replace(/{dosen}/g, currentLecturer)
            .replace(/{matkul}/g, currentCourse)
            .replace(/{sapaan}/g, sapaan);
            
        area.dispatchEvent(new Event('change', { bubbles: true }));
        area.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // --- 4. CHECKBOX ---
    const chk = document.getElementById('chkPermanent');
    if (chk) chk.checked = true;

    return "Pengisian Selesai!";
  } catch(e) {
      console.error(e);
      return "Error: " + e.message;
  }
}
