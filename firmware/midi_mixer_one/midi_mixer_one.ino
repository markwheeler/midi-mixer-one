// MIDI Mixer One
// Mark Eats / Mark Wheeler
// Uses snippets from https://github.com/dxinteractive/ResponsiveAnalogRead/

const byte FIRMWARE_VERSION[] = {2, 1, 0};

#include <EEPROM.h>

// Pot params
#define POT_BITS                10 // 7-16 is valid
#define POT_NUM_READS           8 // 1-32 is reasonable
#define POT_SNAP_MULTIPLIER     0.1 // 0-1 lower values increase easing
#define POT_ACTIVITY_THRESHOLD  2 // Sleep zone

// Switch params
#define BOUNCE_LOCK_OUT
#define SWITCH_INTERVAL         5 // ms
#include <Bounce2.h>

// Hardware
#define NUM_POTS                41
#define NUM_MUXES               5
#define NUM_MUX_SIGNAL_PINS     3
#define NUM_MUX_CHANNELS        8
#define NUM_SWITCHES            12

const byte MUX_PINS[] =         {14, 15, 16, 17, 18};
const byte MUX_SIGNAL_PINS[] =  {23, 22, 21};
const byte MUX_POTS_BY_CHANNEL[][NUM_MUX_CHANNELS] = {
  {1, 2, 3, 0, 4, 5, 7, 6},
  {11, 8, 9, 10, 14, 15, 13, 12},
  {17, 18, 19, 16, 23, 20, 22, 21},
  {24, 28, 29, 27, 31, 26, 30, 25},
  {33, 34, 39, 32, 38, 35, 37, 36},
};
#define MIX_POT_PIN             19
const byte SWITCH_PINS[] =      {3, 11, 7, 2, 6, 8, 1, 5, 9, 0, 4, 10};

const int POT_RES = pow(2, POT_BITS);

// Sysex and config store
const byte MANUFACTURER_ID[] =  {0x7D, 0x00, 0x00};
#define MODEL_ID                0
#define PROTOCOL_VERSION        1
#define SYSEX_START_CODE        0xF0
#define SYSEX_END_CODE          0xF7
#define REQUEST                 0x00
#define REQUEST_LENGTH          8
#define STORE                   0x01
#define STORE_HEADER_LENGTH     8
#define RESPONSE                0x02
#define RESPONSE_HEADER_LENGTH  9
#define WRITE_FAILED            0x03
#define WRITE_FAILED_LENGTH     6
const byte SYSEX_RESPONSE_HEADER[] = {MANUFACTURER_ID[0], MANUFACTURER_ID[1], MANUFACTURER_ID[2], MODEL_ID, PROTOCOL_VERSION, RESPONSE,
                                      FIRMWARE_VERSION[0], FIRMWARE_VERSION[1], FIRMWARE_VERSION[2]
                                     };
const byte SYSEX_WRITE_FAILED[] = {MANUFACTURER_ID[0], MANUFACTURER_ID[1], MANUFACTURER_ID[2], MODEL_ID, PROTOCOL_VERSION, WRITE_FAILED};

#define UNPACKED_BYTE_DATA_LENGTH 121
#define PACKED_BYTE_DATA_LENGTH   92
#define BIN_DATA_LENGTH           644
byte dataBitsArray[UNPACKED_BYTE_DATA_LENGTH];

// Vars
byte potChannels[NUM_POTS];
byte potCCs[NUM_POTS];
byte switchChannel;
byte switchTypes[NUM_SWITCHES];
byte switchValues[NUM_SWITCHES];
byte switchShiftValues[NUM_SWITCHES];
byte shiftSwitch; // 0 for none
byte sendAllSwitch; // 0 for none
bool shiftActive = false;
bool downSwitches[NUM_SWITCHES] = {false};

float potValues[NUM_POTS];
byte potMidiValues[NUM_POTS];
Bounce switches[NUM_SWITCHES];

byte incomingSysex[PACKED_BYTE_DATA_LENGTH + STORE_HEADER_LENGTH];
int incomingSysexLength = 0;

