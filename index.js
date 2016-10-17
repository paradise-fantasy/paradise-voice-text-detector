const EventEmitter = require('events');
const fs = require('fs');
const exec = require('child_process').exec;
const { v4 } = require('node-uuid');

const recordingConfig = {
  encoding: 'FLAC',
  sampleRate: 16000
};

class VoiceDetector extends EventEmitter {
  constructor() {
    super();
    this.active = false;
  }

  configure(credentials, props) {
    if (!credentials) throw new Error('Credentials must be defined!');

    this.speech = new Speech(credentials);
    this.tmpDir = props.tmpDir || './tmp';
    this.cooldown = props.cooldown || 2000;

    if (!fs.existsSync(this.tmpDir)) {
      fs.mkdirSync(this.tmpDir);
    }
  }

  doRecord() {
    return new Promise((resolve, reject) => {
      const recordingID = v4();
      exec(`sox -t alsa default -r 16000 -c 1 ${this.tmpDir}/${recordingID}.flac silence 1 0.1 10% 1 1.0 10%`, (error, stdout, stderr) => {
        if (error) return reject(error);
        resolve(recordingID);
      });
    });
  }

  doRecognize(recordingID) {
    return new Promise((resolve, reject) => {
      speech.recognize(`${this.tmpDir}/${recordID}.flac`, recordingConfig, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  }

  newRecording() {
    if (this.active) {
      this.doRecord()
      .then(recordingID => {
        const promise = this.doRecognize(recordingID);
        this.emit('voice');
        return promise;
      })
      .then(results => {
        if (results) {
          const text = Array.isArray(results) ? results[0] : results;
          this.emit('text', text);
        }
        setTimeout(this.newRecording, this.cooldown);
      })
      .catch(err => this.emit('error', err));
    }
  }

  stopRecording() {
    this.active = false;
  }

  startRecording() {
    this.active = true;
    this.newRecording();
  }
}

module.exports = VoiceDetector;
