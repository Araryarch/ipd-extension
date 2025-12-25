chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fill_max') {
    const count = fillAll('max');
    sendResponse({ status: `Berhasil mengisi data!` });
  } else if (request.action === 'fill_random') {
    const count = fillAll('random');
    sendResponse({ status: `Berhasil mengisi data secara acak positif!` });
  }
});

function fillAll(mode) {
  // 1. Handle Select Options (Dosen / MK)
  // Menangani dropbox pilihan dosen/mk jika belum terpilih
  const selects = document.querySelectorAll('select');
  selects.forEach(select => {
    // Jika masih di index 0 (biasanya "Pilih..." atau kosong), pilih opsi ke-1 (index 1) which is usually the first lecturer
    if (select.selectedIndex === 0 && select.options.length > 1) {
      select.selectedIndex = 1; // Pilih opsi pertama yang valid
      
      // Trigger event change agar website 'sadar' ada perubahan (penting untuk website modern/php legacy yg pake onchange)
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  // 2. Handle Radio Buttons (Skala Likert)
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
        // Sort DESCENDING by value (asumsi value besar = bagus, misal 4 atau 5)
        // Kadang value="4.00" atau value="4"
        group.sort((a, b) => {
           const valA = parseFloat(a.value) || 0;
           const valB = parseFloat(b.value) || 0;
           return valB - valA;
        });
        // Select yang paling besar valuesnya
        group[0].checked = true;
      } else if (mode === 'random') {
        // Ambil 2 terbaik (misal 3 dan 4 dari skala 4)
        const sorted = group.sort((a, b) => {
            const valA = parseFloat(a.value) || 0;
            const valB = parseFloat(b.value) || 0;
            return valB - valA;
         });
        const topChoices = sorted.slice(0, 2);
        const choice = topChoices[Math.floor(Math.random() * topChoices.length)];
        choice.checked = true;
      }
    }
  });

  // 3. Handle Text Areas (Saran/Komentar)
  const textAreas = document.querySelectorAll('textarea');
  
  // Koleksi komentar yang sopan, panjang, dan konstruktif
  const positiveComments = [
    "Penyampaian materi kuliah selama satu semester ini sudah sangat baik, terstruktur, dan mudah dipahami. Dosen mampu menjelaskan konsep-konsep yang sulit dengan analogi yang relevan. Terima kasih atas dedikasi Bapak/Ibu dalam mengajar kami.",
    "Secara keseluruhan, metode pengajaran yang diterapkan sangat efektif dan interaktif. Dosen memberikan kesempatan yang cukup bagi mahasiswa untuk bertanya dan berdiskusi. Materi yang disampaikan juga sangat relevan dengan perkembangan terkini.",
    "Saya sangat mengapresiasi kedisiplinan dan profesionalisme dosen dalam mengajar. Materi disampaikan dengan jelas dan runtut. Semoga kualitas pengajaran yang sangat baik ini dapat terus dipertahankan ke depannya.",
    "Dosen memiliki penguasaan materi yang sangat mendalam dan mampu membangkitkan motivasi belajar mahasiswa. Penjelasan di kelas sangat komprehensif. Terima kasih banyak atas bimbingannya.",
    "Proses pembelajaran berjalan dengan sangat kondusif. Dosen sangat komunikatif dan responsif terhadap pertanyaan mahasiswa. Materi perkuliahan tersampaikan dengan sangat baik dan jelas."
  ];

  textAreas.forEach(area => {
    // Hanya isi jika kosong agar tidak menimpa tulisan manual user
    if (!area.value || area.value.trim() === "") {
        const randomComment = positiveComments[Math.floor(Math.random() * positiveComments.length)];
        area.value = randomComment;
    }
  });
  
  return true;
}
