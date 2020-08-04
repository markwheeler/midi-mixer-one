// MIDI Mixer One
// v1.0.0
// Mark Eats / Mark Wheeler


//// MIDI config ////

#define MIDI_CHANNEL 1

const int MIDI_CCS[] = { // For pots
  2, 3, 4, 5, 6,
  7, 8, 9, 10, 11,
  12, 13, 14, 15, 16,
  17, 18, 19, 20, 21,
  22, 23, 24, 25, 26,
  27, 28, 29, 30, 31,
  32, 33, 34, 35, 36,
  37, 38, 39, 40, 41,
  42
  };
  
const int MIDI_NOTE_NUMS[] = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12}; // For switches

/////////////////////


// Pots
#define POT_BIT_RES             10 // 7-16 is valid
#define POT_NUM_READS           32 // 32 works
#include <ResponsiveAnalogRead.h>

// Switches
#define BOUNCE_LOCK_OUT
#define SWITCH_INTERVAL         5 // ms
#include <Bounce2.h>

// Hardware
#define NUM_MUXES               5
#define NUM_MUX_SIGNAL_PINS     3
#define NUM_MUX_CHANNELS        8
#define NUM_SWITCHES            12

const int MUX_PINS[] = {14, 15, 16, 17, 18};
const int MUX_SIGNAL_PINS[] = {23, 22, 21};
const int MUX_POT_PINS[][8] = {
  {3, 0, 1, 2, 4, 5, 7, 6},
  {1, 2, 3, 0, 7, 6, 4, 5},
  {3, 0, 1, 2, 5, 7, 6, 4},
  {0, 7, 5, 3, 1, 2, 6, 4},
  {3, 0, 1, 5, 7, 6, 4, 2}
};
const int SWITCH_PINS[] = {3, 11, 7, 2, 6, 8, 1, 5, 9, 0, 4, 10};

// Vars
Bounce switches[NUM_SWITCHES];


void setup() {
  Serial.begin(38400);
  
  for(int i = 0; i < NUM_MUX_SIGNAL_PINS; i ++) {
    pinMode(MUX_SIGNAL_PINS[i], OUTPUT);
  }
  
  for(int i = 0; i < NUM_SWITCHES; i ++) {
    pinMode(SWITCH_PINS[i], INPUT_PULLUP);
    switches[i] = Bounce();
    switches[i].attach(SWITCH_PINS[i]);
    switches[i].interval(SWITCH_INTERVAL);
  }

  // LED
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);
}

int readMux(int mux, int pot) {
  
  for(int i = 0; i < NUM_MUX_SIGNAL_PINS; i ++) {
    digitalWrite(MUX_SIGNAL_PINS[i], bitRead(MUX_POT_PINS[mux][pot], i));
  }
  
  delayMicroseconds(50);
  return analogRead(MUX_PINS[mux]);
}

void loop() {

  // Pots

//  for(int i = 0; i < NUM_MUXES; i ++) {
//    Serial.print(i);
//    Serial.print(" ");
//    Serial.println(readMux(i, 0));
//  }
//  usbMIDI.sendControlChange(2, readMux(0, 0) >> (POT_BIT_RES - 7), MIDI_CHANNEL);

  // Switches
  for(int i = 0; i < NUM_SWITCHES; i ++) {
    switches[i].update();
    if(switches[i].fell()) {
//      Serial.print("Switch down ");
//      Serial.println(i);
      usbMIDI.sendNoteOn(MIDI_NOTE_NUMS[i], 127, MIDI_CHANNEL);
    } else if (switches[i].rose()) {
//      Serial.print("Switch up ");
//      Serial.println(i);
      usbMIDI.sendNoteOff(MIDI_NOTE_NUMS[i], 0, MIDI_CHANNEL);
    }
  }
  
//  LED?

//  if(switchDown) {
//    digitalWrite(LED_BUILTIN, LOW);
//  } else {
//    digitalWrite(LED_BUILTIN, HIGH);
//  }
  
  delay(10); //TODO experiment!

}
