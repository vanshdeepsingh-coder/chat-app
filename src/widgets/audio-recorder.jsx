// Audio recorder widget.

import React from 'react';
import { defineMessages, injectIntl } from 'react-intl'

import AudioPlayer from './audio-player.jsx';
// Workaround for https://bugs.chromium.org/p/chromium/issues/detail?id=642012
// It adds duration and SeekHead to the webm record.
import fixWebmDuration from 'webm-duration-fix';

import { intArrayToBase64 } from '../lib/blob-helpers.js'
import { secondsToTime } from '../lib/strformat';
import { KEYPRESS_DELAY, MAX_DURATION, MIN_DURATION } from '../config.js';

// FFT resolution.
const BUFFER_SIZE = 256;
// Make canvas bigger than the element size to reduce blurring.
const CANVAS_UPSCALING = 2.0;
// Thickness of a visualization bar.
const LINE_WIDTH = 3 * CANVAS_UPSCALING;
// Spacing between two visualization bars.
const SPACING = 2 * CANVAS_UPSCALING;
// Duration represented by one visualization bar.
const MILLIS_PER_BAR = 100;
// Color of histogram bars
const BAR_COLOR = '#BBBD';
// Vertical scaling for visualization bars.
const BAR_SCALE = 64.0;
// Number of bars in preview.
const VISUALIZATION_BARS = 96;
// Maximum number of samples per bar.
const MAX_SAMPLES_PER_BAR = 10;

// Default recording format (FF, Chrome except on iOS).
const DEFAULT_AUDIO_MIME_TYPE = 'audio/webm';
// Safari supports only mp4 as audio recording format.
const SAFARI_AUDIO_MIME_TYPE = 'audio/mp4';
const AUDIO_MIME_TYPES = [DEFAULT_AUDIO_MIME_TYPE, SAFARI_AUDIO_MIME_TYPE, ''];

const messages = defineMessages({
  icon_title_delete: {
    id: 'icon_title_delete',
    defaultMessage: 'Delete recording',
    description: 'Icon tool tip for deleting recorded audio'
  },
  icon_title_pause: {
    id: 'icon_title_pause',
    defaultMessage: 'Pause playback',
    description: 'Icon tool tip for pausing audio playback'
  },
  icon_title_resume: {
    id: 'icon_title_resume',
    defaultMessage: 'Resume playback',
    description: 'Icon tool tip for resuming audio playback'
  },
  icon_title_send: {
    id: 'icon_title_send',
    defaultMessage: 'Send message',
    description: 'Icon tool tip for sending a message'
  },
  failed_to_init_audio: {
    id: 'failed_to_init_audio',
    defaultMessage: 'Failed to initialize audio recording',
    description: 'Error message when audio is not available'
  }
});

