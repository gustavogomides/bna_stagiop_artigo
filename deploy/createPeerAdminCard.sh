Usage() {
echo ""
echo "Usage: ./createPeerAdminCard.sh [-h host] [-n]"
echo ""
echo "Options:"
echo -e "\t-h or --host:\t\t(Optional) name of the host to specify in the connection profile"
echo -e "\t-n or --noimport:\t(Optional) don't import into card store"
echo ""
echo "Example: ./createPeerAdminCard.sh"
echo ""
exit 1
}
Parse_Arguments() {
while [ $# -gt 0 ]; do
case $1 in
--help)
HELPINFO=true
;;
--host | -h)
shift
HOST="$1"
;;
--noimport | -n)
NOIMPORT=true
;;
esac
shift
done
}
HOST=localhost
Parse_Arguments $@
if [ "${HELPINFO}" == "true" ]; then
Usage
fi
# Grab the current directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
if [ -z "${HL_COMPOSER_CLI}" ]; then
HL_COMPOSER_CLI=$(which composer)
fi
echo
# check that the composer command exists at a version >v0.16
COMPOSER_VERSION=$("${HL_COMPOSER_CLI}" --version 2>/dev/null)
COMPOSER_RC=$?
if [ $COMPOSER_RC -eq 0 ]; then
AWKRET=$(echo $COMPOSER_VERSION | awk -F. '{if ($2<19) print "1"; else print "0";}')
if [ $AWKRET -eq 1 ]; then
echo Cannot use $COMPOSER_VERSION version of composer with fabric 1.1, v0.19 or higher is required
exit 1
else
echo Using composer-cli at $COMPOSER_VERSION
fi
else
echo 'No version of composer-cli has been detected, you need to install composer-cli at v0.19 or higher'
exit 1
fi
cat << EOF > DevServer_connection.json
{
    "name": "hlfv1",
    "x-type": "hlfv1",
    "version": "1.0.0",
    "client": {
        "organization": "Org1",
        "connection": {
            "timeout": {
                "peer": {
                    "endorser": "300",
                    "eventHub": "300",
                    "eventReg": "300"
                },
                "orderer": "300"
            }
        }
    },
    "channels": {
        "mychannel": {
            "orderers": [
                "orderer.example.com"
            ],
            "peers": {
                "peer0.org1.example.com": {
                    "endorsingPeer": true,
                    "chaincodeQuery": true,
                    "eventSource": true
                },
                "peer1.org1.example.com": {
                    "endorsingPeer": true,
                    "chaincodeQuery": true,
                    "eventSource": true
                }
            }
        }
    },
    "organizations": {
        "Org1": {
            "mspid": "Org1MSP",
            "peers": [
                "peer0.org1.example.com",
                "peer1.org1.example.com"
            ],
            "certificateAuthorities": [
                "ca.example.com"
            ]
        }
    },
    "orderers": {
        "orderer.example.com": {
            "url": "grpc://35.224.86.27:7050",
            "grpcOptions": {
                "ssl-target-name-override": "orderer.example.com"
            },
            "tlsCACerts": {
                "pem": "-----BEGIN CERTIFICATE-----\nMIICIDCCAcegAwIBAgIQHyANjGRSwNkQQxevFd4MpjAKBggqhkjOPQQDAjBiMQsw\nCQYDVQQGEwJVUzETMBEGA1UECBMKQ2FsaWZvcm5pYTEWMBQGA1UEBxMNU2FuIEZy\nYW5jaXNjbzEPMA0GA1UEChMGaXRhLmJyMRUwEwYDVQQDEwx0bHNjYS5pdGEuYnIw\nHhcNMTkwNzI1MTM0OTUyWhcNMjkwNzIyMTM0OTUyWjBiMQswCQYDVQQGEwJVUzET\nMBEGA1UECBMKQ2FsaWZvcm5pYTEWMBQGA1UEBxMNU2FuIEZyYW5jaXNjbzEPMA0G\nA1UEChMGaXRhLmJyMRUwEwYDVQQDEwx0bHNjYS5pdGEuYnIwWTATBgcqhkjOPQIB\nBggqhkjOPQMBBwNCAASZ5FmLV83/NCpCIUkkGKmUjPGwc08MjLW5SCOANTMJQxzR\nWG/yUaCcXPe06ocV9Iuav3QwSkLladdwExVfR9aSo18wXTAOBgNVHQ8BAf8EBAMC\nAaYwDwYDVR0lBAgwBgYEVR0lADAPBgNVHRMBAf8EBTADAQH/MCkGA1UdDgQiBCDl\nqDwPRZz4jlxKUqslnwDemgZuxeT2X9XGSl6IVllinDAKBggqhkjOPQQDAgNHADBE\nAiAX+xmaUXT7w1c1SyQsYQgWCdFS8sBtdyQPFpAr+oetYwIgUmj7aty6claLbnoG\nxLLO9SpOoPpjTucmXtgcWjfT8vE=\n-----END CERTIFICATE-----\n"
            }
        }
    },
    "peers": {
        "peer0.org1.example.com": {
            "url": "grpc://35.224.86.27:7051",
            "eventUrl": "grpc://35.224.86.27:7053",
            "grpcOptions": {
                "ssl-target-name-override": "peer0.org1.example.com"
            },
            "tlsCACerts": {
                "pem": "-----BEGIN CERTIFICATE-----\nMIICNTCCAdugAwIBAgIQdonN15LvRMGxDXvV0e3i+zAKBggqhkjOPQQDAjBsMQsw\nCQYDVQQGEwJVUzETMBEGA1UECBMKQ2FsaWZvcm5pYTEWMBQGA1UEBxMNU2FuIEZy\nYW5jaXNjbzEUMBIGA1UEChMLb3JnMS5pdGEuYnIxGjAYBgNVBAMTEXRsc2NhLm9y\nZzEuaXRhLmJyMB4XDTE5MDcyNTEzNDk1MloXDTI5MDcyMjEzNDk1MlowbDELMAkG\nA1UEBhMCVVMxEzARBgNVBAgTCkNhbGlmb3JuaWExFjAUBgNVBAcTDVNhbiBGcmFu\nY2lzY28xFDASBgNVBAoTC29yZzEuaXRhLmJyMRowGAYDVQQDExF0bHNjYS5vcmcx\nLml0YS5icjBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABDOEkhNuuXnUcwuiumHP\nwY6jyE/OnmJdc7b8LgU7I7EjayigDTcIvMI438ZPKwssLYDEdmu01AbR2knVoe0K\n19ijXzBdMA4GA1UdDwEB/wQEAwIBpjAPBgNVHSUECDAGBgRVHSUAMA8GA1UdEwEB\n/wQFMAMBAf8wKQYDVR0OBCIEIJm8LmTqGuLBuKEYxd2HcxtX5LAfmHazeeIoN1kC\nVfXxMAoGCCqGSM49BAMCA0gAMEUCIQDo6Vc9j9a9A86MxKi/YB6pQ+7FDavPkRhR\nuFKmTTaYcgIgVvINflZZtSFwqzr8sk3EoiKrOuT5zWOKcUwZoAExa/A=\n-----END CERTIFICATE-----\n"
            }
        },
        "peer1.org1.example.com": {
            "url": "grpc://199.223.232.53:8051",
            "eventUrl": "grpc://199.223.232.53:8053",
            "grpcOptions": {
                "ssl-target-name-override": "peer1.org1.example.com"
            },
            "tlsCACerts": {
                "pem": "-----BEGIN CERTIFICATE-----\nMIICNTCCAdugAwIBAgIQdonN15LvRMGxDXvV0e3i+zAKBggqhkjOPQQDAjBsMQsw\nCQYDVQQGEwJVUzETMBEGA1UECBMKQ2FsaWZvcm5pYTEWMBQGA1UEBxMNU2FuIEZy\nYW5jaXNjbzEUMBIGA1UEChMLb3JnMS5pdGEuYnIxGjAYBgNVBAMTEXRsc2NhLm9y\nZzEuaXRhLmJyMB4XDTE5MDcyNTEzNDk1MloXDTI5MDcyMjEzNDk1MlowbDELMAkG\nA1UEBhMCVVMxEzARBgNVBAgTCkNhbGlmb3JuaWExFjAUBgNVBAcTDVNhbiBGcmFu\nY2lzY28xFDASBgNVBAoTC29yZzEuaXRhLmJyMRowGAYDVQQDExF0bHNjYS5vcmcx\nLml0YS5icjBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABDOEkhNuuXnUcwuiumHP\nwY6jyE/OnmJdc7b8LgU7I7EjayigDTcIvMI438ZPKwssLYDEdmu01AbR2knVoe0K\n19ijXzBdMA4GA1UdDwEB/wQEAwIBpjAPBgNVHSUECDAGBgRVHSUAMA8GA1UdEwEB\n/wQFMAMBAf8wKQYDVR0OBCIEIJm8LmTqGuLBuKEYxd2HcxtX5LAfmHazeeIoN1kC\nVfXxMAoGCCqGSM49BAMCA0gAMEUCIQDo6Vc9j9a9A86MxKi/YB6pQ+7FDavPkRhR\nuFKmTTaYcgIgVvINflZZtSFwqzr8sk3EoiKrOuT5zWOKcUwZoAExa/A=\n-----END CERTIFICATE-----\n"
            }
        }
    },
    "certificateAuthorities": {
        "ca.example.com": {
            "url": "http://35.224.86.27:7054",
            "caName": "ca.example.com",
            "httpOptions": {
                "verify": false
            }
        }
    }
}
EOF
PRIVATE_KEY="${DIR}"/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/ce4c6e65b97f6a1580fe53f8814865963f87f94cc36b0307606a300f352fdceb_sk
CERT="${DIR}"/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem
if [ "${NOIMPORT}" != "true" ]; then
CARDOUTPUT=/tmp/PeerAdmin@hlfv1.card
else
CARDOUTPUT=PeerAdmin@hlfv1.card
fi
"${HL_COMPOSER_CLI}" card create -p DevServer_connection.json -u PeerAdmin -c "${CERT}" -k "${PRIVATE_KEY}" -r PeerAdmin -r ChannelAdmin --file $CARDOUTPUT
if [ "${NOIMPORT}" != "true" ]; then
if "${HL_COMPOSER_CLI}" card list -c PeerAdmin@hlfv1 > /dev/null; then
"${HL_COMPOSER_CLI}" card delete -c PeerAdmin@hlfv1
fi
"${HL_COMPOSER_CLI}" card import --file /tmp/PeerAdmin@hlfv1.card 
"${HL_COMPOSER_CLI}" card list
echo "Hyperledger Composer PeerAdmin card has been imported, host of fabric specified as '${HOST}'"
rm /tmp/PeerAdmin@hlfv1.card
else
echo "Hyperledger Composer PeerAdmin card has been created, host of fabric specified as '${HOST}'"
fi