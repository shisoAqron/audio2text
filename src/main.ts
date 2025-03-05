import {
  type LocalStream,
  type RemoteAudioStream,
  type RoomPublication,
  SkyWayAuthToken,
  SkyWayContext,
  SkyWayRoom,
  SkyWayStreamFactory,
  nowInSec,
  uuidV4,
} from '@skyway-sdk/room';
import { SpeechRecognition } from '../lib'
// import { SpeechRecognition } from '../dist';

// -- SkyWay SDK --
const appId = import.meta.env.VITE_SKYWAY_APPID;
const secret = import.meta.env.VITE_SKYWAY_SECRET;

const createToken = () => {
  const token = new SkyWayAuthToken({
    jti: uuidV4(),
    iat: nowInSec(),
    exp: nowInSec() + 60 * 60 * 24,
    version: 3,
    scope: {
      appId,
      rooms: [{
        id: '*',
        methods: ['create', 'close', 'updateMetadata'],
        member: {
          id: '*',
          methods: ['publish', 'subscribe', 'updateMetadata']
        },
        sfu: {
          enabled: true,
        }
      }],
      turn: {
        enabled: true
      },
      analytics: {
        enabled: true
      },
    },
  }).encode(secret);
  return token;
}

const buttonArea = document.getElementById('button-area')!;
const remoteMediaArea = document.getElementById('remote-media-area')!;
const roomNameInput = document.getElementById(
  'room-name',
) as HTMLInputElement;
const myId = document.getElementById('my-id')!;
const joinButton = document.getElementById('join')!;
const leaveButton = document.getElementById('leave')!;

// -- speech recognition --
const textArea = document.getElementById('text-area') as HTMLDivElement;
const audioInputSelect = document.getElementById('audio-input-select') as HTMLSelectElement

// 即時関数で処理した方が良いものはこちらで実施
(async () => {
  // デバイス一覧を取得してselectに追加
  const devices = await SkyWayStreamFactory.enumerateInputAudioDevices()
  devices.forEach((device) => {
    const option = document.createElement('option')
    option.id = device.id
    option.textContent = device.label
    audioInputSelect.appendChild(option)
  })

  // joinをした際にpublishや各種イベントハンドラの設定をする
  joinButton.onclick = async () => {
    if (roomNameInput.value === '') {
      console.log('Please input room name');
      return;
    }
  
    // create context
    const token = createToken();
    const context = await SkyWayContext.Create(token);
    context.onTokenUpdateReminder.add(() => {
      context.updateAuthToken(createToken());
    });
  
    // room join
    const room = await SkyWayRoom.FindOrCreate(context, {
      type: 'p2p',
      name: roomNameInput.value,
    });
    const me = await room.join();
  
    myId.textContent = me.id;


    // get MediaStream & publish
    const selectedId = audioInputSelect.selectedOptions[0].id
    const mediaStream = await SkyWayStreamFactory.createMicrophoneAudioStream({
      deviceId: selectedId
    })
    await me.publish(mediaStream);
  
    const subscribeAndAttach = (publication: RoomPublication<LocalStream>) => {
      if (publication.publisher.id === me.id) {
        return;
      }
  
      const subscribeButton = document.createElement('button');
      subscribeButton.id = `subscribe-button-${publication.id}`;
      subscribeButton.textContent = `${publication.publisher.id}: ${publication.contentType}`;
      buttonArea.appendChild(subscribeButton);
  
      subscribeButton.onclick = async () => {
        const { stream } = await me.subscribe<RemoteAudioStream>(
          publication.id,
        );
  
        const newMedia = document.createElement('audio');
        newMedia.controls = true;
        newMedia.autoplay = true;
        newMedia.id = `media-${publication.id}`;
        stream.attach(newMedia);
        remoteMediaArea.appendChild(newMedia);

        // MEMO: M135からtrackが対応予定で，それ以前だと毎回呼ぶとクラッシュする(デバイスが認識されなくなる)
        const speechRecognition = new SpeechRecognition();

        speechRecognition.onTranscript.addListener((transObject) => {
          console.log(transObject);
          // contentにelementを追加
          const p = document.createElement('p');
          p.textContent = `${publication.publisher.id}:${transObject.transcript}`;
          textArea.appendChild(p);
        });

        speechRecognition.streamStartWithTrack(stream.track);
      };
    };
  
    room.publications.forEach(subscribeAndAttach);
    room.onStreamPublished.add((e) => subscribeAndAttach(e.publication));

    leaveButton.onclick = async () => {
      await me.leave();
      await room.dispose();

      myId.textContent = '';
      buttonArea.replaceChildren();
      remoteMediaArea.replaceChildren();
    };

    room.onStreamUnpublished.add((e) => {
      document.getElementById(`subscribe-button-${e.publication.id}`)?.remove();
      document.getElementById(`media-${e.publication.id}`)?.remove();
    });
  }
})();

