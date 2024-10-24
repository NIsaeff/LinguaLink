let isTranslating = false;
let audioChunks = [];
let startTimestamp = 0;
const BACKEND_URL = 'YOUR_BACKEND_API_URL';

// Add these at the top of your file
let translateButton;
let stopButton;

let popupFrame; // Declare popupFrame in the global scope


//////////////Popupframe///////////////////

class PopupFrame {

  constructor(translateButton) {
    this.translateButton = translateButton;
    this.popupWidth = 272;
    this.popupHeight = 140;
    
    // Create the popup frame directly in the constructor
    this.popupFrame = document.createElement('iframe');
    this.popupFrame.src = chrome.runtime.getURL('popup.html');
    this.popupFrame.style.position = 'absolute';
    this.popupFrame.style.zIndex = '9999';
    this.popupFrame.style.border = 'none';
    this.popupFrame.style.width = `${this.popupWidth}px`;
    this.popupFrame.style.height = `${this.popupHeight}px`;
    this.popupFrame.style.display = 'none';
    this.popupFrame.style.boxShadow = '0 4px 32px rgba(0, 0, 0, 0.5)';
    this.popupFrame.style.borderRadius = '4px';


    this.addResizeListener();
  }

  showPopup() {
    if (!this.translateButton) {
      console.error('Translate button not set');
      return;
    }

    if (!this.popupFrame.isConnected) {
      document.body.appendChild(this.popupFrame);
    }

    const buttonRect = this.translateButton.getBoundingClientRect();

    if (buttonRect.width === 0) {
      console.error('Translate button has no width');
      return;
    }

    const popupWidth = 200; // Width of the popup iframe
    const popupHeight = 80; // Height of the popup iframe

    // Calculate the left position to center the popup above the button
    let leftPosition = buttonRect.left + (buttonRect.width / 2) - (popupWidth / 2);

    // Ensure the popup doesn't go off-screen to the left
    leftPosition = Math.max(10, leftPosition);

    // Ensure the popup doesn't go off-screen to the right
    leftPosition = Math.min(leftPosition, window.innerWidth - popupWidth - 10);

    // Position centered above the button with some vertical spacing
    const topPosition = buttonRect.top - popupHeight - 10; // 10px spacing

    this.popupFrame.style.position = 'fixed';
    this.popupFrame.style.top = `${topPosition}px`;
    this.popupFrame.style.left = `${leftPosition}px`;
    this.popupFrame.style.width = `${popupWidth}px`;
    this.popupFrame.style.height = `${popupHeight}px`;
    this.popupFrame.style.display = 'block';
  }

  hidePopup() {
    this.popupFrame.style.display = 'none';
  }

  togglePopup() {
    if (this.popupFrame.style.display === 'none') {
      this.showPopup();
    } else {
      this.hidePopup();
    }
  }

  addResizeListener() {
    window.addEventListener('resize', () => {
      if (this.popupFrame.style.display === 'block') {
        this.showPopup();
      }
    });
  }
  
}

////////////////CreateButtons///////////////////

function createTranslateButton() {
  console.log("Creating buttons");
  const translateButton = document.createElement("button");
  translateButton.className = "ytp-button translate-button";
  translateButton.title = "Translate audio";
  const buttonImage = document.createElement("img");
  buttonImage.src = chrome.runtime.getURL("icons/translate.svg");
  translateButton.appendChild(buttonImage);

  return translateButton;
}

function createStopButton() {
  const stopButton = document.createElement("button");
  stopButton.className = "ytp-button translate-button stop-button";
  stopButton.title = "Stop translation";
  stopButton.style.display = 'none';
  
  const stopButtonImage = document.createElement("img");
  stopButtonImage.src = chrome.runtime.getURL("icons/stoptranslate.svg");
  stopButton.appendChild(stopButtonImage);

  return stopButton;
}

