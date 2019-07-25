#!/bin/bash
echo
echo "***************************************"
echo "INSTALLING ..."
echo "***************************************"
echo

curl -sSL http://bit.ly/2ysbOFE | sudo bash -s 1.2.0 1.2.0 0.4.10

cd fabric-samples

export PATH=$(pwd)/bin:$PATH

cd basic-network

chmod +x generate.sh start.sh

