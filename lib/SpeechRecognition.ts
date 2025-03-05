import { Event } from "./utils/event";

type onTranscriptObject = {
  transcript: string;
}

export class SpeechRecognition {
  private messageFrom = 'SpeechRecognition'
  private logHeader = `[${this.messageFrom}]`
  speech: globalThis.SpeechRecognition;
  onTranscript = new Event<onTranscriptObject>();

  // MEMO: ここでspeechRecognitionを初期化するとglobalで呼び出した場合に複数streamに対応できない
  // そもそも複数streamに対応できる？ -> できなさそう
  constructor() {
    const speechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!speechRecognition) {
      throw new Error('SpeechRecognition is not supported');
    }
    this.speech = new speechRecognition();
    this.speech.lang = 'ja-JP';
  }

  streamStart() {
    this.speech.start();

    // 一度止めて解析した後再開することでstream処理になる
    this.speech.onresult = (e) => {
      this.speech.stop();
      if(e.results[0].isFinal){
        const autotext =  e.results[0][0].transcript
        console.info(`${this.logHeader} transcript: ${autotext}`);
        this.onTranscript.emit({ transcript: autotext });
      }
    }
    this.speech.onend = () => { 
      this.speech.start() 
    };
  }

  // MEMO: 3/5時点でChromeで試してみたが今までの挙動をしているように見える -> M135から対応予定らしい．現在はCanaryやDevで確認できる
  // https://webaudio.github.io/web-speech-api/#dom-speechrecognition-start-audiotrack
  // https://chromestatus.com/feature/5178378197139456
  streamStartWithTrack(track : MediaStreamTrack) {
    // @ts-ignore chromeのみ対応．typesが対応できてない
    this.speech.start(track);

    // 一度止めて解析した後再開することでstream処理になる
    this.speech.onresult = (e) => {
      this.speech.stop();
      if(e.results[0].isFinal){
        const autotext =  e.results[0][0].transcript
        console.info(`${this.logHeader} transcript: ${autotext}`);
        this.onTranscript.emit({ transcript: autotext });
      }
    }
    this.speech.onend = () => {
      // @ts-ignore chromeのみ対応．typesが対応できてない
      this.speech.start(track) 
    };
  }
}