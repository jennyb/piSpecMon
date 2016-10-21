""" Process management module. Use this to provide a process which responds to signals and reads
    config and writes status using the file system, and writes data to the provided data source.
"""
import json
import os
import signal
import errno
import sys
from fs_datastore import FsDataStore
from config import FS_DATA_PATH, FS_DATA_SETTINGS, FS_DATA_SAMPLES
from common import log, local_path


class Process(object):
    """ Start the process with start(), after supplying the pid file, config file and
        status file names.
    """
    def __init__(self, pid_file, config_file, status_file):
        self.pid_file = local_path(pid_file)
        self.config_file = local_path(config_file)
        self.status_file = local_path(status_file)
        self._exit = False
        self._stop = False
        self._tidy = True
        self.config_id = None
        self.status = {}
        self.data_store = FsDataStore(FS_DATA_PATH, FS_DATA_SETTINGS, FS_DATA_SAMPLES)

    def read_pid(self):
        """ Read and verify the PID file.
        """
        if not os.path.isfile(self.pid_file):
            return None
        try:
            with open(self.pid_file) as f:
                pid = f.read().strip()
            pid = int(pid)
            os.kill(pid, 0)
            return pid
        except IOError:
            raise ProcessError("Can not open PID file: {0}".format(self.pid_file))
        except ValueError:
            raise ProcessError("Bad PID: {0}".format(pid))
        except OSError as e:
            raise ProcessError("Bad PID ({0}): {1}".format(errno.errorcode[e.errno], pid))

    # write status to the status file
    def _write_status(self):
        self.status['config_id'] = self.config_id
        log.debug("Writing status %s", json.dumps(self.status))
        tmp = self.status_file + '_tmp'
        with open(tmp, 'w') as f:
            f.write(json.dumps(self.status))
        os.rename(tmp, self.status_file)

    # define signal handler for given signal in order to exit cleanly
    def _set_signal(self, signame, stop=True, exit=False, tidy=True): # pylint: disable=redefined-builtin
        def _callback(*_):
            self._stop = stop
            self._exit = exit
            self._tidy = tidy
        signal.signal(getattr(signal, signame), _callback)

    # read the config file
    def _read_config(self):
        if not os.path.isfile(self.config_file):
            return None
        with open(self.config_file) as f:
            return f.read().strip()

    def start(self):
        """ Start the process, writing status yielded by iterator.
        """
        log.info("STARTING")
        try:
            while True:
                self.config_id = self._read_config()
                if self.config_id is not None:
                    log.debug("Read config id %s", self.config_id)
                    config = self.data_store.config(self.config_id).read()
                    log.debug("Running with config: %s", json.dumps(config.values))
                    self._stop = False
                    self.status.clear()
                    for _ in self.iterator(config):
                        self._write_status()
                        if self._stop:
                            break
                    if os.path.isfile(self.status_file):
                        os.remove(self.status_file)
                if self._tidy and os.path.isfile(self.config_file):
                    os.remove(self.config_file)
                if self._exit:
                    break
                signal.pause()
        finally:
            log.info("STOPPING")
            os.remove(self.pid_file)
            if os.path.isfile(self.status_file):
                os.remove(self.status_file)

    def stop(self):
        """ Stop the process.
        """
        self._stop = True

    def init(self):
        """ Initialise the process.
        """
        try:
            pid = self.read_pid()
            if pid is not None:
                log.error("Process already exists: %s", pid)
                sys.exit(1)
        except ProcessError:
            pass
        with open(self.pid_file, 'w') as f:
            f.write(str(os.getpid()))

        self._set_signal('SIGTERM', exit=True, tidy=False)
        self._set_signal('SIGINT', exit=True)
        self._set_signal('SIGHUP', exit=True)
        self._set_signal('SIGUSR1')

    def client(self):
        """ Return a client for the process.
        """
        return Client(self)

    def iterator(self, _): # pylint: disable=no-self-use
        """ Sub-classes should implement.
        """
        return
        yield # pylint: disable=unreachable


class Client(object):
    """ Client class used to read status and PID files from other processes.
    """
    def __init__(self, process):
        self.process = process
        self.pid = None
        self.error = None

    def read_pid(self):
        """ Read and return the process PID.
        """
        try:
            self.pid = self.process.read_pid()
            self.error = None
        except ProcessError as e:
            self.error = e.message
        if self.pid is None and self.error is None:
            self.error = "No {0} process".format(self.process.__class__.__name__.lower())
        return self.pid

    def status(self):
        """ Read and return the process status.
        """
        self.read_pid()

        if not os.path.isfile(self.process.status_file):
            status = {}
        else:
            stat = os.stat(self.process.status_file)
            with open(self.process.status_file, 'r') as f:
                status = json.loads(f.read())
            status['timestamp'] = int(1000 * stat.st_mtime)
        if self.error is not None:
            status['error'] = self.error
        return status

    def start(self, config_id):
        """ Tell the process to start processing the specified config id.
        """
        if self.read_pid() is not None:
            with open(self.process.config_file, 'w') as f:
                f.write(config_id)
            os.kill(self.pid, signal.SIGUSR1)

    def stop(self):
        """ Tell the process to stop processing.
        """
        if self.read_pid() is not None:
            os.kill(self.pid, signal.SIGUSR1)


class ProcessError(Exception):
    """ Class for process specific exceptions.
    """
    def __init__(self, message):
        super(ProcessError, self).__init__()
        self.message = message
