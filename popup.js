document.addEventListener('DOMContentLoaded', async () => {
  const selectEl = document.getElementById('lecturerSelect');
  const statusEl = document.getElementById('status');
  
  // 1. Get current tab
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab || !tab.url.includes("akademik.its.ac.id")) {
    statusEl.innerText = "Buka halaman Kuesioner IPD ITS terlebih dahulu.";
    statusEl.className = "status-container status-error";
    return;
  }

  // 2. Request options from content script
  chrome.tabs.sendMessage(tab.id, { action: 'get_options' }, (response) => {
    if (chrome.runtime.lastError) {
      statusEl.innerText = "Silakan refresh halaman web ini.";
      statusEl.className = "status-container status-error";
      return;
    }

    if (response && response.options && response.options.length > 0) {
      selectEl.innerHTML = ''; // Clear loading
      
      response.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.text = opt.text;
        option.selected = opt.selected;
        selectEl.appendChild(option);
      });
      selectEl.disabled = false;
    } else {
      selectEl.innerHTML = '<option>Tidak ada data dosen/MK ditemukan</option>';
    }
  });

  // 3. Handle Select Change
  selectEl.addEventListener('change', () => {
    const value = selectEl.value;
    chrome.tabs.sendMessage(tab.id, { action: 'select_option', value: value });
  });

  // 4. Handle Buttons
  document.getElementById('fillBtn').addEventListener('click', () => handleAction('fill_max'));
  document.getElementById('fillRandomBtn').addEventListener('click', () => handleAction('fill_random'));
});

async function handleAction(actionType) {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, { action: actionType }, (response) => {
       const statusDiv = document.getElementById('status');
       if (chrome.runtime.lastError) {
         statusDiv.innerText = "Error: Refresh halaman.";
         statusDiv.className = 'status-container status-error';
       } else {
         statusDiv.innerText = response?.status || "Selesai!";
         statusDiv.className = 'status-container status-success';
       }
    });
  }
}
