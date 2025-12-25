document.addEventListener('DOMContentLoaded', async () => {
    const selectEl = document.getElementById('lecturerSelect');
    const genderSelect = document.getElementById('genderSelect');
    const genderGroup = document.getElementById('genderGroup');
    const toggleOptions = document.querySelectorAll('.toggle-option');
    
    let currentMode = 'dosen'; // Default
    let rawOptions = []; 
  
    // 1. Setup Toggle Logic
    toggleOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            // UI Update
            toggleOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            
            // Logic Update
            currentMode = opt.getAttribute('data-value');
            updateUIState();
            renderDropdown();
        });
    });

    function updateUIState() {
        if (currentMode === 'matkul') {
            genderGroup.style.display = 'none';
        } else {
            genderGroup.style.display = 'block';
        }
    }

    // 2. Get Data
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url.includes("akademik.its.ac.id")) {
      showStatus("Buka halaman Kuesioner IPD ITS terlebih dahulu.", false);
      return;
    }
  
    chrome.tabs.sendMessage(tab.id, { action: 'get_options' }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus("Silakan refresh halaman web.", false);
        return; 
      }
      if (response && response.options) {
        rawOptions = response.options;
        renderDropdown();
      }
    });
  
    // 3. Render Dropdown based on Mode
    function renderDropdown() {
      selectEl.innerHTML = '';
      
      if (rawOptions.length === 0) {
        const opt = document.createElement('option');
        opt.text = "Tidak ada data";
        selectEl.add(opt);
        selectEl.disabled = true;
        return;
      }
  
      rawOptions.forEach(item => {
        const option = document.createElement('option');
        option.value = item.value;
        option.selected = item.selected;
        
        let displayText = item.text;
        const parts = item.text.split('--');
        
        if (parts.length >= 2) {
            const coursePart = parts[0].trim();
            const lecturerPart = parts[1].trim();
            
            if (currentMode === 'dosen') {
                displayText = lecturerPart;
            } else if (currentMode === 'matkul') {
                displayText = coursePart;
            } else {
                displayText = item.text; // Both
            }
        }
  
        option.text = displayText;
        selectEl.appendChild(option);
      });
      selectEl.disabled = false;
    }
  
    // 4. Action Handlers
    selectEl.addEventListener('change', () => {
      chrome.tabs.sendMessage(tab.id, { action: 'select_option', value: selectEl.value });
    });
  
    document.getElementById('fillBtn').addEventListener('click', () => handleAction('fill_max'));
    document.getElementById('fillRandomBtn').addEventListener('click', () => handleAction('fill_random'));
  
    async function handleAction(actionType) {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        const fillLecturer = (currentMode === 'dosen' || currentMode === 'both');
        const fillCourse = (currentMode === 'matkul' || currentMode === 'both');
        const genderSapaan = genderSelect.value; // "Bapak" atau "Ibu"

        if (tab) {
            chrome.tabs.sendMessage(tab.id, { 
                action: actionType,
                config: {
                    fillLecturer: fillLecturer,
                    fillCourse: fillCourse,
                    gender: genderSapaan
                }
            }, (response) => {
               if (chrome.runtime.lastError) {
                 showStatus("Error: Refresh halaman.", false);
               } else {
                 showStatus(response?.status || "Selesai!", true);
               }
            });
        }
    }

    function showStatus(msg, isSuccess) {
        const el = document.getElementById('status');
        el.innerText = msg;
        el.className = isSuccess ? 'success' : 'error';
        el.style.display = 'block';
    }
});
