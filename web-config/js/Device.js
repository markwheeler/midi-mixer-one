class Device {

    constructor(modelId) {

        const devices = [
            {
                name: "MIDI Mixer One",
                midiName: "Mixer One",
                modelId: 0,
                protocolVersion: 1,
                numKnobs: 41,
                numKeys: 12,
                dataBitsArray: [],

                defaultKnobChannels: [
                    0, 0, 0, 0, 0,
                    0, 0, 0, 0, 0,
                    0, 0, 0, 0, 0,
                    0, 0, 0, 0, 0,
                    0, 0, 0, 0, 0,
                    0, 0, 0, 0, 0,
                    0, 0, 0, 0, 0,
                    0, 0, 0, 0, 0,
                    0],
                defaultKnobCCs: [
                    2, 3, 4, 5, 6,
                    7, 8, 9, 10, 11,
                    12, 13, 14, 15, 16,
                    17, 18, 19, 20, 21,
                    22, 23, 24, 25, 26,
                    27, 28, 29, 30, 31,
                    32, 33, 34, 35, 36,
                    37, 38, 39, 40, 41,
                    42],
                defaultKeyTypes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                defaultKeyValues: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
                defaultKeyShiftValues: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
                defaultKeyBehaviors: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                defaultKeyChannel: 0,
                defaultShiftKey: 0,
                defaultSendAllKey: 1,

                initValues() {
                    this.knobChannels = [...this.defaultKnobChannels];
                    this.knobCCs = [...this.defaultKnobCCs];
                    this.keyChannel = this.defaultKeyChannel;
                    this.keyTypes = [...this.defaultKeyTypes];
                    this.keyBehaviors = [...this.defaultKeyBehaviors];
                    this.keyValues = [...this.defaultKeyValues];
                    this.keyShiftValues = [...this.defaultKeyShiftValues];
                    this.shiftKey = this.defaultShiftKey;
                    this.sendAllKey = this.defaultSendAllKey;
                    this.dataBitsArray = this._generateDataBitsArray();
                },

                _generateDataBitsArray() {

                    // This array defines the serialized data format
                    let dataBitsArray = []

                    // 4bit knobChannel, 7bit knobCC
                    for (let i = 0; i < this.numKnobs; i++) {
                        dataBitsArray.push(4);
                        dataBitsArray.push(7);
                    }

                    // 1bit keyType, 1bit keyBehavior, 7bit keyValue, 7bit keyShiftValue
                    for (let i = 0; i < this.numKeys; i++) {
                        dataBitsArray.push(1);
                        dataBitsArray.push(7);
                        dataBitsArray.push(7);
                        dataBitsArray.push(1);
                    }

                    // 4bit keyChannel, 4bit shiftKey, 5bit sendAllKey
                    dataBitsArray.push(4);
                    dataBitsArray.push(4);
                    dataBitsArray.push(5);

                    // 644 bits total (1024 max EEPROM on Teensy LC)

                    return dataBitsArray
                },

                _arrayToBits(data, bitSize = 7, bitSizeArray = []) {

                    // Accepts uints 1 to 8 bits
                    
                    let binArray = [];

                    for (let i = 0; i < data.length; i++) {
                        
                        if (bitSizeArray[i]) {
                            bitSize = bitSizeArray[i];
                        }
                        let number = data[i];
                        let chunk = [];
                        for (let j = 0; j < bitSize; j ++) {
                            chunk.unshift(number & 0b00000001);
                            number >>= 1;
                        }
                        binArray = binArray.concat(chunk);
                    }

                    return binArray;
                },

                _bitsToNumberArray(bits, bitSize = 7, bitSizeArray = []) {

                    let totalBits = 0;
                    if (bitSizeArray[0]) {
                        bitSizeArray.forEach(element => {
                            totalBits += element;
                        });
                    } else {
                        totalBits = bits.length;
                    }

                    let byteArray = [];
                    let pos = 0;

                    for (let i = 0; i < totalBits; i += 0) {

                        if (bitSizeArray[pos]) {
                            bitSize = bitSizeArray[pos];
                        }
                        
                        let byte = 0;
                        for (let j = 0; j < bitSize; j ++) {
                            byte <<= 1;
                            byte |= bits[i + j];
                        }
                        byteArray.push(byte);

                        i += bitSize;
                        pos ++;
                    }

                    return byteArray;
                },

                serialize() {
                    let data = []

                    for (let i = 0; i < this.numKnobs; i++) {
                        data.push(this.knobChannels[i]);
                        data.push(this.knobCCs[i]);
                    }

                    for (let i = 0; i < this.numKeys; i++) {
                        data.push(this.keyTypes[i]);
                        data.push(this.keyValues[i]);
                        data.push(this.keyShiftValues[i]);
                        data.push(this.keyBehaviors[i]);
                    }

                    data.push(this.keyChannel);
                    data.push(this.shiftKey);
                    data.push(this.sendAllKey);

                    // Generate an array that is a binary array of all the data
                    let binArray = this._arrayToBits(data, 0, this.dataBitsArray);
                    // Split that array into bytes
                    let byteArray = this._bitsToNumberArray(binArray, 7);
                    
                    return byteArray;
                },

                unserialize(data) {

                    // Turn the byte array into a binary array
                    let unserializedBinArray = this._arrayToBits(data, 7);
                    // Unserialize that binary array into data of varying bit lengths
                    let unserialized = this._bitsToNumberArray(unserializedBinArray, 0, this.dataBitsArray);

                    const EXPECTED_DATA_LEN = 121;

                    if (unserialized.length == EXPECTED_DATA_LEN) {

                        const KEYS_DATA_START = this.numKnobs * 2;
                        const EXTRA_DATA_START = KEYS_DATA_START + this.numKeys * 4;

                        // Knob channels and CCs
                        let knobIndex = 0;
                        for (let i = 0; i < KEYS_DATA_START; i += 2) {
                            this.knobChannels[knobIndex] = Math.min(Math.max(unserialized[i], 0), 15);
                            this.knobCCs[knobIndex] = Math.min(Math.max(unserialized[i + 1], 0), 127);
                            knobIndex++;
                        }

                        // Key types, values, and behaviors
                        let keyIndex = 0;
                        for (let i = KEYS_DATA_START; i < EXTRA_DATA_START; i += 4) {
                            this.keyTypes[keyIndex] = Math.min(Math.max(unserialized[i], 0), 1);
                            this.keyValues[keyIndex] = Math.min(Math.max(unserialized[i + 1], 0), 127);
                            this.keyShiftValues[keyIndex] = Math.min(Math.max(unserialized[i + 2], 0), 127);
                            this.keyBehaviors[keyIndex] = Math.min(Math.max(unserialized[i + 3], 0), 1);
                            keyIndex++;
                        }

                        // Keypad
                        this.keyChannel = Math.min(Math.max(unserialized[EXTRA_DATA_START], 0), 15);
                        this.shiftKey = Math.min(Math.max(unserialized[EXTRA_DATA_START + 1], 0), 12);
                        this.sendAllKey = Math.min(Math.max(unserialized[EXTRA_DATA_START + 2], 0), 24);

                        return true;

                    } else {
                        // Return failure
                        return false;
                    }
                }
            }
        ]

        for (let k in devices[modelId]) {
            this[k] = devices[modelId][k];
        }
        this.initValues();
    }

}
