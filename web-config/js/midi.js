// Uses snippets from https://webmidi-examples.glitch.me/

let midiIn = [];
let midiOut = [];

// Sysex consts
const SYSEX_START = 0xF0;
const SYSEX_END = 0xF7;
const MANUFACTURER_ID = [0x7D, 0x00, 0x00];
const MODEL_ID = 0x00;
const PROTOCOL_VERSION = 0x00;
const REQUEST = 0x00;
const STORE = 0x01;

const SYSEX_MSG_START = [ SYSEX_START, ...MANUFACTURER_ID, MODEL_ID, PROTOCOL_VERSION ];

connect();

function message(message, fatal = false) {
    document.getElementById("messageContent").innerHTML = message;
    if( fatal ) {
        document.getElementById("setup").className = "hidden";
        document.getElementById("message").className = "message fatal";
    }
}

function showSettings() {
    document.getElementById("sendButton").disabled = false;
    document.getElementById("settings").className = "";
}

function hideSettings() {
    document.getElementById("sendButton").disabled = true;
    document.getElementById("settings").className = "hidden";
}

function connect() {
    if(navigator.requestMIDIAccess) {

        navigator.requestMIDIAccess({ sysex: true })
            .then(
                (midi) => midiReady(midi),
                (err) => message('<strong>Could not start WebMIDI</strong><br>Please allow access to MIDI devices when prompted.', err));

    } else {
        message('<strong>Could not start WebMIDI</strong><br>Please use a <a href="https://caniuse.com/midi">supported browser</a>.')
    }
}

function midiReady(midi) {
    document.getElementById("setup").className = "";
    midi.addEventListener('statechange', (event) => initDevices(event.target));
    initDevices(midi);
}

function initDevices(midi) {

    midiIn = [];
    midiOut = [];

    const inputs = midi.inputs.values();
    for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
        midiIn.push(input.value);
    }

    const outputs = midi.outputs.values();
    for (let output = outputs.next(); output && !output.done; output = outputs.next()) {
        midiOut.push(output.value);
    }

    displayDevices();
    startListening();
}

function displayDevices() {
    selectIn.innerHTML = midiIn.map(device => `<option>${device.name}</option>`).join('');
    selectOut.innerHTML = midiOut.map(device => `<option>${device.name}</option>`).join('');
}

function startListening() {

    // TODO filter only correct input??

    for (const input of midiIn) {
        input.addEventListener('midimessage', midiMessageReceived);
    }
}

function midiMessageReceived(event) {

    if((event.data[0] & 0xF0) === SYSEX_START && (event.data[event.data.length - 1]) === SYSEX_END) {

            // Check manufacturer and model IDs
            if(event.data[1] === MANUFACTURER_ID[0] && event.data[2] === MANUFACTURER_ID[1] && event.data[3] === MANUFACTURER_ID[2]
                && event.data[4] === MODEL_ID) {

                    // Check protocol version
                    if(event.data[5] === PROTOCOL_VERSION) {

                        // Process data
                        var i;
                        for (i = 6; i < event.data.length - 1; i ++) {
                            console.log(event.data[i]); // TODO
                        }

                        message("Updated from device.")
                        showSettings();

                    } else {
                        message("Incompatible firmware version.")
                    }
            } else {
                message("Incompatible device selected.")
            }
    }
    
    // const velocity = (event.data.length > 2) ? event.data[2] : 1;

}

function requestSysex() {
    const device = midiOut[selectOut.selectedIndex];
    const msg = [ ...SYSEX_MSG_START, REQUEST, SYSEX_END ];
    device.send(msg);
}

function sendSysex() {
    const device = midiOut[selectOut.selectedIndex];
    const msg = [ ...SYSEX_MSG_START, STORE,
        0x00,
        0x01,
        0x02,
        0x03,
        0x04,
        SYSEX_END ];
    device.send(msg);
    message("Sent to device.")
}
