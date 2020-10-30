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
                defaultKeyChannel: 1,
                defaultKeyNotes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
                defaultSendAllKey: 0,
                
                knobChannels: this.defaultKnobChannels,
                knobCCs: this.defaultKnobCCs,
                keyChannel: this.defaultKeyChannel,
                keyNotes: this.defaultKeyNotes,
                sendAllKey: this.defaultSendAllKey
            }
        ]

        for(let k in devices[modelId]) {
            this[k] = devices[modelId][k];
        }
    }

    setDefaults() {
        this.knobChannels = this.defaultKnobChannels;
        this.knobCCs = this.defaultknobCCs;
        this.keyChannel = this.defaultkeyChannel;
        this.keyNotes = this.defaultkeyNotes;
        this.sendAllKey = this.defaultsendAllKey;
    }

}
