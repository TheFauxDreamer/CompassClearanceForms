// This script runs in the page context to intercept XHR requests
(function() {
  console.log('[Clearance Interceptor] Starting XHR interception');

  // Compass.schoolName is set by the page's own scripts, which haven't run yet at
  // document_start. Use a helper that retries on DOMContentLoaded and window load
  // so we always catch it once the page has initialised.
  function postSchoolInfo() {
    const name = (window.Compass && window.Compass.schoolName) ? window.Compass.schoolName : '';
    if (!name) return; // not ready yet — a later event will retry
    try {
      window.postMessage({
        type: 'SCHOOL_INFO',
        data: {
          name: name,
          logoUrl: window.location.origin + '/Download/Cdn/FrontPageLogo'
        }
      }, '*');
      console.log('[Clearance Interceptor] Posted school info:', name);
    } catch (e) {
      console.error('[Clearance Interceptor] Error posting school info:', e);
    }
  }

  // Try immediately (works if injected after page scripts have already run)
  postSchoolInfo();
  // Retry once the DOM is ready, and again after all resources load
  document.addEventListener('DOMContentLoaded', postSchoolInfo);
  window.addEventListener('load', postSchoolInfo);

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url) {
    this._url = url;
    console.log('[Clearance Interceptor] XHR opened:', url);
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function() {
    const xhr = this;
    
    this.addEventListener('load', function() {
      console.log('[Clearance Interceptor] XHR loaded:', xhr._url);
      
      try {
        if (xhr._url) {
          // Check if this is one of our target endpoints
          if (xhr._url.includes('GetPeriodsByTimePeriod')) {
            console.log('[Clearance Interceptor] Captured GetPeriodsByTimePeriod');
            postSchoolInfo();
            const data = JSON.parse(xhr.responseText);
            window.postMessage({
              type: 'TIMETABLE_PERIODS_DATA',
              data: data
            }, '*');
          } else if (xhr._url.includes('GetEventsByUser')) {
            console.log('[Clearance Interceptor] Captured GetEventsByUser');
            const data = JSON.parse(xhr.responseText);
            window.postMessage({
              type: 'TIMETABLE_EVENTS_DATA',
              data: data
            }, '*');
          }
        }
      } catch (e) {
        console.error('[Clearance Interceptor] Error processing XHR:', e);
      }
    });
    
    return originalSend.apply(this, arguments);
  };

  // Also intercept fetch API
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    console.log('[Clearance Interceptor] Fetch called:', url);
    
    return originalFetch.apply(this, args).then(response => {
      // Clone the response so we can read it
      const clonedResponse = response.clone();
      
      if (typeof url === 'string') {
        if (url.includes('GetPeriodsByTimePeriod')) {
          console.log('[Clearance Interceptor] Captured GetPeriodsByTimePeriod via fetch');
          postSchoolInfo();
          clonedResponse.json().then(data => {
            window.postMessage({
              type: 'TIMETABLE_PERIODS_DATA',
              data: data
            }, '*');
          }).catch(e => console.error('[Clearance Interceptor] Error parsing periods:', e));
        } else if (url.includes('GetEventsByUser')) {
          console.log('[Clearance Interceptor] Captured GetEventsByUser via fetch');
          clonedResponse.json().then(data => {
            window.postMessage({
              type: 'TIMETABLE_EVENTS_DATA',
              data: data
            }, '*');
          }).catch(e => console.error('[Clearance Interceptor] Error parsing events:', e));
        }
      }
      
      return response;
    });
  };

  console.log('[Clearance Interceptor] XHR and Fetch interception active');
})();