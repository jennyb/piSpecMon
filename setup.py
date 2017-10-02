""" A setuptools based setup module.

    See:
    https://packaging.python.org/en/latest/distributing.html
    https://github.com/pypa/sampleproject
"""
from setuptools import setup, find_packages
import subprocess
import os


with open('README.md') as f:
    long_description = f.read()

setup(
    name='spectrum',

    # Versions should comply with PEP440.  For a discussion on single-sourcing
    # the version across setup.py and the project code, see
    # https://packaging.python.org/en/latest/single_source_version.html
    version=subprocess.check_output(['git', 'describe', '--tags']).decode().replace('-', '_').strip(),

    description='piSpecMon python package',
    long_description=long_description,

    # The project's main homepage.
    url=subprocess.check_output(['git', 'config', '--get', 'remote.origin.url']),

    # Author details
    author='Tom Winch',
    author_email='tom.winch@ofcom.org.uk',

    # Choose your license
    license='GPL',

    # See https://pypi.python.org/pypi?%3Aaction=list_classifiers
    classifiers=[
        # How mature is this project? Common values are
        #   3 - Alpha
        #   4 - Beta
        #   5 - Production/Stable
        'Development Status :: 4 - Beta',

        # Indicate who your project is intended for
        #'Intended Audience :: Developers',
        'Intended Audience :: End Users/Desktop',

        # Pick your license as you wish (should match "license" above)
        'License :: OSI Approved :: GNU General Public License (GPL)',

        # Specify the Python versions you support here. In particular, ensure
        # that you indicate whether you support Python 2, Python 3 or both.
        'Programming Language :: Python :: 2.7'
    ],

    # What does your project relate to?
    keywords='spectrum sweep',

    # You can just specify the packages manually here if your project is
    # simple. Or you can use find_packages().
    packages=['spectrum'],

    # Alternatively, if you want to distribute just a my_module.py, uncomment
    # this:
    #   py_modules=["my_module"],

    # There are optimizations in Python eggs that allows it to read .py files
    # even from a compressed format (think of Java's JAR format), but since we
    # have data files ( HTML and CSS again ) we need to tell setuptools to turn
    # off this behavior with zip_safe=False
    zip_safe=False,

    # List run-time dependencies here.  These will be installed by pip when
    # your project is installed. For an analysis of "install_requires" vs pip's
    # requirements files see:
    # https://packaging.python.org/en/latest/requirements.html
    install_requires=['pyyaml', 'requests', 'pydub', 'flask', 'flask-login', 'python-slugify', 'pyzmq', 'ses-common'],

    # List additional groups of dependencies here (e.g. development
    # dependencies). You can install these using the following syntax,
    # for example:
    # $ pip install -e .[dev,test]
    #extras_require={
    #    'dev': ['check-manifest'],
    #    'test': ['coverage'],
    #},

    # If there are data files included in your packages that need to be
    # installed, specify them here.  If using Python 2.6 or less, then these
    # have to be included in MANIFEST.in as well.
    package_data={
        'spectrum': ['{0}/*'.format(dir_path[9:]) for dir_path, _, _ in os.walk('spectrum/static')],
    },

    # Although 'package_data' is the preferred approach, in some case you may
    # need to place data files outside of your packages. See:
    # http://docs.python.org/3.4/distutils/setupscript.html#installing-additional-files # noqa
    # In this case, 'data_file' will be installed into '<sys.prefix>/my_data'
    #data_files=[('my_data', ['data/data_file'])],

    # To provide executable scripts, use entry points in preference to the
    # "scripts" keyword. Entry points provide cross-platform support and allow
    # pip to create the appropriate form of executable for the target platform.
    entry_points={
        'console_scripts': [
            'psm-server=spectrum.main:server',
            'psm-audio=spectrum.main:audio',
            'psm-hamlib-worker=spectrum.main:hamlib_worker',
            'psm-sdr-worker=spectrum.main:sdr_worker',
            'psm-ams-worker=spectrum.main:ams_worker',
            'psm-rds-worker=spectrum.main:rds_worker',
            'psm-users=spectrum.main:users',
            'psm-power=spectrum.main:power',
            'psm-email=spectrum.main:email',
            'psm-wav2mp3=spectrum.main:wav2mp3',
            'psm-rdevice=spectrum.main:rdevice'
        ],
    },
)
