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

            self._app = Live.Application.get_application()
            self._song = self._app.get_document()

            self._buttons = []
            self._repeat_tasks = []
            for i in range(12):
                button = ButtonElement(True, MIDI_NOTE_TYPE, 0, i, name = i)
                button.add_value_listener(self._button_event, identify_sender = True)
                self._buttons.append(button)
                self._repeat_tasks.append(self._make_repeat_task(self._button_action, i))

            self.show_message('Mixer One is OK')

    def disconnect(self):
        ControlSurface.disconnect(self)
        for task in self._repeat_tasks:
            task.kill()
        for button in self._buttons:
            button.remove_value_listener(self._button_event)

    def _make_repeat_task(self, func, arg):
        task = self._tasks.add(Task.sequence(Task.wait(self.key_repeat_delay), Task.loop(Task.wait(self.key_repeat_rate), Task.run(lambda: func(arg)))))
        task.kill()
        return task

    def _start_repeat(self, id):
        if not self._repeat_tasks[id].is_running:
            self._repeat_tasks[id].restart()

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

    def _button_action(self, id):

        if id == 0:
            # Play
            self._song.start_playing()

        elif id == 1:
            # Stop
            self._song.stop_playing()

        elif id == 2:
            # Record
            self._song.record_mode = True

        elif id == 3:
            # Session/ Launch scene
            if self._app.view.focused_document_view == "Session":
                self._song.view.selected_scene.fire()

            # Arrangement/ Continue playing
            else:
                self._song.continue_playing()

        elif id == 4:
            # Session/ Stop all clips
            if self._app.view.focused_document_view == "Session":
                self._song.stop_all_clips()

            # Arrangement/ Prev cue point
            else:
                self._song.jump_to_prev_cue()
                self._start_repeat(id)

        elif id == 5:
            # Session/ Record into scene
            if self._app.view.focused_document_view == "Session":
                self._song.trigger_session_record()

            # Arrangement/ Next cue point
            else:
                self._song.jump_to_next_cue()
                self._start_repeat(id)


        elif id == 6:
            # Toggle detail view
            if self._app.view.is_view_visible("Detail/Clip"):
                self._app.view.show_view("Detail/DeviceChain")
            else:
                self._app.view.show_view("Detail/Clip")

        elif id == 7:
            # Up

            # Session/ Previous scene
            if self._app.view.focused_document_view == "Session":
                self._set_scene_relative(-1)

            # Arrangement/ Previous track
            else:
                self._set_track_relative(-1)

            self._start_repeat(id)

        # elif id == 8:
            # Reserved

        elif id == 9:
            # Left

            # Session/ Previous track
            if self._app.view.focused_document_view == "Session":
                self._set_track_relative(-1)

            # Arrangement/ Scrub reverse
            else:
                self._song.current_song_time = max(0, round((self._song.current_song_time - self.scrub_step) / self.scrub_quant) * self.scrub_quant)

            self._start_repeat(id)
        
        elif id == 10:
            # Down

            # Session/ Next scene
            if self._app.view.focused_document_view == "Session":
                self._set_scene_relative(1)

            # Arrangement/ Next track
            else:
                self._set_track_relative(1)

            self._start_repeat(id)

        elif id == 11:
            # Right

            # Session/ Next track
            if self._app.view.focused_document_view == "Session":
                self._set_track_relative(1)

            # Arrangement / Scrub forward
            else:
                self._song.current_song_time = ((self._song.current_song_time + self.scrub_step) // self.scrub_quant) * self.scrub_quant

            self._start_repeat(id)


    def _button_event(self, value, sender):
        if value == ON_VALUE:
            self._button_action(sender.name)
        else:
            if not self._repeat_tasks[sender.name].is_killed:
                self._repeat_tasks[sender.name].kill()
