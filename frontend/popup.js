document.getElementById('targetLanguage').addEventListener('change', async (event) => {
  const targetLanguage = document.getElementById('targetLanguage').value;
  console.log("targetLanguage", targetLanguage);
 
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.tabs.sendMessage(tab.id, {
      action: 'startTranslation',
      targetLanguage: targetLanguage
    });
  }
);
/// Test comment
/// new comment

