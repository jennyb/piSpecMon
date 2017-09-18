""" Package entry points to run processes and complete set-up.
"""
import time
import sys
import importlib

from spectrum.power import power_on, power_off
from spectrum.wav2mp3 import walk_convert
from spectrum.fs_datastore import FsDataStore
from spectrum.config import DATA_PATH, CONVERT_PERIOD, USERS_FILE, ROUNDS, SSMTP_CONF, \
                            DEFAULT_RIG_SETTINGS, DEFAULT_AUDIO_SETTINGS, DEFAULT_RDS_SETTINGS, \
                            DEFAULT_KEYSIGHT_SETTINGS, DEFAULT_HAMLIB_SETTINGS, VERSION_FILE, USER_TIMEOUT_SECS, PICO_PATH, \
                            EXPORT_DIRECTORY, LOG_PATH, PI_CONTROL_PATH, \
                            EVENT_PATH, EVENT_POLL_SECS, EVENT_OVERSEER_URL, \
                            EVENT_OVERSEER_KEY
from spectrum.audio import AudioServer
from spectrum.users import Users
from spectrum.queue import Queue
from spectrum.event import EventManager, EventClient
from spectrum.common import log, psm_name


# conditionally import workers, and define an entry point for each
def entry_point_fn(w_class):
    def entry_point():
        worker_process = w_class(FsDataStore(DATA_PATH))
        worker_process.init()
        worker_process.start()
    return entry_point

WORKER_MODULES = ['hamlib_worker', 'sdr_worker', 'ams_worker', 'rds_worker']
Workers = []
for name in WORKER_MODULES:
    try:
        Worker = importlib.import_module('spectrum.' + name).Worker
        Workers.append(Worker)
        setattr(sys.modules[__name__], name, entry_point_fn(Worker))
    except (ImportError, OSError) as e:
        log.warn("Not importing %s module: %s", name, e.message)


def init_application():
    """ Initiliase the web application object imported from spectrum.server.
    """
    from spectrum.server import application
    data_store = FsDataStore(DATA_PATH)
    clients = [Worker(data_store).client() for Worker in Workers]
    event_client = EventClient(Queue(EVENT_PATH))
    #FIXME tidy up DEFAULT_X_SETTINGS into one value; also PI_CONTROL_PATH and PICO_PATH probably just use the contants directly (and others?)
    application.initialise(data_store, Users(USERS_FILE, ROUNDS), clients,
                           DEFAULT_RIG_SETTINGS, DEFAULT_AUDIO_SETTINGS, DEFAULT_RDS_SETTINGS, DEFAULT_KEYSIGHT_SETTINGS,
                           DEFAULT_HAMLIB_SETTINGS, LOG_PATH, VERSION_FILE, USER_TIMEOUT_SECS,
                           EXPORT_DIRECTORY, PI_CONTROL_PATH, PICO_PATH, event_client)
    return application


def server():
    """ Run the Flask web server.
    """
    application = init_application()
    application.debug = True
    application.run('0.0.0.0', port=8080)


def audio():
    """ Run the audio server (publishes left/right channels to a ZMQ socket).
    """
    with AudioServer() as server:
        server.run()


def wav2mp3():
    """ Run the wav to mp3 conversion process.
    """
    fsds = FsDataStore(DATA_PATH)
    while True:
        walk_convert(fsds.samples_path)
        log.debug("Sleeping for %ds", CONVERT_PERIOD)
        time.sleep(CONVERT_PERIOD)


def users():
    """ Create an admin user based on command line arguments.
    """
    if len(sys.argv) != 3:
        print "Usage: {0} <username> <password>".format(sys.argv[0])
        sys.exit(1)

    user_manager = Users(USERS_FILE, ROUNDS)
    user_manager.create_user(sys.argv[1], sys.argv[2], {'role': 'admin'})
    print "User {0} created".format(sys.argv[1])


def power():
    """ Power on or off the radio.
    """
    if Hamlib is None:
        print "Hamlib is not installed - can not power on/off"
        sys.exit(1)
    if len(sys.argv) != 2 or sys.argv[1] not in ('on', 'off'):
        print "Usage: {0} [on|off]".format(sys.argv[0])
        sys.exit(1)

    if sys.argv[1] == 'on':
        power_on()

    if sys.argv[1] == 'off':
        power_off()


def email():
    """ Set the email password.
    """
    if len(sys.argv) != 2:
        print "Usage: {0} <email password>".format(sys.argv[0])
        sys.exit(1)

    with open(SSMTP_CONF) as f:
        if 'AuthPass=' in f.read():
            print "Password already set"
            sys.exit(1)

    with open(SSMTP_CONF, 'a') as f:
        f.write("AuthPass={0}\n".format(sys.argv[1]))


def event():
    """ Run the PSM Event Manager.
    """
    if EVENT_OVERSEER_URL.strip() == '':
        print "Not running: overseer URL missing"
        return
    if EVENT_OVERSEER_KEY.strip() == '':
        print "Not running: overseer key missing"
        return
    args = (Queue(EVENT_PATH), EVENT_POLL_SECS, EVENT_OVERSEER_URL, EVENT_OVERSEER_KEY)
    manager = EventManager(psm_name(), *args)
    manager.run()
