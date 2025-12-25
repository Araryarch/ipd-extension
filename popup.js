document.getElementById('fillBtn').addEventListener('click', async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tab) {
    chrome.tabs.sendMessage(tab.id, { action: 'fill_max' }, (response) => {
      if (chrome.runtime.lastError) {
        document.getElementById('status').innerText = 'Error: Refresh halaman dulu.';
      } else {
        document.getElementById('status').innerText = response?.status || 'Selesai!';
      }
    });
  }
});

document.getElementById('fillRandomBtn').addEventListener('click', async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tab) {
    chrome.tabs.sendMessage(tab.id, { action: 'fill_random' }, (response) => {
      if (chrome.runtime.lastError) {
        document.getElementById('status').innerText = 'Error: Refresh halaman dulu.';
      } else {
        document.getElementById('status').innerText = response?.status || 'Selesai!';
      }
    });
  }
});
