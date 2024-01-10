const MODEL_ID = 0;

const GLOBAL_CHANNEL_ID = "globalChannel";
const KEY_CHANNEL_ID = "keyChannel";
const SHIFT_KEY_ID = "shiftKey";
const SEND_ALL_KEY_ID = "sendAllKey";
const KEY_TYPE_ID = "keyType";
const KEY_BEHAVIOR_ID = "keyBehavior";
const KEY_VALUE_ID = "keyValue";
const KEY_SHIFT_VALUE_ID = "keyShiftValue";
const KNOB_CHANNEL_ID = "knobChannel";
const KNOB_CC_ID = "knobCC";
const SELECT_IN_ID = "selectIn";
const SELECT_OUT_ID = "selectOut";
const REQUEST_BUTTON_ID = "requestButton";
const SEND_BUTTON_ID = "sendButton";
const DEFAULTS_BUTTON_ID = "defaultsButton";

class ConfigUI {

    init() {

        this._midiComms = new MidiComms();
        this._midiComms.readyCallback = this.midiReadyCallback;
        this._midiComms.accessBlockedCallback = this.midiAccessBlockedCallback;
        this._midiComms.failedToStartCallback = this.midiFailedToStartCallback;
        this._midiComms.devicesUpdatedCallback = this.devicesUpdatedCallback;
        this._midiComms.configReceivedCallback = this.configReceivedCallback;
        this._midiComms.writeFailedCallback = this.writeFailedCallback;
        this._midiComms.configSentCallback = this.configSentCallback;
        this._midiComms.requestSentCallback = this.requestSentCallback;
        this._midiComms.connect();

        this.device = new Device(MODEL_ID);
        this._attachEvents();
        this._generateSettings();
    }


    // UI

    showMessage(message, fatal = false) {
        document.getElementById("messageContent").innerHTML = message;
        if (fatal) {
            configUI.hideSetup();
            document.getElementById("message").classList.add("fatal");
        }
        document.getElementById("message").classList.remove("invisible");
    }

    hideMessage() {
        document.getElementById("message").classList.add("invisible");
    }

    showSetup() {
        document.getElementById("setup").classList.remove("hidden");
    }

    hideSetup() {
        document.getElementById("setup").classList.add("hidden");
    }

    _attachEvents() {
        document.getElementById(SELECT_IN_ID).addEventListener("change", this.selectInChanged);
        document.getElementById(SELECT_OUT_ID).addEventListener("change", this.selectOutChanged);
        document.getElementById(REQUEST_BUTTON_ID).addEventListener("click", this.requestConfigButton);
        document.getElementById(SEND_BUTTON_ID).addEventListener("click", this.sendConfigButton);
        document.getElementById(DEFAULTS_BUTTON_ID).addEventListener("click", this.setDefaultsButton);
    }

