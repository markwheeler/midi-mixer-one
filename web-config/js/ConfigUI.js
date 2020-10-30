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

        const midiChannelRange = [];
        const midiRange = [];
        const keyRange = ["None"];
        
        for( let i = 1; i < 17; i ++ ) { midiChannelRange[i] = i; }
        for( let i = 0; i < 128; i ++ ) { midiRange[i] = i; }
        for( let i = 1; i <= this.device.numKeys; i ++ ) { keyRange.push(i); }

        let settings = document.getElementById("deviceSettings");

        // Global
        let globalSection = this._generateSection();
        globalSection.appendChild(this._generateItem("Global", ["globalChannel"], ["Channel"], [[].concat("None", midiChannelRange)]));
        settings.appendChild(globalSection);

        // Keypad
        let keypadSection = this._generateSection();
        keypadSection.appendChild(this._generateItem("Keypad", ["keypadChannel"], ["Channel"], [midiChannelRange]));
        keypadSection.appendChild(this._generateItem("Send All CCs", ["sendAllKey"], ["Key"], [keyRange]));
        settings.appendChild(keypadSection);

        // Keys
        let keysSection = this._generateSection();
        for( let i = 0; i < this.device.numKeys; i ++ ) {
            keysSection.appendChild(this._generateItem("Key " + (i + 1), ["key" + (i + 1)], ["Note"], [midiRange]));
        }
        settings.appendChild(keysSection);

        // Knobs
        let knobsSection = this._generateSection();
        for( let i = 0; i < this.device.numKnobs; i ++ ) {
            knobsSection.appendChild(this._generateItem("Knob " + (i + 1), ["knobChannel" + (i + 1), "knobCC" + (i + 1)], ["Channel", "Control"], [midiChannelRange, midiRange]));
        }
        settings.appendChild(knobsSection);

    }

    _generateSection() {
        let sectionElement = document.createElement("div");
        sectionElement.className = "section";
        return sectionElement
    }

    _generateItem(name, ids, properties, options) {

        let itemElement = document.createElement("div");
        itemElement.className = "item";

        let nameElement = document.createElement("label");
        nameElement.className = "itemName";
        nameElement.innerHTML = name;
        itemElement.appendChild(nameElement);

        for(let i = 0; i < properties.length; i ++) {

            let propertyElement = document.createElement("label");
            propertyElement.setAttribute("for", ids[i]);
            propertyElement.innerHTML = properties[i];
            if( i > 0 ) {
                propertyElement.className = "secondary";
                itemElement.appendChild(document.createElement("br"));
            }
            itemElement.appendChild(propertyElement);

            let selectElement = document.createElement("select");
            selectElement.id = ids[i];
            selectElement.className = "narrow";

            options[i].forEach(option => {
                let optionElement = document.createElement("option");
                optionElement.innerHTML = option;
                selectElement.appendChild(optionElement);
            });

            itemElement.appendChild(selectElement);
        }
        return itemElement;
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
        configUI._midiComms.requestSysex(document.getElementById("selectOut").selectedIndex, this.device.modelId, this.device.protocolVersion);
    }

    sendSysexButton() {
        configUI._midiComms.sendSysex(document.getElementById("selectOut").selectedIndex, this.device.modelId, this.device.protocolVersion);
    }

    setDefaultsButton() {
        // TODO test
        configUI.device.setDefaults();
        configUI.updateSettings();
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
        document.getElementById("selectIn").innerHTML = devicesIn.map(device => `<option>${device.name}</option>`).join('');
        document.getElementById("selectOut").innerHTML = devicesOut.map(device => `<option>${device.name}</option>`).join('');
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
