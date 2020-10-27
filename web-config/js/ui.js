// UI

function message(message, fatal = false) {
    document.getElementById("messageContent").innerHTML = message;
    if( fatal ) {
        hideSetup();
        document.getElementById("message").classList.add("fatal");
    }
    document.getElementById("message").classList.remove("hidden");
}

function showSetup() {
    document.getElementById("setup").classList.remove("hidden");
}

function hideSetup() {
    document.getElementById("setup").classList.add("hidden");
}

function showSettings() {
    document.getElementById("sendButton").disabled = false;
    document.getElementById("settings").classList.remove("hidden");
}

function hideSettings() {
    document.getElementById("sendButton").disabled = true;
    document.getElementById("settings").classList.add("hidden");
}


// MIDI Callbacks

function midiReadyCallback() {
    showSetup();
}

function midiFailedToStartCallback() {
    message('<strong>Could not start WebMIDI</strong><br>Please use a <a href="https://developer.mozilla.org/en-US/docs/Web/API/MIDIAccess#Browser_compatibility">supported browser</a>.', true);
}

function midiAccessBlockedCallback() {
    message('<strong>Could not start WebMIDI</strong><br>Please allow access to MIDI devices.', true);
}

function incompatibleFirmwareCallback(versionExpected) {
    message("Incompatible firmware. Expecting protocol version " + versionExpected + ".")
}

function incompatibleDeviceCallback() {
    message("Incompatible device selected.")
}

function sysexReceivedCallback() {
    message("Updated from device.");
    showSettings();
}