    _generateSettings() {

        let midiChannelRange = [];
        let midiRange = [];
        let keyRange = ["None"];
        let keyWithShiftRange = ["None"];
        let keyTypes = ["Note", "CC"];
        let keyBehaviors = ["Momentary", "Toggle"];

        for (let i = 1; i < 17; i++) { midiChannelRange[i] = i; }
        for (let i = 0; i < 128; i++) { midiRange[i] = i; }
        for (let i = 1; i <= this.device.numKeys; i++) {
            keyRange.push(i);
            keyWithShiftRange.push(i);
        }
        for (let i = 1; i <= this.device.numKeys; i++) {
            keyWithShiftRange.push("Shift + " + i);
        }

        let settings = document.getElementById("deviceSettings");

        // Global
        let globalSection = this._generateSection();
        globalSection.appendChild(this._generateItem("Global", [GLOBAL_CHANNEL_ID], ["Channel"], [[].concat("None", midiChannelRange)]));
        settings.appendChild(globalSection);

        // Keypad
        let keypadSection = this._generateSection();
        keypadSection.appendChild(this._generateItem("Keypad", [KEY_CHANNEL_ID], ["Channel"], [midiChannelRange]));
        keypadSection.appendChild(this._generateItem("Shift", [SHIFT_KEY_ID], ["Key"], [keyRange]));
        keypadSection.appendChild(this._generateItem("Send All CCs", [SEND_ALL_KEY_ID], ["Key"], [keyWithShiftRange]));
        settings.appendChild(keypadSection);

        // Keys
        let keysSection = this._generateSection();
        for (let i = 0; i < this.device.numKeys; i++) {
            keysSection.appendChild(this._generateItem(`Key ${i + 1}`, [`${KEY_TYPE_ID}${i + 1}`, `${KEY_VALUE_ID}${i + 1}`, `${KEY_SHIFT_VALUE_ID}${i + 1}`, `${KEY_BEHAVIOR_ID}${i + 1}`], ["Type", "Value", "Shift Value", "Behavior"], [keyTypes, midiRange, midiRange, keyBehaviors]));
        }
        settings.appendChild(keysSection);

        // Knobs
        let knobsSection = this._generateSection();
        for (let i = 0; i < this.device.numKnobs; i++) {
            knobsSection.appendChild(this._generateItem(`Knob ${i + 1}`, [`${KNOB_CHANNEL_ID}${i + 1}`, `${KNOB_CC_ID}${i + 1}`], ["Channel", "Control"], [midiChannelRange, midiRange]));
        }
        settings.appendChild(knobsSection);


        settings.addEventListener("change", this.settingSelectChanged);

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

        for (let i = 0; i < properties.length; i++) {

            let propertyElement = document.createElement("label");
            propertyElement.setAttribute("for", ids[i]);
            propertyElement.innerHTML = properties[i];
            if (i > 0) {
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

    showSettings() {
        document.getElementById(SEND_BUTTON_ID).disabled = false;
        document.getElementById("settings").classList.remove("hidden");
    }

    hideSettings() {
        document.getElementById(SEND_BUTTON_ID).disabled = true;
        document.getElementById("settings").classList.add("hidden");
    }

    updateSettings() {

        for (let i = 0; i < configUI.device.numKnobs; i++) {
            document.getElementById(`${KNOB_CHANNEL_ID}${i + 1}`).selectedIndex = configUI.device.knobChannels[i];
            document.getElementById(`${KNOB_CC_ID}${i + 1}`).selectedIndex = configUI.device.knobCCs[i];
        }

        for (let i = 0; i < configUI.device.numKeys; i++) {
            document.getElementById(`${KEY_TYPE_ID}${i + 1}`).selectedIndex = configUI.device.keyTypes[i];
            document.getElementById(`${KEY_BEHAVIOR_ID}${i + 1}`).selectedIndex = configUI.device.keyBehaviors[i];
            document.getElementById(`${KEY_VALUE_ID}${i + 1}`).selectedIndex = configUI.device.keyValues[i];
            document.getElementById(`${KEY_SHIFT_VALUE_ID}${i + 1}`).selectedIndex = configUI.device.keyShiftValues[i];
        }

        document.getElementById(`${KEY_CHANNEL_ID}`).selectedIndex = configUI.device.keyChannel;
        document.getElementById(`${SHIFT_KEY_ID}`).selectedIndex = configUI.device.shiftKey;
        if (configUI.device.shiftKey > 0) {
            this.enableShiftValues();
        } else {
            this.disableShiftValues();
        }
        document.getElementById(`${SEND_ALL_KEY_ID}`).selectedIndex = configUI.device.sendAllKey;
    }

    checkForGlobalChannel() {

        let useGlobalChannel = true;
        for (let i = 0; i < configUI.device.numKnobs; i++) {
            if (configUI.device.keyChannel != configUI.device.knobChannels[i]) {
                useGlobalChannel = false;
                break;
            }
        }

        if (useGlobalChannel) {
            document.getElementById(`${GLOBAL_CHANNEL_ID}`).selectedIndex = configUI.device.keyChannel + 1;
            configUI.enableGlobalChannel();
        
        } else {
            document.getElementById(`${GLOBAL_CHANNEL_ID}`).selectedIndex = 0;
            configUI.disableGlobalChannel();
        }
    }

    enableGlobalChannel() {
        for (let i = 0; i < configUI.device.numKnobs; i++) {
            document.getElementById(`${KNOB_CHANNEL_ID}${i + 1}`).disabled = true;
        }
        document.getElementById(KEY_CHANNEL_ID).disabled = true;
    }

    disableGlobalChannel() {
        for (let i = 0; i < configUI.device.numKnobs; i++) {
            document.getElementById(`${KNOB_CHANNEL_ID}${i + 1}`).disabled = false;
        }
        document.getElementById(KEY_CHANNEL_ID).disabled = false;
    }

    enableShiftValues() {
        for (let i = 0; i < configUI.device.numKeys; i++) {
            document.getElementById(`${KEY_SHIFT_VALUE_ID}${i + 1}`).disabled = false;
        }
    }

    disableShiftValues() {
        for (let i = 0; i < configUI.device.numKeys; i++) {
            document.getElementById(`${KEY_SHIFT_VALUE_ID}${i + 1}`).disabled = true;
        }
    }


    // Form events

    requestConfigButton() {
        configUI._midiComms.requestConfig(document.getElementById(SELECT_OUT_ID).selectedIndex, MODEL_ID, configUI.device.protocolVersion);
    }

    sendConfigButton() {
        let data = configUI.device.serialize();
        configUI._midiComms.sendConfig(document.getElementById(SELECT_OUT_ID).selectedIndex, MODEL_ID, configUI.device.protocolVersion, data);
    }

    setDefaultsButton() {
        configUI.device.initValues();
        configUI.checkForGlobalChannel();
        configUI.updateSettings();
        configUI.hideMessage();
    }

    selectInChanged() {
        configUI.hideSettings();
        configUI.hideMessage();
        configUI._midiComms.inDeviceIndex = document.getElementById(SELECT_IN_ID).selectedIndex;
    }

    selectOutChanged() {
        configUI.hideSettings();
        configUI.hideMessage();
    }

    settingSelectChanged(event) {

        if (event.target.id.startsWith(GLOBAL_CHANNEL_ID)) {
            if (event.target.selectedIndex > 0) {
                for (let i = 0; i < configUI.device.numKnobs; i++) {
                    configUI.device.knobChannels[i] = event.target.selectedIndex - 1;
                }
                configUI.device.keyChannel = event.target.selectedIndex - 1;
                configUI.enableGlobalChannel();
                configUI.updateSettings();

            } else {
                configUI.disableGlobalChannel();
            }

        } else if (event.target.id.startsWith(KEY_CHANNEL_ID)) {
            configUI.device.keyChannel = event.target.selectedIndex;

        } else if (event.target.id.startsWith(SHIFT_KEY_ID)) {
            configUI.device.shiftKey = event.target.selectedIndex;
            if (event.target.selectedIndex > 0) {
                configUI.enableShiftValues();
                configUI.updateSettings();

            } else {
                configUI.disableShiftValues();
            }

        } else if (event.target.id.startsWith(SEND_ALL_KEY_ID)) {
            configUI.device.sendAllKey = event.target.selectedIndex;

        } else if (event.target.id.startsWith(KEY_TYPE_ID)) {
            let index = parseInt(event.target.id.replace(KEY_TYPE_ID, "")) - 1;
            configUI.device.keyTypes[index] = event.target.selectedIndex;

        } else if (event.target.id.startsWith(KEY_BEHAVIOR_ID)) {
            let index = parseInt(event.target.id.replace(KEY_BEHAVIOR_ID, "")) - 1;
            configUI.device.keyBehaviors[index] = event.target.selectedIndex;

        } else if (event.target.id.startsWith(KEY_VALUE_ID)) {
            let index = parseInt(event.target.id.replace(KEY_VALUE_ID, "")) - 1;
            configUI.device.keyValues[index] = event.target.selectedIndex;

        } else if (event.target.id.startsWith(KEY_SHIFT_VALUE_ID)) {
            let index = parseInt(event.target.id.replace(KEY_SHIFT_VALUE_ID, "")) - 1;
            configUI.device.keyShiftValues[index] = event.target.selectedIndex;

        } else if (event.target.id.startsWith(KNOB_CHANNEL_ID)) {
            let index = parseInt(event.target.id.replace(KNOB_CHANNEL_ID, "")) - 1;
            configUI.device.knobChannels[index] = event.target.selectedIndex;

        } else if (event.target.id.startsWith(KNOB_CC_ID)) {
            let index = parseInt(event.target.id.replace(KNOB_CC_ID, "")) - 1;
            configUI.device.knobCCs[index] = event.target.selectedIndex;

        }

        configUI.hideMessage();
    }

    incompatibleDevice() {
        configUI.showMessage("Incompatible device selected.")
    }

    incompatibleProtocol(protocolVersion) {
        configUI.showMessage(`The controller firmware is using protocol version ${protocolVersion}.<br>This tool requires firmware that uses protocol version ${configUI.device.protocolVersion}.<br>You may need to update the firmware.`)
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
        configUI.hideSettings();
        document.getElementById(SELECT_IN_ID).innerHTML = devicesIn.map(device => `<option>${device.name}</option>`).join('');
        document.getElementById(SELECT_OUT_ID).innerHTML = devicesOut.map(device => `<option>${device.name}</option>`).join('')

        // Try to auto-select the right ports
        for(let i = 0; i < devicesIn.length; i++) {
            if (devicesIn[i].name == configUI.device.midiName) {
                document.getElementById(SELECT_IN_ID).selectedIndex = i;
                break;
            }
        };
        for(let i = 0; i < devicesOut.length; i++) {
            if (devicesOut[i].name == configUI.device.midiName) {
                document.getElementById(SELECT_OUT_ID).selectedIndex = i;
                break;
            }
        };

        configUI._midiComms.inDeviceIndex = document.getElementById(SELECT_IN_ID).selectedIndex;
        configUI.showMessage('MIDI devices updated.');
    }

    configReceivedCallback(modelId, protocolVersion, firmwareVersion, data) {

        // console.log("configReceivedCallback", modelId, protocolVersion, firmwareVersion, data);

        // Check modelId
        if (modelId == MODEL_ID) {

            // Check protocolVersion
            if (protocolVersion == configUI.device.protocolVersion) {

                // Try to process
                if (configUI.device.unserialize(data)) {

                    configUI.checkForGlobalChannel();
                    configUI.updateSettings();
                    configUI.showSettings();
                    configUI.showMessage(`Updated from ${configUI.device.name}. Firmware version ${firmwareVersion[0]}.${firmwareVersion[1]}.${firmwareVersion[2]}`);

                } else {
                    configUI.showMessage("Invalid data received.")
                }

            } else {
                configUI.incompatibleProtocol(protocolVersion);
            }

        } else {
            configUI.incompatibleDevice();
        }
    }

    writeFailedCallback(modelId, protocolVersion) {

        // Check modelId
        if (modelId == MODEL_ID) {

            // Check protocolVersion
            if (protocolVersion == configUI.device.protocolVersion) {

                configUI.showMessage("Failed to store config. Please send again.")

            } else {
                configUI.incompatibleProtocol(protocolVersion);
            }

        } else {
            configUI.incompatibleDevice();
        }
    }

    configSentCallback() {
        configUI.showMessage("Sent to device.")
    }

    requestSentCallback() {
        configUI.showMessage("Requesting...")
    }

}

document.addEventListener('DOMContentLoaded', (event) => {
    configUI = new ConfigUI();
    configUI.init();
})
