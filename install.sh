#!/bin/bash

# chdir to where the script lives
cd "${0%/*}"

# build UI
hash npm 2>/dev/null || ({
  curl -sL https://deb.nodesource.com/setup_4.x | sudo -E bash -
  sudo apt-get -y install nodejs
})
(cd spectrum/ui && npm install)
(cd spectrum/ui && ng build --base-href=.)

# build Python egg (includes javascript built above)
sudo apt-get install -y python-pip
sudo -H pip install -e .

# copy default config to /etc/psm.yml
sudo cp psm.yml /etc

# function returning config values, ultimately from the YML
function vbl {
  echo `python -c "import spectrum.config; print spectrum.config.$1"`
}

# create the version file
echo `git describe --tags` | sudo tee `vbl VERSION_FILE` >/dev/null

# create the log directory
LOG_PATH=`vbl LOG_PATH`
sudo mkdir -p $LOG_PATH
sudo chown $USER: $LOG_PATH

# create the data directory
DATA_PATH=`vbl DATA_PATH`
sudo mkdir -p $DATA_PATH
sudo chown $USER: $DATA_PATH

# create the event queue directory
EVENT_PATH=`vbl EVENT_PATH`
sudo mkdir -p $EVENT_PATH
sudo chown $USER: $EVENT_PATH

# install the SSMTP config
hash apt-get 2>/dev/null && (
  SSMTP_CONF=`vbl SSMTP_CONF`
  sudo apt-get install ssmtp mailutils
  sudo cp spectrum/bin/ssmtp.conf $SSMTP_CONF
  sudo chown $USER: $SSMTP_CONF
)

# install service scripts
sudo mkdir -p /var/lib/psm/bin
sudo cp spectrum/bin/*.sh /var/lib/psm/bin

# install the systemd service descriptors and restart services
hash systemctl 2>/dev/null && (
  cd spectrum/bin
  sudo cp psm.target /lib/systemd/system
  sudo cp psm.*.service /lib/systemd/system
  sudo systemctl daemon-reload
  sudo systemctl enable psm.target
  sudo systemctl enable psm.*.service
  sudo systemctl restart psm.*.service
)

# install the Web API server in Apache
hash a2ensite 2>/dev/null && (
  sudo mkdir -p /var/www/psm
  sudo cp spectrum/bin/wsgi.py /var/www/psm
  sudo apt-get install libapache2-mod-wsgi
  sudo cp spectrum/bin/psm.server.conf /etc/apache2/sites-available
  sudo a2dissite 000-default
  sudo a2ensite psm.server
  sudo service apache2 restart
)

# build the pi_control binary
PI_CONTROL_PATH=`vbl PI_CONTROL_PATH`
gcc -o spectrum/bin/pi_control spectrum/pi_control.c && (
  sudo cp spectrum/bin/pi_control $PI_CONTROL_PATH
  sudo chown root: $PI_CONTROL_PATH
  sudo chmod a+s $PI_CONTROL_PATH
)


# build the pi_control binary
PID_KILL_PATH=`vbl PID_KILL_PATH`
gcc -o spectrum/bin/pid_kill spectrum/pid_kill.c && (
  sudo cp spectrum/bin/pid_kill $PID_KILL_PATH
  sudo setcap cap_kill+ep $PID_KILL_PATH
)

# remind about post install steps
echo
echo "Now run psm-email to set the pispecmon email account password"
echo "and psm-users to set up the first admin account"
