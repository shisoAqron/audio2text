import { SpeechRecognition } from '../lib'
// import { SpeechRecognition } from '../dist';

// deviceを事前に選択しておかないとここで現在有効なものが利用されるぽい？
const speechRecognition = new SpeechRecognition();

const btn = document.getElementById('btn');
const content = document.getElementById('content');
const audioInputSelect = document.getElementById('audio-input-select') as HTMLSelectElement
const audioInputSubmit = document.getElementById('audio-input-submit') as HTMLButtonElement

if(!btn || !content || !audioInputSelect || !audioInputSelect) throw new Error('element not found');

btn.addEventListener('click' , () => {
  console.log('start');
  speechRecognition.streamStart();
});

speechRecognition.onTranscript.addListener((obj) => {
  console.log(obj);
  // contentにelementを追加
  const p = document.createElement('p');
  p.textContent = obj.transcript;
  content.appendChild(p);
});

const getDevices = async () => {
  const devices = await navigator.mediaDevices.enumerateDevices().then((devices) => {
    return devices.filter((device) => device.kind === 'audioinput')
  })
  return devices
}

// 即時関数で初期化
(async () => {
  const devices = await getDevices()
  devices.forEach((device) => {
    const option = document.createElement('option')
    option.id = device.deviceId
    option.textContent = device.label
    audioInputSelect.appendChild(option)
  })
  audioInputSubmit.addEventListener('click', async () => {
    const selectedId = audioInputSelect.selectedOptions[0].id
    await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: selectedId }
    }).then((stream) => {
      console.log("set audio device", selectedId, stream);
      // この後にspeechRecognitionを初期化する必要あり？ -> 切り替わってないように見える
      // const speechRecognition = new SpeechRecognition();
      // btn.addEventListener('click' , () => {
      //   console.log('start');
      //   speechRecognition.streamStart();
      // });
      
      // speechRecognition.onTranscript.addListener((obj) => {
      //   console.log(obj);
      // });
    });
  })
})();

