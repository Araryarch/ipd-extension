document.addEventListener('DOMContentLoaded', async () => {
    // === Elements ===
    const modeSelect = document.getElementById('modeSelect'); // Assuming this is the toggle mechanism
    const genderSelect = document.getElementById('genderSelect');
    const genderGroup = document.getElementById('genderGroup');
    const toggleOptions = document.querySelectorAll('.toggle-option');
    const fillGoodBtn = document.getElementById('fillGoodBtn');
    const fillRandomBtn = document.getElementById('fillRandomBtn');
    const statusEl = document.getElementById('status');
    const manualInput = document.getElementById('manual_lecturer');

    let currentMode = 'dosen'; // Default

    // === 1. Setup Toggle Logic (Visuals & State) ===
    toggleOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            // UI Update
            toggleOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            
            // Logic Update
            currentMode = opt.getAttribute('data-value');
            
            // Update hidden select if it exists, or just rely on currentMode var
            if (modeSelect) modeSelect.value = currentMode;

            updateUIState();
        });
    });

    // === Debug Info Logic ===
    function refreshDebugInfo() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if(tabs[0] && tabs[0].url.includes("akademik.its.ac.id")) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'get_debug_info' }, (response) => {
                    if (response) {
                        document.getElementById('info_type').innerText = response.pageType || "Unknown";
                        document.getElementById('info_course').innerText = response.course || "-";
                        document.getElementById('info_lecturer').innerText = response.lecturer || "-";
                        document.getElementById('info_radios').innerText = response.radios || "0";
                    }
                });
            }
        });
    }

    const refreshBtn = document.getElementById('refreshScrape');
    if (refreshBtn) refreshBtn.addEventListener('click', refreshDebugInfo);

    // Initial Load
    refreshDebugInfo();

    // === 2. Dropdown Logic (Restored for Matkul) ===
    let rawOptions = [];
    
    // Get Data from Content Script
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if(tabs[0] && tabs[0].url.includes("akademik.its.ac.id")) {
             chrome.tabs.sendMessage(tabs[0].id, { action: 'get_options' }, (response) => {
                  if (response && response.options) {
                      rawOptions = response.options;
                      renderDropdown(); // Initial render
                  }
             });
        }
    });

    // Render Dropdown
    function renderDropdown() {
        const selectEl = document.getElementById('mk_dropdown'); // Will add this to HTML
        if (!selectEl) return;
        
        selectEl.innerHTML = '';
        if (rawOptions.length === 0) {
            const opt = document.createElement('option');
            opt.text = "Tidak ada data dropdown";
            selectEl.add(opt);
            selectEl.disabled = true;
            return;
        }

        const optDefault = document.createElement('option');
        optDefault.text = "-- Pilih Mata Kuliah --";
        optDefault.value = "";
        selectEl.add(optDefault);

        rawOptions.forEach(item => {
            const option = document.createElement('option');
            option.value = item.value;
            // Display text: Clean up formatting if needed
            option.text = item.text;
            if (item.selected) option.selected = true;
            selectEl.add(option);
        });
        
        selectEl.disabled = false;
        
        // Listener for change
        selectEl.addEventListener('change', () => {
             if (selectEl.value) {
                 chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'select_option', value: selectEl.value });
                 });
             }
        });
    }

    function updateUIState() {
        const manualGroup = document.getElementById('manualInputGroup'); // Wrapper for manual input
        const dropdownGroup = document.getElementById('dropdownGroup'); // Wrapper for dropdown
        
        if (currentMode === 'dosen') {
             if (genderGroup) genderGroup.style.display = 'block';
             if (manualGroup) manualGroup.style.display = 'block';
             if (dropdownGroup) dropdownGroup.style.display = 'none';
        } else if (currentMode === 'matkul') {
             if (genderGroup) genderGroup.style.display = 'none';
             if (manualGroup) manualGroup.style.display = 'none'; // Matkul uses dropdown/scrape
             if (dropdownGroup) dropdownGroup.style.display = 'block';
        } else {
             // Semua? Maybe show both? simpler to default to dosen style context
             if (genderGroup) genderGroup.style.display = 'block';
             if (manualGroup) manualGroup.style.display = 'block';
             if (dropdownGroup) dropdownGroup.style.display = 'block';
        }
    }

    // Initialize UI
    updateUIState();

    // === 2. Helper Functions ===
    function showStatus(msg, isSuccess) {
        if (!statusEl) return;
        
        let textToShow = msg;
        if (typeof msg === 'object' && msg !== null) {
            textToShow = msg.status || msg.message || JSON.stringify(msg);
        }

        statusEl.innerText = textToShow;
        statusEl.className = 'status ' + (isSuccess ? 'success' : 'error');
        statusEl.style.display = 'block';
        
        // Auto hide after 3 seconds
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 3000);
    }

    function sendMessageToContent(actionType, config) {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (!tabs || !tabs[0]) {
                showStatus("Error: Tab tidak aktif.", false);
                return;
            }

            // Check if URL is correct
            if (!tabs[0].url.includes("akademik.its.ac.id")) {
                showStatus("Buka halaman IPD ITS dulu!", false);
                return;
            }

            chrome.tabs.sendMessage(tabs[0].id, {
                action: actionType,
                config: config
            }, (response) => {
                if (chrome.runtime.lastError) {
                    // Usually happens if content script isn't loaded or page is refreshing
                    console.error(chrome.runtime.lastError);
                    showStatus("Gagal. Coba refresh halaman.", false);
                } else {
                    showStatus(response?.status || "Selesai!", true);
                }
            });
        });
    }

    // === 3. Action Handlers ===
    
    // Config Generator
    function getConfig() {
        const lecturerName = manualInput ? manualInput.value : "Bapak/Ibu Dosen";
        
        let fillLecturer = false;
        let fillCourse = false;
          
        if (currentMode === 'dosen') fillLecturer = true;
        else if (currentMode === 'matkul') fillCourse = true;
        else { fillLecturer = true; fillCourse = true; } // 'semua'

        return {
            gender: genderSelect ? genderSelect.value : "Bapak",
            fillLecturer: fillLecturer,
            fillCourse: fillCourse,
            manualLecturer: lecturerName
        };
    }

    if (fillGoodBtn) {
        fillGoodBtn.addEventListener('click', () => {
            const config = getConfig();
            sendMessageToContent('fill_good', config);
        });
    }

    if (fillRandomBtn) {
        fillRandomBtn.addEventListener('click', () => {
            const config = getConfig();
            sendMessageToContent('fill_random', config);
        });
    }
});
