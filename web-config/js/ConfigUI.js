const MODEL_ID = 0;

class ConfigUI {

    constructor() {

        this._midiComms = new MidiComms();
        this._midiComms.readyCallback = this.midiReadyCallback;
        this._midiComms.accessBlockedCallback = this.midiAccessBlockedCallback;
        this._midiComms.failedToStartCallback = this.midiFailedToStartCallback;
        this._midiComms.devicesUpdatedCallback = this.devicesUpdatedCallback;
        this._midiComms.configReceivedCallback = this.configReceivedCallback;
        this._midiComms.configSentCallback = this.configSentCallback;
        this._midiComms.requestSentCallback = this.requestSentCallback;
        this._midiComms.connect();
        
        this.device = new Device(MODEL_ID);
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

        let midiChannelRange = [];
        let midiRange = [];
        let keyRange = ["None"];
        
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
        keypadSection.appendChild(this._generateItem("Keypad", ["keyChannel"], ["Channel"], [midiChannelRange]));
        keypadSection.appendChild(this._generateItem("Send All CCs", ["sendAllKey"], ["Key"], [keyRange]));
        settings.appendChild(keypadSection);

        // Keys
        let keysSection = this._generateSection();
        for( let i = 0; i < this.device.numKeys; i ++ ) {
            keysSection.appendChild(this._generateItem(`Key ${i + 1}`, [`keyNote${i + 1}`], ["Note"], [midiRange]));
        }
        settings.appendChild(keysSection);

        // Knobs
        let knobsSection = this._generateSection();
        for( let i = 0; i < this.device.numKnobs; i ++ ) {
            knobsSection.appendChild(this._generateItem(`Knob ${i + 1}`, [`knobChannel${i + 1}`, `knobCC${i + 1}`], ["Channel", "Control"], [midiChannelRange, midiRange]));
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

        for(let i = 0; i < configUI.device.numKnobs; i ++) {
            document.getElementById(`knobChannel${i + 1}`).selectedIndex = configUI.device.knobChannels[i];
            document.getElementById(`knobCC${i + 1}`).selectedIndex = configUI.device.knobCCs[i];
        }

        for(let i = 0; i < configUI.device.numKeys; i ++) {
            document.getElementById(`keyNote${i + 1}`).selectedIndex = configUI.device.keyNotes[i];
        }

        document.getElementById(`keyChannel`).selectedIndex = configUI.device.keyChannel;
        document.getElementById(`sendAllKey`).selectedIndex = configUI.device.sendAllKey;
    }
    
    showSettings() {
        document.getElementById("sendButton").disabled = false;
        document.getElementById("settings").classList.remove("hidden");
    }
    
    hideSettings() {
        document.getElementById("sendButton").disabled = true;
        document.getElementById("settings").classList.add("hidden");
    }


    // Button events

    requestConfigButton() {
        configUI._midiComms.requestConfig(document.getElementById("selectOut").selectedIndex, MODEL_ID, this.device.protocolVersion);
    }

    sendConfigButton() {
        configUI._midiComms.sendConfig(document.getElementById("selectOut").selectedIndex, MODEL_ID, this.device.protocolVersion);
    }

    dummyResponseButton() {
        configUI._midiComms.sendDummyResponse(document.getElementById("selectOut").selectedIndex, MODEL_ID, this.device.protocolVersion);
    }

    setDefaultsButton() {
        // TODO test
        configUI.device.initValues();
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

    configReceivedCallback(modelId, protocolVersion, firmwareVersion, data) {
        
        console.log("Received data", modelId, protocolVersion, firmwareVersion, data);

        // Check modelId
        if(modelId == MODEL_ID) {

            // Check protocolVersion
            if(protocolVersion == configUI.device.protocolVersion) {

                // Try to process
                if(configUI.device.unserialize(data)) {
                    configUI.updateSettings();
                    configUI.showSettings();
                    configUI.showMessage(`Updated from ${configUI.device.name}. Firmware version ${firmwareVersion[0]}.${firmwareVersion[1]}.${firmwareVersion[2]}`);
    
                } else {
                    configUI.showMessage("Invalid data received.")
                }

            } else {
                configUI.showMessage(`Incompatible firmware. Expecting protocol version ${configUI.device.protocolVersion}.`)
            }
            
        } else {
            configUI.showMessage("Incompatible device selected.")
        }
    }

    configSentCallback() {
        configUI.showMessage("Sent to device.")
    }

    requestSentCallback() {
        configUI.showMessage("Requesting...")
    }

}

configUI = new ConfigUI();
