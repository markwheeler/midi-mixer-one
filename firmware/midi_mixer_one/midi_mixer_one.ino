// MIDI Mixer One
// v1.0.0
// Mark Eats / Mark Wheeler
// Uses snippets from https://github.com/dxinteractive/ResponsiveAnalogRead/


//// MIDI config ////

#define MIDI_CHANNEL 1

// Pot CCs
const int MIDI_CCS[] = {
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

// Switch note numbers
const int MIDI_NOTE_NUMS[] = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12};

// Define a key that sends all pot values (-1 to disable)
#define SEND_ALL_KEY 8

/////////////////////


// Pot params
#define POT_BITS                10 // 7-16 is valid
#define POT_NUM_READS           8 // 1-32 is reasonable
#define POT_SNAP_MULTIPLIER     0.1 // 0-1 lower values increase easing

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

const int MUX_PINS[] =          {14, 15, 16, 17, 18};
const int MUX_SIGNAL_PINS[] =   {23, 22, 21};
const int MUX_POTS_BY_CHANNEL[][NUM_MUX_CHANNELS] = {
  {1, 2, 3, 0, 4, 5, 7, 6},
  {11, 8, 9, 10, 14, 15, 13, 12},
  {17, 18, 19, 16, 23, 20, 22, 21},
  {24, 28, 29, 27, 31, 26, 30, 25},
  {33, 34, 39, 32, 38, 35, 37, 36},
};
#define MASTER_POT_PIN          19
const int SWITCH_PINS[] =       {3, 11, 7, 2, 6, 8, 1, 5, 9, 0, 4, 10};

const int POT_RES = pow(2, POT_BITS);

// Vars
float pot_values[NUM_POTS];
int pot_midi_values[NUM_POTS];
Bounce switches[NUM_SWITCHES];


void setup() {
  Serial.begin(38400);
  
  analogReadResolution(POT_BITS);
  analogReadAveraging(POT_NUM_READS);
  
  // Pots
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

float snapCurve(float x) {
  float y = 1.0 / (x + 1.0);
  y = (1.0 - y) * 2.0;
  if(y > 1.0) {
    return 1.0;
  }
  return y;
}

float smoothValue(float oldValue, int newValue) {
  unsigned int diff = abs(newValue - oldValue);
  float snap = snapCurve(diff * POT_SNAP_MULTIPLIER);
  return oldValue + (newValue - oldValue) * snap;
}

void loop() {
  
  unsigned long startTime = micros();

  // Pots
  
  for(int c = 0; c < NUM_MUX_CHANNELS; c ++) {

    // Set mux channel
    for(int s = 0; s < NUM_MUX_SIGNAL_PINS; s ++) {
      digitalWrite(MUX_SIGNAL_PINS[s], bitRead(c, s));
    }
    delayMicroseconds(5); // TODO tweak

    // Read from all muxes
    for(int m = 0; m < NUM_MUXES; m ++) {
      int pot = MUX_POTS_BY_CHANNEL[m][c];
      pot_values[pot] = smoothValue(pot_values[pot], analogRead(MUX_PINS[m]));
    }
  }

  // Read master pot
  pot_values[40] = smoothValue(pot_values[40], analogRead(MASTER_POT_PIN));

  // Check values
  for(int i = 0; i < NUM_POTS; i ++) {
    int new_midi_value = (int)pot_values[i] >> (POT_BITS - 7);
    if(new_midi_value != pot_midi_values[i]) {
//        Serial.print(i);
//        Serial.print(" changed to " );
//        Serial.println(new_midi_value);
      usbMIDI.sendControlChange(MIDI_CCS[i], new_midi_value, MIDI_CHANNEL);
      pot_midi_values[i] = new_midi_value;
    }
  }



//      if(pot == 39) {
//        Serial.print(rawValue);
//        Serial.print("\t");
//        Serial.println((int)pot_values[pot]);
//      }
      

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
  
  delay(1); // ms TODO experiment! Two refs have no delay, tehn's has 4ms

//  Serial.println(1000000 / (micros() - startTime));

}
