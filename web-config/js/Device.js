class Device {

    constructor(modelId) {

        const devices = [
            {
                name: "MIDI Mixer One",
                modelId: 0,
                protocolVersion: 0,
                numKnobs: 41,
                numKeys: 12,

                defaultKnobChannels: [
                    1, 1, 1, 1, 1,
                    1, 1, 1, 1, 1,
                    1, 1, 1, 1, 1,
                    1, 1, 1, 1, 1,
                    1, 1, 1, 1, 1,
                    1, 1, 1, 1, 1,
                    1, 1, 1, 1, 1,
                    1, 1, 1, 1, 1,
                    1],
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
                defaultKeyNotes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
                defaultKeyChannel: 1,
                defaultSendAllKey: 1,

                initValues() {
                    this.knobChannels = [...this.defaultKnobChannels];
                    this.knobCCs = [...this.defaultKnobCCs];
                    this.keyChannel = this.defaultKeyChannel;
                    this.keyNotes = [...this.defaultKeyNotes];
                    this.sendAllKey = this.defaultSendAllKey;
                },

                // Format is: 2 bytes per knob (channel then CC), 1 per key, 1 for keypadChannel, 1 for sendAllKey
                serialDataLen: 96,

                serialize() {
                    let data = []

                    for (let i = 0; i < this.numKnobs; i++) {
                        data.push(this.knobChannels[i]);
                        data.push(this.knobCCs[i]);
                    }

                    for (let i = 0; i < this.numKeys; i++) {
                        data.push(this.keyNotes[i]);
                    }

                    data.push(this.keyChannel);
                    data.push(this.sendAllKey);

                    return data;
                },

                unserialize(data) {

                    const EXPECTED_DATA_LEN = 96;

                    if (data.length == EXPECTED_DATA_LEN) {

                        const KEYS_DATA_START = this.numKnobs * 2;
                        const EXTRA_DATA_START = KEYS_DATA_START + this.numKeys;

                        // Knob channels and CCs
                        let knobIndex = 0;
                        for (let i = 0; i < KEYS_DATA_START; i += 2) {
                            this.knobChannels[knobIndex] = Math.min(Math.max(data[i], 1), 16);
                            this.knobCCs[knobIndex] = Math.min(Math.max(data[i + 1], 0), 127);
                            knobIndex++;
                        }

                        // Key notes
                        let keyIndex = 0;
                        for (let i = KEYS_DATA_START; i < EXTRA_DATA_START; i++) {
                            this.keyNotes[keyIndex] = Math.min(Math.max(data[i], 0), 127);
                            keyIndex++;
                        }

                        this.keyChannel = Math.min(Math.max(data[EXTRA_DATA_START], 1), 16);
                        this.sendAllKey = Math.min(Math.max(data[EXTRA_DATA_START + 1], 0), 12);

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
