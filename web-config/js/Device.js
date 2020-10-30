class Device {

    constructor(modelId) {

        var devices = [
            {
                name: "MIDI Mixer One",
                modelId: 0,
                protocolVersion: 0,
                numPots: 41,
                numKeys: 12,

                defaultPotChannels: [
                    1, 1, 1, 1, 1,
                    1, 1, 1, 1, 1,
                    1, 1, 1, 1, 1,
                    1, 1, 1, 1, 1,
                    1, 1, 1, 1, 1,
                    1, 1, 1, 1, 1,
                    1, 1, 1, 1, 1,
                    1, 1, 1, 1, 1,
                    1],
                defaultPotCCs: [
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
                
                potChannels: this.defaultPotChannels,
                potCCs: this.defaultPotCCs,
                keyChannel: this.defaultKeyChannel,
                keyNotes: this.defaultKeyNotes,
                sendAllKey: this.defaultSendAllKey
            }
        ]

        return devices[modelId];
    }
}
