class ConfigUI {

    constructor() {

        this._midiComms = new MidiComms();
        this._midiComms.readyCallback = this.midiReadyCallback;
        this._midiComms.accessBlockedCallback = this.midiAccessBlockedCallback;
        this._midiComms.failedToStartCallback = this.midiFailedToStartCallback;
        this._midiComms.devicesUpdatedCallback = this.devicesUpdatedCallback;
        this._midiComms.sysexReceivedCallback = this.sysexReceivedCallback;
        this._midiComms.sysexSentCallback = this.sysexSentCallback;
        this._midiComms.connect();
        
        this.device = new Device(0); // Could be dynamic in future to support multiple models
        this.generateSettings();
    }


    // UI

    showMessage(message, fatal = false) {
        document.getElementById("messageContent").innerHTML = message;
        if( fatal ) {
            this.hideSetup();
            document.getElementById("message").classList.add("fatal");
        }
        document.getElementById("message").classList.remove("hidden");
    }

    showSetup() {
        document.getElementById("setup").classList.remove("hidden");
    }
    
    hideSetup() {
        document.getElementById("setup").classList.add("hidden");
    }

    generateSettings() {
        // TODO

        // Global

        // Knobs

        // Keys
    }

    updateSettings() {
        // TODO update UI elements from device model
    }
    
    showSettings() {
        document.getElementById("sendButton").disabled = false;
        document.getElementById("settings").classList.remove("hidden");
    }
    
    hideSettings() {
        document.getElementById("sendButton").disabled = true;
        document.getElementById("settings").classList.add("hidden");
    }

    incompatibleFirmware(versionExpected) {
        configUI.showMessage("Incompatible firmware. Expecting protocol version " + versionExpected + ".")
    }

    incompatibleDevice() {
        configUI.showMessage("Incompatible device selected.")
    }


    // Button events

    requestSysexButton() {
        configUI._midiComms.requestSysex(selectOut.selectedIndex, this.device.modelId, this.device.protocolVersion);
    }

    sendSysexButton() {
        configUI._midiComms.sendSysex(selectOut.selectedIndex, this.device.modelId, this.device.protocolVersion);
    }

    setDefaultsButton() {
        // TODO
        console.log("TODO: Set defaults.")
    }


    // MIDI Callbacks

    midiReadyCallback() {
        configUI.showSetup();
    }

    midiFailedToStartCallback() {
        configUI.showMessage('<strong>Could not start WebMIDI</strong><br>Please use a <a href="https://developer.mozilla.org/en-US/docs/Web/API/MIDIAccess#Browser_compatibility">supported browser</a>.', true);
    }

    midiAccessBlockedCallback() {
        configUI.showMessage('<strong>Could not start WebMIDI</strong><br>Please allow access to MIDI devices.', true);
    }

    devicesUpdatedCallback(devicesIn, devicesOut) {
        selectIn.innerHTML = devicesIn.map(device => `<option>${device.name}</option>`).join('');
        selectOut.innerHTML = devicesOut.map(device => `<option>${device.name}</option>`).join('');
    }

    sysexReceivedCallback(modelId, protocolVersion, data) {

        console.log("Received data", modelId, protocolVersion, data);

        // Check modelId
        if(modelId == configUI.device.modelId) {

            // Check protocolVersion
            if(protocolVersion == configUI.device.protocolVersion) {
                configUI.showMessage("Updated from " + configUI.device.name + ".");
                configUI.updateSettings();
                configUI.showSettings();

            } else {
                configUI.incompatibleFirmware(configUI.device.protocolVersion);
            }
            
        } else {
            configUI.incompatibleDevice();
        }
    }

    sysexSentCallback() {
        configUI.showMessage("Sent to device.")
    }

}

configUI = new ConfigUI();