class AudioRecorder extends React.PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      enabled: true,
      audioRecord: null,
      recording: true,
      paused: false,
      duration: '0:00',
      blobUrl: null,
      preview: null
    };

    this.visualize = this.visualize.bind(this);
    this.initMediaRecording = this.initMediaRecording.bind(this);
    this.initCanvas = this.initCanvas.bind(this);
    this.getRecording = this.getRecording.bind(this);
    this.cleanUp = this.cleanUp.bind(this);

    this.handleResume = this.handleResume.bind(this);
    this.handlePause = this.handlePause.bind(this);
    this.handleDelete = this.handleDelete.bind(this);
    this.handleDone = this.handleDone.bind(this);

    this.durationMillis = 0;
    this.startedOn = null;
    this.viewBuffer = [];
    this.canvasRef = React.createRef();

    // Timestamp for sending "recording" notifications.
    this.recordingTimestamp = 0;
  }

  componentDidMount() {
    this.stream = null;
    this.mediaRecorder = null;
    this.audioContext = null;
    this.audioInput = null;
    this.analyser = null;

    this.audioChunks = [];

    // Start recorder right away.
    try {
      navigator.mediaDevices.getUserMedia({audio: true, video: false}).then(this.initMediaRecording, this.props.onError);
    } catch (err) {
      this.props.onError(err);
    }
  }

  componentWillUnmount() {
    this.startedOn = null;
    if (this.stream) {
      this.cleanUp();
    }
  }

  // Draw amplitude of sound.
  visualize() {
    this.initCanvas();

    const pcmData = new Uint8Array(this.analyser.frequencyBinCount);
    const width = this.canvasWidth;
    const height = this.canvasHeight;
    // Number of bars.
    const viewLength = (width / (LINE_WIDTH + SPACING)) | 0;
    // Duration of audio which fits onto the screen.
    const viewDuration = MILLIS_PER_BAR * viewLength;

    this.canvasContext.lineWidth = LINE_WIDTH;
    this.canvasContext.strokeStyle = BAR_COLOR;

    let prevBarCount = 0;
    let volume = 0.0;
    let countPerBar = 0;
    const drawFrame = _ => {
      if (!this.startedOn) {
        return;
      }
      window.requestAnimationFrame(drawFrame);

      const duration = this.durationMillis + (Date.now() - this.startedOn);
      // Update record length timer.
      this.setState({duration: secondsToTime(duration / 1000)});

      // Check if record is too long.
      if (duration > MAX_DURATION) {
        this.startedOn = null;
        this.mediaRecorder.pause();
        this.durationMillis += Date.now() - this.startedOn;
        this.setState({enabled: false, recording: false, duration: secondsToTime(this.durationMillis / 1000)});
      }

      // Draw histogram.

      // Get current waveform and calculate its amplitude.
      this.analyser.getByteTimeDomainData(pcmData);
      let amp = 0.0;
      for (const amplitude of pcmData) {
        amp += (amplitude - 127) ** 2;
      }

      // Sum the amplitude.
      volume += Math.sqrt(amp/pcmData.length);
      countPerBar ++;

      let barCount = (duration / MILLIS_PER_BAR) | 0;
      // Shift of the histogram along x-axis to make scrolling smooth. No need to shift if recording is too short.
      const dx = viewDuration > duration ? 0 :
        (duration - MILLIS_PER_BAR * barCount) / MILLIS_PER_BAR * (LINE_WIDTH + SPACING);

      if (prevBarCount != barCount) {
        prevBarCount = barCount;
        // Add new amplitude visualization bar.
        this.viewBuffer.push(volume/countPerBar);
        volume = 0.0;
        countPerBar = 0;
        if (this.viewBuffer.length > viewLength) {
          // Keep at most 'viewLength' amplitude bars.
          this.viewBuffer.shift();
        }
      }

      // Clear canvas.
      this.canvasContext.clearRect(0, 0, width, height);

      // Draw amplitude bars.
      this.canvasContext.beginPath();
      for (let i = 0; i < this.viewBuffer.length; i++) {
        let x = i * (LINE_WIDTH + SPACING) - dx;
        let y = Math.max(Math.min(this.viewBuffer[i] / BAR_SCALE, 0.9) * height, 1);

        this.canvasContext.moveTo(x, (height - y) * 0.5);
        this.canvasContext.lineTo(x, (height + y) * 0.5);
      }
      // Actually draw the bars on canvas.
      this.canvasContext.stroke();

      // Send notification, if needed.
      const now = new Date().getTime();
      if (now - this.recordingTimestamp > KEYPRESS_DELAY) {
        this.props.onRecordingProgress();
        this.recordingTimestamp = now;
      }
    }

    drawFrame();
  }

  handlePause(e) {
    e.preventDefault();
    this.mediaRecorder.pause();
    this.mediaRecorder.requestData();
    this.durationMillis += Date.now() - this.startedOn;
    this.startedOn = null;
    this.setState({recording: false});
  }

  handleResume(e) {
    e.preventDefault();
    if (this.state.enabled) {
      this.startedOn = Date.now();
      this.mediaRecorder.resume();
      this.setState({recording: true}, this.visualize);
    }
  }

  handleDelete(e) {
    e.preventDefault();
    this.durationMillis = 0;
    this.startedOn = null;
    this.mediaRecorder.stop();
    this.cleanUp();
    this.setState({recording: false});
  }

  handleDone(e) {
    e.preventDefault();
    this.setState({recording: false});
    if (this.startedOn) {
      this.durationMillis += Date.now() - this.startedOn;
      this.startedOn = null;
    }
    // Stop recording and return data.
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
    }
  }

  initCanvas() {
    this.canvasRef.current.width = this.canvasRef.current.offsetWidth * CANVAS_UPSCALING;
    this.canvasRef.current.height = this.canvasRef.current.offsetHeight * CANVAS_UPSCALING;

    this.canvasContext = this.canvasRef.current.getContext('2d');
    this.canvasContext.lineCap = 'round';
    // To reduce line blurring.
    this.canvasContext.translate(0.5, 0.5);
    this.canvasWidth = this.canvasRef.current.width;
    this.canvasHeight = this.canvasRef.current.height;
  }

  initMediaRecording(stream) {
    this.stream = stream;
    AUDIO_MIME_TYPES.some(mimeType => {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        this.mediaRecorder = new MediaRecorder(stream, {mimeType: mimeType, audioBitsPerSecond: 24_000});
        return true;
      }
      return false;
    });

    if (!this.mediaRecorder) {
      console.warn('MediaRecorder failed to initialize: no supported audio formats');
      this.props.onError(this.props.intl.formatMessage(messages.failed_to_init_audio));
      return;
    }

    // The following code is needed for visualization.
    this.audioContext = new AudioContext();
    this.audioInput = this.audioContext.createMediaStreamSource(stream);
    if (!this.audioInput) {
      console.warn('createMediaStreamSource returned null: audio input unavailable');
      this.props.onError(this.props.intl.formatMessage(messages.failed_to_init_audio));
      return;
    }

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = BUFFER_SIZE;
    this.audioInput.connect(this.analyser);

    this.mediaRecorder.onstop = _ => {
      if (this.durationMillis > MIN_DURATION) {
        this.getRecording(this.mediaRecorder.mimeType)
          .then(result => this.props.onFinished(result.url, result.preview, this.durationMillis));
      } else {
        this.props.onDeleted();
      }
      this.cleanUp();
    }

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.audioChunks.push(e.data);
      }

      if (this.mediaRecorder.state != 'inactive') {
        this.getRecording(this.mediaRecorder.mimeType).then(result => {
          this.setState({
            blobUrl: result.url,
            preview: result.preview
          });
        });
      }
    }

    this.durationMillis = 0;
    this.startedOn = Date.now();
    this.mediaRecorder.start();
    this.visualize();

    this.props.onRecordingProgress();
    this.recordingTimestamp = this.startedOn;
  }

  // Obtain data in a form sutable for sending or playing back.
  getRecording(mimeType) {
    mimeType = mimeType || DEFAULT_AUDIO_MIME_TYPE;
    let blob = new Blob(this.audioChunks, {type: mimeType});
    // If duration is valid, apply fix for Chrome's WebM duration bug.
    const result = mimeType == DEFAULT_AUDIO_MIME_TYPE ?
      fixWebmDuration(blob, mimeType) :
      Promise.resolve(blob);
    return result
      .then(fixedBlob => { blob = fixedBlob; return fixedBlob.arrayBuffer(); })
      .then(arrayBuff => this.audioContext.decodeAudioData(arrayBuff))
      .then(decoded => this.createPreview(decoded))
      .then(preview => ({url: window.URL.createObjectURL(blob), preview: intArrayToBase64(preview)}));
  }

  // Preview must be calculated at the source: Chrome does not allow background AudioContext.
  createPreview(audio) {
    const data = audio.getChannelData(0);
    // Number of amplitude bars in preview.
    const viewLength = Math.min(data.length, VISUALIZATION_BARS);
    // The number of samples in each bar.
    const totalSPB = (data.length / viewLength) | 0;
    // Distance between samples: we are going to take just a fracton of samples.
    const samplingRate = Math.max(1, (totalSPB / MAX_SAMPLES_PER_BAR) | 0);

    let buffer = [];
    let max = -1;
    for (let i = 0; i < viewLength; i++) {
      let amplitude = 0;
      let count = 0;
      for (let j = 0; j < totalSPB; j += samplingRate) {
        amplitude += data[totalSPB * i + j] ** 2;
        count ++;
      }
      const val = Math.sqrt(amplitude / count);
      buffer.push(val);
      max = Math.max(max, val);
    }
    // Normalize amplitude to 0..100.
    if (max > 0) {
      buffer = buffer.map(a => (100 * a / max) | 0);
    }
    return buffer;
  }

  cleanUp() {
    if (this.audioInput) {
      this.audioInput.disconnect();
    }
    this.stream.getTracks().forEach(track => track.stop());
  }

  render() {
    const {formatMessage} = this.props.intl;
    const resumeClass = 'material-icons ' + (this.state.enabled ? 'red' : 'gray');
    return (
      <div className="audio">
        <a href="#" onClick={this.handleDelete} title={formatMessage(messages.icon_title_delete)}>
          <i className="material-icons gray">delete_outline</i>
        </a>
        {this.state.recording ?
          <canvas ref={this.canvasRef} />
          :
          <AudioPlayer
            src={this.state.blobUrl}
            preview={this.state.preview}
            duration={this.durationMillis}
            short={true} />
        }
        <div className="duration">{this.state.duration}</div>
        {this.state.recording ?
          <a href="#" onClick={this.handlePause} title={formatMessage(messages.icon_title_pause)}>
            <i className="material-icons">pause_circle_outline</i>
          </a> :
          <a href="#" onClick={this.handleResume} title={formatMessage(messages.icon_title_resume)}>
            <i className={resumeClass}>radio_button_checked</i>
          </a>
        }
        <a href="#" onClick={this.handleDone} title={formatMessage(messages.icon_title_send)}>
          <i className="material-icons">send</i>
        </a>
      </div>
    );
  }
}

export default injectIntl(AudioRecorder);
