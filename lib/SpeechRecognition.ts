import { Event } from "./utils/event";

type onTranscriptObject = {
  transcript: string;
}

export class SpeechRecognition {
  private messageFrom = 'SpeechRecognition'
  private logHeader = `[${this.messageFrom}]`
  speech: globalThis.SpeechRecognition;
  onTranscript = new Event<onTranscriptObject>();

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
}