function addButtons() {
  console.log("Adding buttons");
  const youtubeRightControls = document.getElementsByClassName("ytp-right-controls")[0];
  if (youtubeRightControls && !document.querySelector('.translate-button')) {
    translateButton = createTranslateButton();
    stopButton = createStopButton();
    
    // Insert the translate button first
    youtubeRightControls.insertBefore(translateButton, youtubeRightControls.firstChild);
    // Then insert the stop button before the translate button
    youtubeRightControls.insertBefore(stopButton, translateButton);

    popupFrame = new PopupFrame(translateButton); // Assign to the global variable

    translateButton.addEventListener('click', () => {
      popupFrame.togglePopup();
    });

    stopButton.addEventListener('click', () => {
      stopTranslation();
      hideStopButton();
    });

    // Listen for messages from the iframe
    window.addEventListener('message', (event) => {
      if (event.data.action === 'languageSelected') {
        currentTargetLanguage = event.data.language;
        popupFrame.hidePopup();
        showStopButton();
        startTranslation(currentTargetLanguage);

      }
    });
  }
}

function showStopButton() {
  if (stopButton) {
    stopButton.style.display = 'inline-flex';
  } else {
    console.error('Stop button not initialized');
  }
}

function hideStopButton() {
  if (stopButton) {
    stopButton.style.display = 'none';
  } else {
    console.error('Stop button not initialized');
  }
}

// Call the function when the page loads and when navigation occurs
window.addEventListener('load', addButtons);
window.addEventListener('yt-navigate-finish', addButtons);

// Modify this event listener to check if popupFrame exists
document.addEventListener('click', (event) => {
  if (popupFrame && !event.target.closest('.translate-button') && !event.target.closest('iframe')) {
    popupFrame.hidePopup();
  }
});

////////////////////////store video id////////////////////////////////////

let currentVideoId = null;

// Function to extract video ID from URL
function getYouTubeVideoId(url) {
  const urlObject = new URL(url);
  return urlObject.searchParams.get('v');
}

// Function to update the stored video ID
function checkForVideoIdChange() {
  const newVideoId = getYouTubeVideoId(window.location.href);
  if (newVideoId && newVideoId !== currentVideoId) {
    currentVideoId = newVideoId;
    console.log('Video ID updated:', currentVideoId);
  }
}

// Check for video ID when the script loads
checkForVideoIdChange();

// Listen for YouTube's navigation events
document.addEventListener('yt-navigate-finish', checkForVideoIdChange);


// -> currentVideoId


////////////////////////startTranslation////////////////////////////////////

// gets language from popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startTranslation') {
    currentTargetLanguage = message.targetLanguage;
    console.log("currentTargetLanguage", currentTargetLanguage);
    popupFrame.hidePopup();
    showStopButton();
    const video = document.querySelector('video');
    if (video) {
      startTimestamp = video.currentTime;
      console.log("startTimestamp", startTimestamp);
      console.log("currentVideoId", currentVideoId);
      startTranslation(currentTargetLanguage, currentVideoId, startTimestamp);
    }
  }
});

// -> currentTargetLanguage

// starts translation
function startTranslation(targetLanguage, currentVideoId, startTimestamp) {
    isTranslating = true;
    muteYouTubeAudio();
    sendToBackend(startTimestamp, targetLanguage, currentVideoId);
}
 // -> startTimestamp

function stopTranslation() {
  isTranslating = false;
  unmuteYouTubeAudio();
  hideStopButton();
  // Add any other cleanup logic here
}

////////////////////////sendToBackend////////////////////////////////////
async function sendToBackend(startTimestamp, targetLanguage, currentVideoId) {
  const BACKEND_URL = 'https://your-backend-url.com/api'; // Replace with your actual backend URL

  try {
    const response = await fetch(`${BACKEND_URL}/start-translation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startTimestamp,
        targetLanguage,
        videoId: currentVideoId
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to start translation');
    }

    const data = await response.json();
    console.log('Translation started successfully:', data);
  } catch (error) {
    console.error('Error starting translation:', error);
  }
}

////////////mute audio////////////////////////////////////
let originalVolume = null;

function muteYouTubeAudio() {
  const video = document.querySelector('video');
  if (video) {
    originalVolume = video.volume;
    video.muted = true;
    console.log("muted");
  }
}

function unmuteYouTubeAudio() {
  const video = document.querySelector('video');
  if (video && originalVolume !== null) {
    video.muted = false;
    video.volume = originalVolume;
    console.log("unmuted");
  }
}