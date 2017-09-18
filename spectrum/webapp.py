""" Define a WebApplication that will be used by server.py to provide endpoints.
"""
import os
from spectrum.event import EVENT_INIT
from spectrum.common import log, psm_name
from spectrum.secure import SecureStaticFlask

class WebApplication(SecureStaticFlask): # pylint: disable=too-many-instance-attributes
    """ The curious looking two-step initialisation is so that the application instance can
        be created at import time for the decorators to work.

        None of the methods on this class form part of the module API. The web endpoints are
        the module API.
    """
    def __init__(self, name):
        super(WebApplication, self).__init__(name, 'ui')

    def initialise(self, data_store, users, clients, default_rig_settings, # pylint: disable=arguments-differ
                   default_audio_settings, default_rds_settings, default_keysight_settings, default_hamlib_settings, log_path,
                   version_file, user_timeout_secs, export_directory, pi_control_path, pico_path,
                   event_client):
        """ Finish initialising the application.
        """
        # pylint: disable=attribute-defined-outside-init
        self.data_store = data_store
        super(WebApplication, self).initialise(users, user_timeout_secs)
        #FIXME these need rationalising
        self.rig = self.data_store.settings('rig').read(default_rig_settings)
        self.audio = self.data_store.settings('audio').read(default_audio_settings)
        self.keysight = self.data_store.settings('keysight').read(default_keysight_settings)
        self.rds = self.data_store.settings('rds').read(default_rds_settings)
        self.hamlib = self.data_store.settings('hamlib').read(default_hamlib_settings)
        self.description = self.data_store.settings('description').read('')
        self.clients = clients
        self.log_path = log_path
        self.version_file = version_file
        self.export_directory = export_directory
        self.pi_control_path = pi_control_path
        self.pico_path = pico_path
        self.event_client = event_client
        self._init_ident()

    def _init_ident(self):
        # pylint: disable=attribute-defined-outside-init
        self.ident = {'name': psm_name()}
        with open(os.path.join(self.root_path, self.version_file)) as f:
            self.ident['version'] = f.read().strip()
        self.ident['description'] = self.description.values
        self.event_client.write(EVENT_INIT, self.ident)

    def set_ident(self, ident):
        """ Set identification information about the PSM unit.
        """
        if self.user_has_role(['admin', 'freq']) and 'description' in ident:
            self.ident['description'] = ident['description']
            self.description.write(ident['description'])
