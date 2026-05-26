// Injector script - injects the interceptor into the page context
(function() {
  // Verify we're on the correct page
  const currentUrl = window.location.href;
  if (!currentUrl.includes('compass.education/Records/UserNew.aspx')) {
    console.log('[Clearance Extension] Not on correct page, skipping');
    return;
  }
  
  console.log('[Clearance Extension] Injector loaded on Compass Education page');

  // Inject the interceptor script into the page
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('interceptor.js');
  script.onload = function() {
    console.log('[Clearance Extension] Interceptor script injected');
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);

  // Listen for messages from the interceptor
  let periodsData = null;
  let eventsData = null;
  let schoolInfo = null;
  let clearanceButton = null;
  let checkInterval = null;

  window.addEventListener('message', function(event) {
    // Only accept messages from the same window
    if (event.source !== window) return;

    if (event.data.type === 'SCHOOL_INFO') {
      console.log('[Clearance Extension] Received school info', event.data.data);
      schoolInfo = event.data.data;
      chrome.storage.local.set({ schoolInfo: schoolInfo });
    } else if (event.data.type === 'TIMETABLE_PERIODS_DATA') {
      console.log('[Clearance Extension] Received periods data', event.data.data);
      periodsData = event.data.data;
      chrome.storage.local.set({ periodsData: periodsData });
      checkAndShowButton();
    } else if (event.data.type === 'TIMETABLE_EVENTS_DATA') {
      console.log('[Clearance Extension] Received events data', event.data.data);
      eventsData = event.data.data;
      chrome.storage.local.set({ eventsData: eventsData });
      checkAndShowButton();
    }
  });

  // Function to extract student information from the page
  function extractStudentInfo() {
    const studentInfo = {
      name: '',
      yearGroup: '',
      faction: ''
    };

    // Extract student name from h1 (class varies between platforms)
    const nameElement = document.querySelector('h1[class*="MuiTypography-header"]');
    if (nameElement) {
      studentInfo.name = nameElement.textContent.trim();
    }

    // Extract year group from link containing "YearLevel.aspx"
    const yearLevelLink = document.querySelector('a[href*="YearLevel.aspx"]');
    if (yearLevelLink) {
      studentInfo.yearGroup = yearLevelLink.textContent.trim();
    }

    // Extract faction from link containing "House.aspx"
    const houseLink = document.querySelector('a[href*="House.aspx"]');
    if (houseLink) {
      studentInfo.faction = houseLink.textContent.trim();
    }

    console.log('[Clearance Extension] Extracted student info:', studentInfo);
    return studentInfo;
  }

  // Load any previously stored data
  chrome.storage.local.get(['periodsData', 'eventsData', 'schoolInfo'], function(result) {
    if (result.periodsData) {
      console.log('[Clearance Extension] Loaded periods data from storage');
      periodsData = result.periodsData;
    }
    if (result.eventsData) {
      console.log('[Clearance Extension] Loaded events data from storage');
      eventsData = result.eventsData;
    }
    if (result.schoolInfo) {
      console.log('[Clearance Extension] Loaded school info from storage');
      schoolInfo = result.schoolInfo;
    }
    checkAndShowButton();
  });

  function checkAndShowButton() {
    // Check if the Schedule tab is selected
    const scheduleTab = document.querySelector('button[aria-controls="tabpanel-scheduleTab"].Mui-selected');
    const isScheduleTabActive = !!scheduleTab;

    // Check if this is a staff profile by looking for a chip with "Staff" text content
    const chipLabels = document.querySelectorAll('span.MuiChip-label');
    const isStaff = Array.from(chipLabels).some(chip => chip.textContent.trim() === 'Staff');

    // Get the year group from the page (e.g. "Year 12")
    const yearLevelLink = document.querySelector('a[href*="YearLevel.aspx"]');
    const yearGroupText = yearLevelLink ? yearLevelLink.textContent.trim() : '';

    // Check year12Only setting (defaults to true)
    chrome.storage.local.get(['year12Only'], function(result) {
      const year12Only = result.year12Only !== false;
      const isWrongYear = year12Only && yearGroupText !== 'Year 12';

      console.log('[Clearance Extension] Checking conditions...', {
        hasPeriodsData: !!periodsData,
        hasEventsData: !!eventsData,
        isScheduleTabActive: isScheduleTabActive,
        isStaff: isStaff,
        yearGroup: yearGroupText,
        year12Only: year12Only
      });

      // Show button if: has data, schedule tab active, not staff, and passes year filter
      if (periodsData && eventsData && isScheduleTabActive && !isStaff && !isWrongYear) {
        console.log('[Clearance Extension] All conditions met');

        if (!clearanceButton) {
          createClearanceButton();
        }
      } else if (clearanceButton && (!isScheduleTabActive || isStaff || isWrongYear)) {
        // Remove button if conditions no longer met
        console.log('[Clearance Extension] Hiding button -',
          isStaff ? 'staff profile detected' :
          isWrongYear ? 'year group filtered out (' + yearGroupText + ')' :
          'Schedule tab not active');
        clearanceButton.remove();
        clearanceButton = null;
      }
    });
  }

  function createClearanceButton() {
    console.log('[Clearance Extension] Creating clearance button');
    
    clearanceButton = document.createElement('button');
    clearanceButton.textContent = '📋 Clearance Form';
    
    const baseStyle = `
      position: fixed;
      bottom: 70px;
      right: 20px;
      z-index: 99999;
      padding: 12px 24px;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      transition: all 0.3s;
      font-family: system-ui, -apple-system, sans-serif;
      background: #2e7d32;
    `;
    
    clearanceButton.style.cssText = baseStyle;
    
    clearanceButton.onmouseover = () => {
      clearanceButton.style.background = '#1b5e20';
      clearanceButton.style.transform = 'scale(1.05)';
    };
    
    clearanceButton.onmouseout = () => {
      clearanceButton.style.background = '#2e7d32';
      clearanceButton.style.transform = 'scale(1)';
    };
    
    clearanceButton.onclick = () => {
      console.log('[Clearance Extension] Clearance button clicked');
      openClearanceWindow();
    };
    
    document.body.appendChild(clearanceButton);
    console.log('[Clearance Extension] Clearance button added to page');
  }

  function openClearanceWindow() {
    console.log('[Clearance Extension] Opening clearance window');
    
    // Extract student information from the page
    const studentInfo = extractStudentInfo();
    
    // Save data to chrome storage before opening window.
    // Only include schoolInfo if we have it — don't overwrite a cached value with null.
    const storagePayload = {
      periodsData: periodsData,
      eventsData: eventsData,
      studentInfo: studentInfo
    };
    if (schoolInfo) storagePayload.schoolInfo = schoolInfo;

    chrome.storage.local.set(storagePayload, function() {
      console.log('[Clearance Extension] Data saved to storage for clearance form');
      
      // Open the clearance page directly from the extension
      const clearanceUrl = chrome.runtime.getURL('clearance.html');
      const clearanceWindow = window.open(clearanceUrl, '_blank', 'width=900,height=1000');
      
      if (!clearanceWindow) {
        alert('Please allow pop-ups for this site to open the clearance form.');
      } else {
        console.log('[Clearance Extension] Clearance window opened');
      }
    });
  }

  // Check periodically
  checkInterval = setInterval(checkAndShowButton, 3000);
  
  // Initial check after page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndShowButton);
  } else {
    setTimeout(checkAndShowButton, 1000);
  }
})();