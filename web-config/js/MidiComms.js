// Uses code from https://webmidi-examples.glitch.me/

// Sysex consts
const SYSEX_START = 0xF0;
const SYSEX_END = 0xF7;
const MANUFACTURER_ID = [0x7D, 0x00, 0x00];
const REQUEST = 0x00;
const STORE = 0x01;


class MidiComms {

    constructor() {

        this._midiIn = [];
        this._midiOut = [];

        this.readyCallback = function() {};
        this.accessBlockedCallback = function() {};
        this.failedToStartCallback = function() {};
        this.devicesUpdatedCallback = function(devicesIn, devicesOut) {};
        this.configReceivedCallback = function(modelId) {};
        this.configSentCallback = function() {};
    }

    connect() {
        if (navigator.requestMIDIAccess) {

            navigator.requestMIDIAccess({ sysex: true })
                .then(
                    (midi) => this._ready(midi),
                    (err) => {
                        this.accessBlockedCallback();
                        console.log("Could not start WebMIDI: " + err);
                    });

        } else {
            this.failedToStartCallback();
        }
    }

    requestConfig(outDeviceIndex, modelId, protocolVersion) {
        const device = this._midiOut[outDeviceIndex];
        const msg = [ SYSEX_START, ...MANUFACTURER_ID, modelId, protocolVersion, REQUEST, SYSEX_END ];
        device.send(msg);
    }

    sendConfig(outDeviceIndex, modelId, protocolVersion) {
        const device = this._midiOut[outDeviceIndex];
        const msg = [ SYSEX_START, ...MANUFACTURER_ID, modelId, protocolVersion, STORE,
            0x00, // Test data
            0x01,
            0x02,
            0x03,
            0x04,
            SYSEX_END ];
        device.send(msg);
        this.configSentCallback();
    }

    _ready(midi) {
        midi.addEventListener('statechange', (event) => this._initDevices(event.target));
        this._initDevices(midi);
        this.readyCallback();
    }

    _initDevices(midi) {

        this._midiIn = [];
        this._midiOut = [];

        const inputs = midi.inputs.values();
        for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
            this._midiIn.push(input.value);
        }

        const outputs = midi.outputs.values();
        for (let output = outputs.next(); output && !output.done; output = outputs.next()) {
            this._midiOut.push(output.value);
        }

        this.devicesUpdatedCallback(this._midiIn, this._midiOut);
        this._startListening();
    }

    _startListening() {
        // TODO filter only correct input??
        for (const input of this._midiIn) {
            input.addEventListener('midimessage', this._messageReceived);
        }
    }

    _messageReceived = (event) => this._processMessage(event);

    _processMessage(event) {

        console.log("Received MIDI message", event.data); // TODO remove

        // Check if sysex
        if((event.data[0] & 0xF0) === SYSEX_START && (event.data[event.data.length - 1]) === SYSEX_END) {

                // Check manufacturer ID
                if(event.data[1] === MANUFACTURER_ID[0] && event.data[2] === MANUFACTURER_ID[1] && event.data[3] === MANUFACTURER_ID[2]) {

                    // Callback: modelId, protocolVersion, data
                    this.configReceivedCallback(event.data[4], event.data[5], event.data.slice(7, -1));
                }
        }
    }
}
