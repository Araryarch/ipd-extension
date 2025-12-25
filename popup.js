document.getElementById('fillBtn').addEventListener('click', async () => {
    handleAction('fill_max');
  });
  
  document.getElementById('fillRandomBtn').addEventListener('click', async () => {
    handleAction('fill_random');
  });
  
  async function handleAction(actionType) {
    const statusDiv = document.getElementById('status');
    statusDiv.style.display = 'none';
    statusDiv.className = 'status-container';
  
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab) {
        // Cek apakah url sesuai target secara kasar (optional, content script sudah limit di manifest)
        if (!tab.url.includes("akademik.its.ac.id")) {
             showStatus("Gunakan extension ini di halaman Akademik ITS.", false);
             return;
        }

      chrome.tabs.sendMessage(tab.id, { action: actionType }, (response) => {
        if (chrome.runtime.lastError) {
          // Biasanya terjadi jika content script belum load (perlu refresh)
          showStatus('Gagal: Silakan refresh halaman ini terlebih dahulu.', false);
        } else {
          showStatus(response?.status || 'Selesai!', true);
        }
      });
    } else {
        showStatus("Tab tidak ditemukan.", false);
    }
  }
  
  function showStatus(message, isSuccess) {
    const statusDiv = document.getElementById('status');
    statusDiv.innerText = message;
    statusDiv.className = isSuccess ? 'status-container status-success' : 'status-container status-error';
    statusDiv.style.display = 'block';
  }
  
