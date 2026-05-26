document.addEventListener('DOMContentLoaded', function() {
    const quickPrintCheckbox = document.getElementById('quickPrint');
    const year12OnlyCheckbox = document.getElementById('year12Only');

    // Load saved settings (year12Only defaults to true)
    chrome.storage.local.get(['quickPrint', 'year12Only'], function(result) {
        quickPrintCheckbox.checked = !!result.quickPrint;
        year12OnlyCheckbox.checked = result.year12Only !== false;
    });

    // Save on change
    quickPrintCheckbox.addEventListener('change', function() {
        chrome.storage.local.set({ quickPrint: this.checked });
    });

    year12OnlyCheckbox.addEventListener('change', function() {
        chrome.storage.local.set({ year12Only: this.checked });
    });
});