void setup() {

  Serial.begin(38400);

  analogReadResolution(POT_BITS);
  analogReadAveraging(POT_NUM_READS);

  // Pots
  for (byte i = 0; i < NUM_MUX_SIGNAL_PINS; i ++) {
    pinMode(MUX_SIGNAL_PINS[i], OUTPUT);
  }

  // Switches
  for (byte i = 0; i < NUM_SWITCHES; i ++) {
    pinMode(SWITCH_PINS[i], INPUT_PULLUP);
    switches[i] = Bounce();
    switches[i].attach(SWITCH_PINS[i]);
    switches[i].interval(SWITCH_INTERVAL);
  }

  // LED
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);

  generateDataBitsArray();
  unserialize(readEeprom());

  usbMIDI.setHandleSystemExclusive(processSysexChunk);
}

void sendAllPotValues() {
  for (byte i = 0; i < NUM_POTS; i ++) {
    usbMIDI.sendControlChange(potCCs[i], potMidiValues[i], potChannels[i] + 1);
  }
}

float snapCurve(float x) {
  float y = 1.0 / (x + 1.0);
  y = (1.0 - y) * 2.0;
  if (y > 1.0) {
    return 1.0;
  }
  return y;
}

float smoothValue(float oldValue, int newValue) {

  int diff = abs(newValue - oldValue);

  if (diff < POT_ACTIVITY_THRESHOLD) {
    return oldValue;
  }

  float snap = snapCurve(diff * POT_SNAP_MULTIPLIER);
  return oldValue + (newValue - oldValue) * snap;
}

void readPots() {

  // Read pots on muxes
  for (byte c = 0; c < NUM_MUX_CHANNELS; c ++) {

    // Set mux channel
    for (byte s = 0; s < NUM_MUX_SIGNAL_PINS; s ++) {
      digitalWrite(MUX_SIGNAL_PINS[s], bitRead(c, s));
    }
    delayMicroseconds(5);

    // Read from all muxes
    for (byte m = 0; m < NUM_MUXES; m ++) {
      byte pot = MUX_POTS_BY_CHANNEL[m][c];
      potValues[pot] = smoothValue(potValues[pot], analogRead(MUX_PINS[m]));
    }
  }

  // Read mix pot
  potValues[40] = smoothValue(potValues[40], analogRead(MIX_POT_PIN));

  // Check values
  for (byte i = 0; i < NUM_POTS; i ++) {

    byte newMidiValue = int(potValues[i] + 0.5) >> (POT_BITS - 7);

    if (newMidiValue != potMidiValues[i]) {
      usbMIDI.sendControlChange(potCCs[i], newMidiValue, potChannels[i] + 1);
      potMidiValues[i] = newMidiValue;
    }
  }
}

byte getSwitchValue(byte index) {
  byte switchValue;
  if (shiftActive) {
    switchValue = switchShiftValues[index];
  } else {
    switchValue = switchValues[index];
  }
  return switchValue;
}

void switchDown(byte index) {
  downSwitches[index] = true;
  if (switchTypes[index]) {
    usbMIDI.sendControlChange(getSwitchValue(index), 127, switchChannel + 1);
  } else {
    usbMIDI.sendNoteOn(getSwitchValue(index), 127, switchChannel + 1);
  }
}

void switchUp(byte index) {
  if (downSwitches[index]) {
    downSwitches[index] = false;
    if (switchTypes[index]) {
      usbMIDI.sendControlChange(getSwitchValue(index), 0, switchChannel + 1);
    } else {
      usbMIDI.sendNoteOff(getSwitchValue(index), 0, switchChannel + 1);
    }
  }
}

void switchesAllUp() {
  for (int k = 0; k < NUM_SWITCHES; k ++) {
    switchUp(k);
  }
}

void readSwitches() {

  for (byte i = 0; i < NUM_SWITCHES; i ++) {
    switches[i].update();

    // Shift
    if (i == shiftSwitch - 1) {
      if (switches[i].fell()) {
        switchesAllUp();
        shiftActive = true;
      } else if (switches[i].rose()) {
        switchesAllUp();
        shiftActive = false;
      }

    // Send all pot values
    } else if ((!shiftActive && i == sendAllSwitch - 1) || (shiftActive && i == sendAllSwitch - 13)) {
      if (switches[i].fell()) {
        sendAllPotValues();
      }

    // Send switches
    } else {
      if (switches[i].fell()) {
        switchDown(i);
      } else if (switches[i].rose()) {
        switchUp(i);
      }
    }

  }
}

byte* readEeprom() {
  static byte serialData[PACKED_BYTE_DATA_LENGTH];
  for (unsigned i = 0; i < PACKED_BYTE_DATA_LENGTH; i ++) {
    serialData[i] = EEPROM.read(i);
  }
  return serialData;
}

