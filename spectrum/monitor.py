import Hamlib
import math
import inspect
import time

Hamlib.rig_set_debug(Hamlib.RIG_DEBUG_NONE)

def frange(min, max, step):
  digits = -int(round(math.log10(step)))
  N = round((max - min) / float(step))
  for n in xrange(int(N) + 1):
    yield round(min + n * step, digits)


def probe_rig_model(pathname, data_bits, stop_bits, rate):
  port = Hamlib.hamlib_port_t()
  port.type.rig = Hamlib.RIG_PORT_SERIAL
  port.parm.serial.rate = rate
  port.parm.serial.data_bits = data_bits
  port.parm.serial.stop_bits = stop_bits
  port.parm.serial.parity = Hamlib.RIG_PARITY_NONE
  port.parm.serial.handshake = Hamlib.RIG_HANDSHAKE_NONE
  port.pathname = pathname

  Hamlib.rig_load_all_backends()
  return Hamlib.rig_probe(port)


def get_capabilities():
  caps = { 'models': [], 'modes': [] }

  is_int = lambda n: isinstance(n, int)
  for model in [ n for x, n in inspect.getmembers(Hamlib, is_int) if x.startswith('RIG_MODEL_') ]:
    rig = Hamlib.Rig(model)
    if rig.this is None:
      continue

    caps['models'].append({
      'model': model,
      'manufacturer': rig.caps.mfg_name,
      'name': rig.caps.model_name,
      'version': rig.caps.version,
      'status': Hamlib.rig_strstatus(rig.caps.status),
      'modes': rig.state.mode_list
    })

  for n in xrange(int(math.log(Hamlib.RIG_MODE_TESTS_MAX - 1, 2))):
    mode = 2 ** n
    caps['modes'].append({ 'mode': mode, 'name': Hamlib.rig_strrmode(mode) })

  return caps


class RigError (Exception):

  def __init__(self, rig=None, call='?', tries=0):
    self.message = Hamlib.rigerror(rig.error_status) if rig is not None else "Model not found"
    self.call = call
    self.tries = tries

  def __str__(self):
    return "Hamlib rig error in %s: %s (tried %s time%s)" % (self.call, self.message, self.tries + 1, "" if self.tries == 1 else "s")


class Monitor:

  def __init__(self, model=1, stop_bits=None, write_delay=None, pathname=None, set_check=0, retries=0, interval=0):
    """ Arguments:
    
        model - hamlib model number, defaults to dummy implementation
        stop_bits - if not None, set stop bits on the rig port
        write_delay - if not None, set write delay on the rig port (ms)
        pathname - is not None, set path name on the rig port
        set_check - 0 = set frequency and hope, N = set/check N times before failing
        retries - retry after error or timeout this many times
        interval - if > 0, pause this many ms before retrying (doubles each retry)
    """
    self.rig = Hamlib.Rig(model)
    if self.rig.this is None:
      raise RigError()
    if stop_bits is not None:
      self.rig.state.rigport.parm.serial.stop_bits = stop_bits
    if write_delay is not None:
      self.rig.state.rigport.write_delay = write_delay
    if pathname is not None:
      self.rig.state.rigport.pathname = str(pathname)
    self.set_check = set_check
    self.retries = retries
    self.interval = interval

  def __enter__(self):
    self._check(self.rig.open)
    return self._scan

  def __exit__(self, *args):
    self.rig.close()

  # handle errors and retries for hamlib calls
  def _check(self, fn, *args):
    tries = 0
    while tries <= self.retries:
      v = fn(*args)
      if self.rig.error_status == Hamlib.RIG_OK:
        return v
      time.sleep(self.interval * 2 ** tries / 1000.0)
      tries += 1
    else:
      raise RigError(self.rig, fn.__name__, tries)

  # return strength, or None if the freq can't be set
  def _get_strength(self, freq):
    if self.set_check == 0:
      self._check(self.rig.set_freq, Hamlib.RIG_VFO_CURR, freq)
    else:
      for _ in xrange(self.set_check):
        self._check(self.rig.set_freq, Hamlib.RIG_VFO_CURR, freq)
        if freq == self._check(self.rig.get_freq, Hamlib.RIG_VFO_CURR):
          break
      else:
        return None
    return self._check(self.rig.get_strength, Hamlib.RIG_VFO_CURR)

  def _scan(self, freqs=[], range=None, mode=None):
    if mode is not None and mode != Hamlib.RIG_MODE_NONE:
      width = self._check(self.rig.passband_normal, mode)
      self._check(self.rig.set_mode, mode, width, Hamlib.RIG_VFO_CURR)
    for freq in freqs:
      yield freq, self._get_strength(freq)
    if range is not None:
      for freq in frange(*range):
        yield freq, self._get_strength(freq)


if __name__ == "__main__":
  import sys

  Hamlib.rig_set_debug(Hamlib.RIG_DEBUG_TRACE)

  if len(sys.argv) < 2:
    print "Model 358? 501?"
    sys.exit(1)

  model = int(sys.argv[1])
  with Monitor(model=model, pathname="/dev/ttyUSB0", stop_bits=1, write_delay=5) as scan:
    for x in scan(range=(88E6, 108E6, 0.1E6), mode=Hamlib.RIG_MODE_WFM):
      print x
