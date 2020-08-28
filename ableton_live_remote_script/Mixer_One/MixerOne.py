from __future__ import with_statement
import Live
from _Framework.ControlSurface import ControlSurface
from _Framework.ButtonElement import ButtonElement, ON_VALUE, OFF_VALUE
from _Framework.InputControlElement import MIDI_NOTE_TYPE, MIDI_CC_TYPE
from _Framework import Task

class MixerOne(ControlSurface):
    __module__ = __name__
    __doc__ = " MIDI Mixer One controller script "

    scrub_step = 4
    scrub_quant = 4
    key_repeat_delay = 0.25
    key_repeat_rate = 0.01
    
    def __init__(self, c_instance):
        ControlSurface.__init__(self, c_instance)
        with self.component_guard():
            self.__c_instance = c_instance

            self._up_repeat_task = self._make_repeat_task(self._up_button_action)
            self._down_repeat_task = self._make_repeat_task(self._down_button_action)
            self._left_repeat_task = self._make_repeat_task(self._left_button_action)
            self._right_repeat_task = self._make_repeat_task(self._right_button_action)
            
            self._app = Live.Application.get_application()
            self._song = self._app.get_document()

            self._buttons = []
            for i in range(12):
                button = ButtonElement(True, MIDI_NOTE_TYPE, 0, i, name = i)
                button.add_value_listener(self._button_event, identify_sender = True)
                self._buttons.append(button)

            self.show_message('Mixer One is OK')

    def disconnect(self):
        self._up_repeat_task.kill()
        self._down_repeat_task.kill()
        self._left_repeat_task.kill()
        self._right_repeat_task.kill()
        for button in self._buttons:
            button.remove_value_listener(self._button_event)

    def _make_repeat_task(self, func):
        task = self._tasks.add(Task.sequence(Task.wait(self.key_repeat_delay), Task.loop(Task.wait(self.key_repeat_rate), Task.run(func))))
        task.kill()
        return task

    def _set_track_relative(self, increment):
        all_tracks = []
        all_tracks.extend(self._song.visible_tracks)
        all_tracks.extend(self._song.return_tracks)
        all_tracks.append(self._song.master_track)
        
        for i, track in enumerate(all_tracks):
            if track == self._song.view.selected_track:
                select_index = max(0, min(i + increment, len(all_tracks) - 1))
                self._song.view.selected_track = all_tracks[select_index]
                break

    def _set_scene_relative(self, increment):
        for i, scene in enumerate(self._song.scenes):
            if scene == self._song.view.selected_scene:
                select_index = max(0, min(i + increment, len(self._song.scenes) - 1))
                self._song.view.selected_scene = self._song.scenes[select_index]
                break


    def _up_button_action(self):
        # Session/ Previous scene
        if self._app.view.focused_document_view == "Session":
            self._set_scene_relative(-1)

        # Arrangement/ Previous track
        else:
            self._set_track_relative(-1)

    def _down_button_action(self):
        # Session/ Next scene
        if self._app.view.focused_document_view == "Session":
            self._set_scene_relative(1)

        # Arrangement/ Next track
        else:
            self._set_track_relative(1)

    def _left_button_action(self):
        # Session/ Previous track
        if self._app.view.focused_document_view == "Session":
            self._set_track_relative(-1)

        # Arrangement/ Scrub reverse
        else:
            self._song.current_song_time = max(0, round((self._song.current_song_time - self.scrub_step) / self.scrub_quant) * self.scrub_quant)

    def _right_button_action(self):
        # Session/ Next track
        if self._app.view.focused_document_view == "Session":
            self._set_track_relative(1)

        # Arrangement / Scrub forward
        else:
            self._song.current_song_time = ((self._song.current_song_time + self.scrub_step) // self.scrub_quant) * self.scrub_quant


    def _button_event(self, value, sender):

            if sender.name == 0:
                if value == ON_VALUE:
                    # Play
                    self._song.start_playing()

            elif sender.name == 1:
                if value == ON_VALUE:
                    # Stop
                    self._song.stop_playing()

            elif sender.name == 2:
                if value == ON_VALUE:
                    # Record
                    self._song.record_mode = True

            elif sender.name == 3:
                if value == ON_VALUE:
                    # Session/ Launch scene
                    if self._app.view.focused_document_view == "Session":
                        self._song.view.selected_scene.fire()

                    # Arrangement/ Continue playing
                    else:
                        self._song.continue_playing()

            elif sender.name == 4:
                if value == ON_VALUE:
                    # Session/ Stop all clips
                    if self._app.view.focused_document_view == "Session":
                        self._song.stop_all_clips()

                    # Arrangement/ Prev cue point
                    else:
                        self._song.jump_to_prev_cue()

            elif sender.name == 5:
                if value == ON_VALUE:
                    # Session/ Record into scene
                    if self._app.view.focused_document_view == "Session":
                        self._song.trigger_session_record()

                    # Arrangement/ Next cue point
                    else:
                        self._song.jump_to_next_cue()

            elif sender.name == 6:
                if value == ON_VALUE:
                    # Toggle detail view
                    if self._app.view.is_view_visible("Detail/Clip"):
                        self._app.view.show_view("Detail/DeviceChain")
                    else:
                        self._app.view.show_view("Detail/Clip")

            elif sender.name == 7:
                # Up
                if value == ON_VALUE:
                    self._up_button_action()
                    self._up_repeat_task.restart()
                else:
                    self._up_repeat_task.kill()

            # elif sender.name == 8:
                # Reserved

            elif sender.name == 9:
                # Left
                if value == ON_VALUE:
                    self._left_button_action()
                    self._left_repeat_task.restart()
                else:
                    self._left_repeat_task.kill()

            elif sender.name == 10:
                # Down
                if value == ON_VALUE:
                    self._down_button_action()
                    self._down_repeat_task.restart()
                else:
                    self._down_repeat_task.kill()

            elif sender.name == 11:
                # Right
                if value == ON_VALUE:
                    self._right_button_action()
                    self._right_repeat_task.restart()
                else:
                    self._right_repeat_task.kill()
