// Uses code from https://webmidi-examples.glitch.me/

// Sysex consts
const SYSEX_START = 0xF0;
const SYSEX_END = 0xF7;
const MANUFACTURER_ID = [0x7D, 0x00, 0x00];
const REQUEST = 0x00;
const STORE = 0x01;
const RESPONSE = 0x02;
const WRITE_FAILED = 0x03;


class MidiComms {

    constructor() {

        this._midiIn = [];
        this._midiOut = [];

        this.inDeviceIndex = 0;

        this.readyCallback = function () { };
        this.accessBlockedCallback = function () { };
        this.failedToStartCallback = function () { };
        this.devicesUpdatedCallback = function (devicesIn, devicesOut) { };
        this.configReceivedCallback = function (modelId, protocolVersion, firmwareVersion, data) { };
        this.writeFailedCallback = function(modelId, protocolVersion) { };
        this.configSentCallback = function () { };
        this.requestSentCallback = function () { };
    }

    connect() {
        if (navigator.requestMIDIAccess) {

            navigator.requestMIDIAccess({ sysex: true })
                .then(
                    (midi) => this._ready(midi),
                    (err) => {
                        this.accessBlockedCallback();
                        console.log("Could not start WebMIDI.", err);
                    });

        } else {
            this.failedToStartCallback();
        }
    }

    requestConfig(outDeviceIndex, modelId, protocolVersion) {
        const device = this._midiOut[outDeviceIndex];
        const msg = [SYSEX_START, ...MANUFACTURER_ID, modelId, protocolVersion, REQUEST, SYSEX_END];
        device.send(msg);
        this.requestSentCallback();
    }

    sendConfig(outDeviceIndex, modelId, protocolVersion, data) {
        const device = this._midiOut[outDeviceIndex];
        const msg = [SYSEX_START, ...MANUFACTURER_ID, modelId, protocolVersion, STORE, ...data, SYSEX_END];
        device.send(msg);
        this.configSentCallback();
    }

    _ready(midi) {
        midi.addEventListener('statechange', (event) => this._initDevices(event.target));
        this._initDevices(midi);
        this.readyCallback();
    }

    _initDevices(midi) {

        // Check if devices have changed (statechange is also called when ports have opened/closed)

        let newMidiIn = [];
        let newMidiOut = [];
        let portsChanged = false;

        const inputs = Array.from(midi.inputs.values());
        const outputs = Array.from(midi.outputs.values());

        if (inputs.length != this._midiIn.length || outputs.length != this._midiOut.length) {
            portsChanged = true;
        }

        for (let i = 0; i < inputs.length; i++) {
            if (portsChanged || this._midiIn[i].id != inputs[i].id) {
                newMidiIn.push(inputs[i]);
                portsChanged = true;
            }
        }

        for (let i = 0; i < outputs.length; i++) {
            if (portsChanged || this._midiOut[i].id != outputs[i].id) {
                newMidiOut.push(outputs[i]);
                portsChanged = true;
            }
        }

        if (portsChanged) {
            this._midiIn = [...newMidiIn];
            this._midiOut = [...newMidiOut];
            this.devicesUpdatedCallback(this._midiIn, this._midiOut);
            this._startListening();
        }
    }

    _startListening() {
        for (const input of this._midiIn) {
            input.addEventListener('midimessage', this._messageReceived);
        }
    }

    _messageReceived = (event) => this._processMessage(event);

    _processMessage(event) {

        // Check input
        if (event.target == this._midiIn[this.inDeviceIndex]) {

            // Check if sysex
            if (event.data[0] === SYSEX_START && event.data[event.data.length - 1] === SYSEX_END) {

                // Check manufacturer ID
                if (event.data[1] === MANUFACTURER_ID[0] && event.data[2] === MANUFACTURER_ID[1] && event.data[3] === MANUFACTURER_ID[2]) {

                    // Check command
                    if (event.data[6] === RESPONSE) {

                        // Callback: modelId, protocolVersion, firmwareVersion, data
                        this.configReceivedCallback(event.data[4], event.data[5], event.data.slice(7, 10), event.data.slice(10, -1));
                    
                    } else if (event.data[6] === WRITE_FAILED) {

                        // Callback: modelId, protocolVersion
                        this.writeFailedCallback(event.data[4], event.data[5]);
                    }
                }
            }
        }
    }
}
