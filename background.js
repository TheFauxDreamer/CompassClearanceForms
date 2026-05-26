// Background service worker for the clearance form extension

chrome.runtime.onInstalled.addListener(() => {
  console.log('Student Clearance Form extension installed');
});

// Listen for messages from content script if needed
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openClearanceForm') {
    // Handle clearance form action if needed
    sendResponse({ status: 'success' });
  }
  return true;
});