# MIDI Mixer One
MIDI Mixer One is a mixer-style MIDI controller built around Teensy.

[Discussion thread on llllllll](https://llllllll.co/)

![Photo of finished controller](https://github.com/markwheeler/midi-mixer-one/blob/main/images/midi-mixer-one-01.jpg)

![Photo of construction](https://github.com/markwheeler/midi-mixer-one/blob/main/images/midi-mixer-one-02.jpg)

Licensed under CC BY-NC-SA 4.0 (non-commercial use only).

## Hardware
The [BOM](https://github.com/markwheeler/midi-mixer-one/blob/main/bom.csv) lists the parts required. Solder in the chips, caps, Teensy and switches first. Place the pots, run the USB cable and bolt on the front panel to get everything aligned before soldering the pots.

Included are Front Panel Designer files for a simple front and back panel.

Contact me if you're thinking about doing a PCB run, I may have boards.

## Firmware
MIDI paramaters are defined at the top for editing the channel, CCs, etc. By default, button 8 is dedicated to sending all CC values to make the receiver match the controller.

## Ableton Live Remote Script
This is fairly specific to my own workflow but included as a basis for customization. The script only maps the buttons, leaving the knobs to be assigned using standard MIDI mapping. [How to install remote scripts](https://help.ableton.com/hc/en-us/articles/209072009-Installing-third-party-remote-scripts).
