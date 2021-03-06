""" Define Worker process, for scanning the spectrum using a Keysight sensor.
"""
import sys
from spectrum.process import Process
from spectrum.common import log, parse_config, now
from pyams import Sensor

class Worker(Process):
    """ Process implementation for spectrum scanning using a Keysight sensor.
    """
    def __init__(self, data_store):
        super(Worker, self).__init__(data_store, 'ams')

    def get_capabilities(self):
        return {'antenna': [{'value': 0, 'label': 'Antenna 1'}, {'value': 1, 'label': 'Antenna 2'}, {'value': 2, 'label': 'Test Signal'}, {'value': 3, 'label': 'Terminated'}],
                'preamp': [{'value': 0, 'label': 'Off'}, {'value': 1, 'label': 'On'}],
                'attenuation': [{'value': 0.0, 'label': 'Off'}, {'value': 10.0, 'label': '10dB'}, {'value': 20.0, 'label': '20dB'}],
                'window': [{'value': 0, 'label': 'Hann'}, {'value': 1, 'label': 'Gauss Top'}, {'value': 2, 'label': 'Flat Top'}, {'value': 3, 'label': 'Uniform'}, {'value': 4, 'label': 'Unknown'}]}

    def iterator(self, config, initial_count):
        """ Scan the spectrum, storing data through the config object, and yield status.
        """
        #FIXME the 'ams' parameter cold be replace by self.worker (or whatever) - do it automatically in the parent?
        frange = parse_config(config.values, 'ams')[0] #FIXME assumes only a range

        self.status.clear()
        yield

        values = config.values['ams'] #FIXME the 'ams' parameter cold be replace by self.worker (or whatever) - do it automatically in the parent?
        with Sensor(values['address'], values['port']) as sensor:
            debug = 'debug' in sys.argv

            # go half a channel either side of the range (hf is half channel span)
            hf = frange[2] * 0.5
            minF = frange[0] - hf
            maxF = frange[1] + hf

            for sweep_idx, df, amps in sensor.iter_sweep(minF, maxF, **values['scan']):
                # channelise the amplitudes at channel frequencies
                c_amps = []
                bf = minF + frange[2]
                max_amp = None
                for i in xrange(len(amps)):
                    f = minF + i * df
                    amp = int(amps[i])
                    max_amp = max(max_amp, amp)
                    if f > bf: # map [-120 to -95] to [0, 100]
                        c_amps.append(min(127, max(-128, max_amp))) #(max_amp + 120.0) * 4.0)))
                        bf += frange[2]
                        max_amp = None

                time_0 = now()
                self.status['sweep'] = {'timestamp': time_0}
                self.status['sweep']['sweep_n'] = initial_count + sweep_idx #FIXME this sweep_n mechanism must go into process.py
                freq_n = max(xrange(len(c_amps)), key=c_amps.__getitem__)
                self.status['sweep']['peaks'] = [{'freq_n': freq_n, 'strength': c_amps[freq_n]}]
                config.write_spectrum(self.prefix, time_0, c_amps)
                yield