bool writeEeprom(byte* serialData) {
  bool success = true;

  for (unsigned i = 0; i < PACKED_BYTE_DATA_LENGTH; i ++) {
    EEPROM.update(i, serialData[i]);

    // NOTE: Checking every byte here, ideally remove in future if EEPROM.update() is proven reliable.
    if (success && EEPROM.read(i) != serialData[i]) {
      success = false;
    }
  }

  Serial.print("EEPROM write success ");
  Serial.println(success);

  return success;
}

void generateDataBitsArray() {

  unsigned p = 0;

  // 4bit potChannel, 7bit potCC
  for (unsigned i = 0; i < NUM_POTS; i++) {
    dataBitsArray[p] = 4;
    p ++;
    dataBitsArray[p] = 7;
    p ++;
  }

  // 1bit switchType, 7bit switchValue, 7bit switchShiftValue
  for (unsigned i = 0; i < NUM_SWITCHES; i++) {
    dataBitsArray[p] = 1;
    p ++;
    dataBitsArray[p] = 7;
    p ++;
    dataBitsArray[p] = 7;
    p ++;
  }

  // 4bit switchChannel, 4bit shiftSwitch, 5bit sendAllSwitch
  dataBitsArray[p] = 4;
  p ++;
  dataBitsArray[p] = 4;
  p ++;
  dataBitsArray[p] = 5;

}

bool* arrayToBits(byte* serialData, unsigned serialDataLength, bool useDataBitsArray = false, byte bitSize = 7) {

  // Accepts uints 1 to 8 bits

  static bool binArray[BIN_DATA_LENGTH];

  unsigned pos = 0;
  for (unsigned i = 0; i < serialDataLength; i ++) {

    if (useDataBitsArray) {
      bitSize = dataBitsArray[i];
    }
    byte number = serialData[i];
    for (unsigned j = 0; j < bitSize; j ++) {
      binArray[pos + bitSize - 1 - j] = number & 0b00000001;
      number >>= 1;
    }

    pos += bitSize;
  }

  return binArray;
}

byte* bitsToNumberArray(bool* bitsData, bool useDataBitsArray = false, byte bitSize = 7) {

  static byte byteArray[UNPACKED_BYTE_DATA_LENGTH];

  unsigned pos = 0;

  for (unsigned i = 0; i < BIN_DATA_LENGTH; i += 0) {

    if (useDataBitsArray) {
      bitSize = dataBitsArray[pos];
    }

    byte number = 0;
    for (unsigned j = 0; j < bitSize; j ++) {
      number <<= 1;
      number |= bitsData[i + j];
    }
    byteArray[pos] = number;

    i += bitSize;
    pos ++;
  }

  return byteArray;
}

byte* serialize() {

  byte serialData[UNPACKED_BYTE_DATA_LENGTH];
  unsigned a = 0;

  for (unsigned i = 0; i < NUM_POTS; i ++) {
    serialData[a] = potChannels[i];
    serialData[a + 1] = potCCs[i];
    a += 2;
  }

  for (unsigned i = 0; i < NUM_SWITCHES; i ++) {
    serialData[a] = switchTypes[i];
    serialData[a + 1] = switchValues[i];
    serialData[a + 2] = switchShiftValues[i];
    a += 3;
  }

  serialData[a] = switchChannel;
  a ++;
  serialData[a] = shiftSwitch;
  a ++;
  serialData[a] = sendAllSwitch;

  // Generate an array that is a binary array of all the data
  bool* binArray = arrayToBits(serialData, UNPACKED_BYTE_DATA_LENGTH, true);
  // Split that array into bytes
  byte* byteArray = bitsToNumberArray(binArray, false, 7);

  return byteArray;
}

