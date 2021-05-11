import _Framework.Capabilities as caps
from .MixerOne import MixerOne

def get_capabilities():
    return {SUGGESTED_PORT_NAMES_KEY: [u'Mixer One - DAW Control'],
    PORTS_KEY: [inport(props=[NOTES_CC, SCRIPT, REMOTE]), outport(props=[NOTES_CC, SCRIPT, REMOTE])]}

def create_instance(c_instance):
    return MixerOne(c_instance)