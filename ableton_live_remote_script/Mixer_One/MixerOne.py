from __future__ import with_statement
import Live
from _Framework.ControlSurface import ControlSurface
from _Framework.TransportComponent import TransportComponent
from _Framework.ButtonElement import ButtonElement, ON_VALUE, OFF_VALUE
from _Framework.ButtonMatrixElement import ButtonMatrixElement
from _Framework.InputControlElement import MIDI_NOTE_TYPE, MIDI_CC_TYPE

class MixerOne(ControlSurface):
    __module__ = __name__
    __doc__ = " Mixer One controller script "
    
    def __init__(self, c_instance):
        ControlSurface.__init__(self, c_instance)
        with self.component_guard():
            self.__c_instance = c_instance
            
            self.app = Live.Application.get_application()
            self.song = self.app.get_document()

            self.buttons = []
            for i in range(12):
                button = ButtonElement(True, MIDI_NOTE_TYPE, 0, i, name = i)
                button.add_value_listener(self.button_event, identify_sender = True)
                self.buttons.append(button)

            self.show_message('Mixer One is OK')

    def disconnect(self):
        for button in self.buttons:
            button.remove_value_listener(self.button_event)

    def set_track_relative(self, increment):
        all_tracks = []
        for track in self.song.visible_tracks:
            all_tracks.append(track)
        for track in self.song.return_tracks:
            all_tracks.append(track)
        all_tracks.append(self.song.master_track)
        
        for i, track in enumerate(all_tracks):
            if track == self.song.view.selected_track:
                select_index = max(0, min(i + increment, len(all_tracks) - 1))
                self.song.view.selected_track = all_tracks[select_index]
                return

    def set_scene_relative(self, increment):
        for i, scene in enumerate(self.song.scenes):
            if scene == self.song.view.selected_scene:
                select_index = max(0, min(i + increment, len(self.song.scenes) - 1))
                self.song.view.selected_scene = self.song.scenes[select_index]
                return

    def button_event(self, value, sender):
        if value == ON_VALUE:

            if sender.name == 0:
                # Play
                self.song.start_playing()

            elif sender.name == 1:
                # Stop
                self.song.stop_playing()

            elif sender.name == 2:
                # Record
                self.song.record_mode = True

            elif sender.name == 3:
                # Session/ Launch scene
                if self.app.view.focused_document_view == "Session":
                    self.song.view.selected_scene.fire()

                # Arrangement/ Continue playing
                else:
                    self.song.continue_playing()

            elif sender.name == 4:
                # Session/ Stop all clips
                if self.app.view.focused_document_view == "Session":
                    self.song.stop_all_clips()

                # Arrangement/ 
                else:
                    self.log_message("Time testssssss", self.song.current_song_time)
                    self.log_message("To do")

            elif sender.name == 5:
                # Session/ Record into scene
                if self.app.view.focused_document_view == "Session":
                    self.song.trigger_session_record()

                # Arrangement/ 
                else:
                    self.log_message("To do")

            elif sender.name == 6:
                # Toggle detail view
                if self.app.view.is_view_visible("Detail/Clip"):
                    self.app.view.show_view("Detail/DeviceChain")
                else:
                    self.app.view.show_view("Detail/Clip")

            elif sender.name == 7:
                # Session/ Previous scene
                if self.app.view.focused_document_view == "Session":
                    self.set_scene_relative(-1)

                # Arrangement/ Previous track
                else:
                    self.set_track_relative(-1)

            # elif sender.name == 8:
                # Reserved

            elif sender.name == 9:
                # Session/ Previous track
                if self.app.view.focused_document_view == "Session":
                    self.set_track_relative(-1)

                # Arrangement/ Scrub reverse
                else:
                    self.song.jump_by(-16)

            elif sender.name == 10:
                # Session/ Next scene
                if self.app.view.focused_document_view == "Session":
                    self.set_scene_relative(1)

                # Arrangement/ Next track
                else:
                    self.set_track_relative(1)

            elif sender.name == 11:
                # Session/ Next track
                if self.app.view.focused_document_view == "Session":
                    self.set_track_relative(1)

                # Arrangement / Scrub forward
                else:
                    self.song.jump_by(16)