void unserialize(byte* serialData) {

  // Turn the byte array into a binary array
  bool* unserializedBinArray = arrayToBits(serialData, PACKED_BYTE_DATA_LENGTH, false, 7);
  // Unserialize that binary array into data of varying bit lengths
  byte* unserialized = bitsToNumberArray(unserializedBinArray, true);


  const byte SWITCHES_DATA_START = NUM_POTS * 2;
  const byte EXTRA_DATA_START = SWITCHES_DATA_START + NUM_SWITCHES * 3;

  // Pot channels and CCs
  unsigned potIndex = 0;
  for (unsigned i = 0; i < SWITCHES_DATA_START; i += 2) {
    potChannels[potIndex] = constrain(unserialized[i], 0, 15);
    potCCs[potIndex] = constrain(unserialized[i + 1], 0, 127);
    potIndex ++;
  }

  // Switch notes
  unsigned switchIndex = 0;
  for (unsigned i = SWITCHES_DATA_START; i < EXTRA_DATA_START; i += 3) {
    switchTypes[switchIndex] = constrain(unserialized[i], 0, 1);
    switchValues[switchIndex] = constrain(unserialized[i + 1], 0, 127);
    switchShiftValues[switchIndex] = constrain(unserialized[i + 2], 0, 127);
    switchIndex ++;
  }

  switchChannel = constrain(unserialized[EXTRA_DATA_START], 0, 15);
  shiftSwitch = constrain(unserialized[EXTRA_DATA_START + 1], 0, 12);
  sendAllSwitch = constrain(unserialized[EXTRA_DATA_START + 2], 0, 24);

}

void processSysexChunk(const byte* sysexData, uint16_t length, bool last) {

  if (incomingSysexLength + length <= PACKED_BYTE_DATA_LENGTH + STORE_HEADER_LENGTH ) {

    memcpy(incomingSysex + incomingSysexLength * sizeof(byte), sysexData, length);
    incomingSysexLength += length;

    if (last) {
      processSysex(incomingSysex, incomingSysexLength);
      incomingSysexLength = 0;
    }

  } else {
    Serial.println("Oversize sysex received");
    incomingSysexLength = 0;
  }

}

void processSysex(const byte* sysexData, uint16_t length) {

  // Format should be: SYSEX_START_CODE, MANUFACTURER_ID x3, MODEL_ID, PROTOCOL_VERSION, command, dataArray, SYSEX_END_CODE

  // Check length
  if (length > 7) {

    // Check for start and end
    if (sysexData[0] == SYSEX_START_CODE && sysexData[length - 1] == SYSEX_END_CODE) {

      // Check manufacturer, model
      if (sysexData[1] == MANUFACTURER_ID[0] && sysexData[2] == MANUFACTURER_ID[1] && sysexData[3] == MANUFACTURER_ID[2]
          && sysexData[4] == MODEL_ID) {

        // Check protocol
        if (sysexData[5] != PROTOCOL_VERSION) {
          Serial.println("Incompatible protocol");
          sendSysexProtocolVersion();

        } else {

          // Request
          if (sysexData[6] == REQUEST && length == REQUEST_LENGTH) {
            Serial.println("Sysex request");
            sendSysexConfig();

          // Store
          } else if (sysexData[6] == STORE && length == PACKED_BYTE_DATA_LENGTH + STORE_HEADER_LENGTH) {
            Serial.println("Sysex store");
            storeSysexConfig(sysexData);

          } else {
            Serial.println("Unknown sysex command");
          }
        }
      }
    }
  }
}

void sendSysexProtocolVersion() {
  usbMIDI.sendSysEx(RESPONSE_HEADER_LENGTH, SYSEX_RESPONSE_HEADER, false);
}

void sendSysexConfig() {

  byte sysexData[PACKED_BYTE_DATA_LENGTH + RESPONSE_HEADER_LENGTH];
  byte* configData = serialize();

  memcpy(sysexData, SYSEX_RESPONSE_HEADER, RESPONSE_HEADER_LENGTH * sizeof(byte));
  memcpy(sysexData + RESPONSE_HEADER_LENGTH * sizeof(byte), configData, PACKED_BYTE_DATA_LENGTH * sizeof(byte));

  usbMIDI.sendSysEx(RESPONSE_HEADER_LENGTH + PACKED_BYTE_DATA_LENGTH, sysexData, false);
}

void sendWriteFailed() {
  usbMIDI.sendSysEx(WRITE_FAILED_LENGTH, SYSEX_WRITE_FAILED, false);
}

void storeSysexConfig(const byte* sysexData) {

  byte trimmedData[PACKED_BYTE_DATA_LENGTH];
  memcpy(trimmedData, sysexData + STORE_HEADER_LENGTH * sizeof(byte) - 1, PACKED_BYTE_DATA_LENGTH * sizeof(byte));

  unserialize(trimmedData);

  if (!writeEeprom(trimmedData)) {
    sendWriteFailed();
  }
}

void loop() {

//  unsigned long startTime = micros();

  readPots();
  readSwitches();

  while (usbMIDI.read()) {
  }

  delay(2); // ms (~300 fps)

//  Serial.println(1000000 / (micros() - startTime));

}
