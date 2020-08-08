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

#define SEND_ALL_KEY 8

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
#define NUM_POTS                41
#define NUM_MUXES               5
#define NUM_MUX_SIGNAL_PINS     3
#define NUM_MUX_CHANNELS        8
#define NUM_SWITCHES            12

const int MUX_PINS[] = {14, 15, 16, 17, 18};
const int MUX_SIGNAL_PINS[] = {23, 22, 21};
const int MUX_POTS_BY_CHANNEL[][8] = {
  {1, 2, 3, 0, 4, 5, 7, 6},
  {11, 8, 9, 10, 14, 15, 13, 12},
  {17, 18, 19, 16, 23, 20, 22, 21},
  {24, 28, 29, 27, 31, 26, 30, 25},
  {33, 34, 39, 32, 38, 35, 37, 36},
};
const int MASTER_POT_PIN = 19;
const int SWITCH_PINS[] = {3, 11, 7, 2, 6, 8, 1, 5, 9, 0, 4, 10};

// Vars
ResponsiveAnalogRead pots[NUM_POTS];
Bounce switches[NUM_SWITCHES];
int pot_midi_values[NUM_POTS];


void setup() {
  Serial.begin(38400);

  // Pots
  for(int i = 0; i < NUM_POTS; i ++) {
    pots[i] = ResponsiveAnalogRead(0, true); // TODO consider options here
  }
  
  for(int i = 0; i < NUM_MUX_SIGNAL_PINS; i ++) {
    pinMode(MUX_SIGNAL_PINS[i], OUTPUT);
  }

  // Switches
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

void send_all_pot_values() {
  for(int i = 0; i < NUM_POTS; i ++) {
    usbMIDI.sendControlChange(MIDI_CCS[i], pot_midi_values[i], MIDI_CHANNEL);
  }
}

void loop() {

  // Pots
  
  for(int c = 0; c < NUM_MUX_CHANNELS; c ++) {

    // Set mux channel
    for(int s = 0; s < NUM_MUX_SIGNAL_PINS; s ++) {
      digitalWrite(MUX_SIGNAL_PINS[s], bitRead(c, s));
    }
    delayMicroseconds(50);

    // Read from all muxes
    for(int m = 0; m < NUM_MUXES; m ++) {
      int pot = MUX_POTS_BY_CHANNEL[m][c];
      pots[pot].update(analogRead(MUX_PINS[m]));
    }
  }

  // Read master pot
  pots[40].update(analogRead(MASTER_POT_PIN));
  
  // Check values
  for(int i = 0; i < NUM_POTS; i ++) {
    if(pots[i].hasChanged()) {

      int new_midi_value = pots[i].getValue() >> (POT_BIT_RES - 7);

      if(new_midi_value != pot_midi_values[i]) {
        if(i == 32) {
          Serial.print(i);
          Serial.print(" changed to " );
          Serial.println(new_midi_value);
          usbMIDI.sendControlChange(MIDI_CCS[i], new_midi_value, MIDI_CHANNEL);
        }
        pot_midi_values[i] = new_midi_value;
      }
    }
  }

  // Switches
  
  for(int i = 0; i < NUM_SWITCHES; i ++) {
    switches[i].update();

    // Send all pot values
    if(i == SEND_ALL_KEY) {
      if(switches[i].fell()) {
        send_all_pot_values();
      }
      
    // Send MIDI notes
    } else {
      if(switches[i].fell()) {
        usbMIDI.sendNoteOn(MIDI_NOTE_NUMS[i], 127, MIDI_CHANNEL);
      } else if (switches[i].rose()) {
        usbMIDI.sendNoteOff(MIDI_NOTE_NUMS[i], 0, MIDI_CHANNEL);
      }
    }
  }
  
//  LED?

//  if(switchDown) {
//    digitalWrite(LED_BUILTIN, LOW);
//  } else {
//    digitalWrite(LED_BUILTIN, HIGH);
//  }

  // Discard incoming MIDI
  while (usbMIDI.read()) {
  }
  
  delay(10); //TODO experiment!

}
